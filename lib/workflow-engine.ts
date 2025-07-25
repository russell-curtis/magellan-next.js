// lib/workflow-engine.ts - Core Workflow Automation Engine

import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationMilestones, 
  tasks, 
  activityLogs, 
  crbiPrograms,
  users
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateTasksForStatusChange } from './task-automation'

// ============================================================================
// WORKFLOW TYPES & INTERFACES
// ============================================================================

export interface WorkflowRule {
  id: string
  name: string
  description: string
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  isActive: boolean
  priority: number
}

export interface WorkflowTrigger {
  type: 'status_change' | 'time_based' | 'document_upload' | 'milestone_completion'
  entity: 'application' | 'document' | 'milestone' | 'task'
  eventType: string // e.g., 'status_changed', 'document_uploaded', 'due_date_approaching'
  conditions?: Record<string, string | number | boolean>
}

export interface WorkflowCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'not_in' | 'greater_than' | 'less_than' | 'contains'
  value: string | number | boolean | string[]
  logicalOperator?: 'AND' | 'OR'
}

export interface WorkflowAction {
  type: 'create_task' | 'update_status' | 'send_notification' | 'create_milestone' | 'assign_user'
  target: string
  parameters: Record<string, string | number | boolean>
  delayMinutes?: number
}

export interface WorkflowContext {
  applicationId?: string
  clientId?: string
  programId?: string
  userId?: string
  firmId: string
  triggeredBy: 'system' | 'user'
  triggerData: Record<string, string | number | boolean>
}

// ============================================================================
// WORKFLOW TEMPLATES BY PROGRAM TYPE
// ============================================================================

export const CRBI_WORKFLOW_TEMPLATES = {
  // Portugal Golden Visa Workflow
  portugal_residency: {
    name: 'Portugal Golden Visa Workflow',
    statusTransitions: {
      'draft': {
        nextStatus: 'submitted',
        requiredDocuments: ['passport', 'bank_statements', 'criminal_record'],
        autoTasks: [
          {
            type: 'document_review',
            title: 'Initial Document Review - Portugal Golden Visa',
            description: 'Review client documents for Portugal Golden Visa eligibility',
            priority: 'high' as const,
            assignmentLogic: 'senior_advisor'
          }
        ]
      },
      'submitted': {
        nextStatus: 'under_review',
        autoTasks: [
          {
            type: 'due_diligence',
            title: 'Due Diligence Check - Portugal',
            description: 'Comprehensive background check and financial verification',
            priority: 'high' as const,
            assignmentLogic: 'compliance_officer'
          },
          {
            type: 'application_preparation',
            title: 'Prepare Official Application Documents',
            description: 'Compile and translate all documents for Portugal submission',
            priority: 'medium' as const,
            assignmentLogic: 'document_specialist'
          }
        ],
        milestones: [
          { name: 'Initial Review Complete', orderIndex: 1, estimatedDays: 7 },
          { name: 'Due Diligence Complete', orderIndex: 2, estimatedDays: 14 },
          { name: 'Application Submitted to Portugal', orderIndex: 3, estimatedDays: 21 }
        ]
      },
      'under_review': {
        nextStatus: 'approved',
        autoTasks: [
          {
            type: 'follow_up',
            title: 'Government Review Status Check',
            description: 'Weekly check on application status with Portuguese authorities',
            priority: 'medium' as const,
            assignmentLogic: 'assigned_advisor',
            recurrence: 'weekly'
          }
        ]
      }
    }
  },

  // Cyprus Investment Program
  cyprus_citizenship: {
    name: 'Cyprus Investment Program Workflow',
    statusTransitions: {
      'draft': {
        nextStatus: 'submitted',
        requiredDocuments: ['passport', 'bank_statements', 'investment_proof', 'medical_certificate'],
        autoTasks: [
          {
            type: 'compliance_check',
            title: 'Enhanced Due Diligence - Cyprus CIP',
            description: 'Comprehensive compliance check for Cyprus Investment Program',
            priority: 'urgent' as const,
            assignmentLogic: 'compliance_officer'
          }
        ]
      },
      'submitted': {
        nextStatus: 'under_review',
        autoTasks: [
          {
            type: 'application_preparation',
            title: 'Cyprus Government Application Preparation',
            description: 'Prepare official Cyprus Investment Program application',
            priority: 'high' as const,
            assignmentLogic: 'senior_advisor'
          }
        ],
        milestones: [
          { name: 'Investment Verification Complete', orderIndex: 1, estimatedDays: 10 },
          { name: 'Legal Documentation Complete', orderIndex: 2, estimatedDays: 20 },
          { name: 'Government Submission Complete', orderIndex: 3, estimatedDays: 30 }
        ]
      }
    }
  }
}

// ============================================================================
// CORE WORKFLOW ENGINE CLASS
// ============================================================================

export class WorkflowEngine {
  private rules: WorkflowRule[] = []
  
  constructor() {
    this.loadDefaultRules()
  }

  // Load default workflow rules from templates
  private loadDefaultRules(): void {
    this.rules = [
      // Application Status Change Rules
      {
        id: 'auto-tasks-on-status-change',
        name: 'Auto-create tasks on application status change',
        description: 'Automatically create tasks when application status changes',
        trigger: {
          type: 'status_change',
          entity: 'application',
          eventType: 'status_changed'
        },
        conditions: [],
        actions: [{
          type: 'create_task',
          target: 'application',
          parameters: { useTemplate: true }
        }],
        isActive: true,
        priority: 1
      },
      
      // Document Upload Rules
      {
        id: 'auto-review-on-document-upload',
        name: 'Auto-create review task on document upload',
        description: 'Create document review task when required documents are uploaded',
        trigger: {
          type: 'document_upload',
          entity: 'document',
          eventType: 'document_uploaded'
        },
        conditions: [{
          field: 'documentType',
          operator: 'in',
          value: ['passport', 'bank_statements', 'criminal_record', 'investment_proof']
        }],
        actions: [{
          type: 'create_task',
          target: 'application',
          parameters: {
            taskType: 'document_review',
            title: 'Review uploaded document',
            priority: 'high'
          }
        }],
        isActive: true,
        priority: 2
      },

      // Milestone Completion Rules
      {
        id: 'auto-advance-on-milestone-completion',
        name: 'Auto-advance status on milestone completion',
        description: 'Automatically advance application status when all milestones are complete',
        trigger: {
          type: 'milestone_completion',
          entity: 'milestone',
          eventType: 'all_milestones_complete'
        },
        conditions: [],
        actions: [{
          type: 'update_status',
          target: 'application',
          parameters: { advanceToNextStatus: true }
        }],
        isActive: true,
        priority: 3
      }
    ]
  }

  // Main workflow execution method
  async executeWorkflow(
    trigger: WorkflowTrigger, 
    context: WorkflowContext
  ): Promise<void> {
    try {
      // Find matching rules for the trigger
      const matchingRules = this.rules.filter(rule => 
        rule.isActive && 
        rule.trigger.type === trigger.type &&
        rule.trigger.entity === trigger.entity &&
        rule.trigger.eventType === trigger.eventType
      )

      // Execute rules in priority order
      for (const rule of matchingRules.sort((a, b) => a.priority - b.priority)) {
        if (await this.evaluateConditions(rule.conditions, context)) {
          await this.executeActions(rule.actions, context)
        }
      }

      // Log workflow execution
      await this.logWorkflowExecution(trigger, context, matchingRules.length)
    } catch (error) {
      console.error('Workflow execution error:', error)
      throw error
    }
  }

  // Evaluate workflow conditions
  private async evaluateConditions(
    conditions: WorkflowCondition[], 
    context: WorkflowContext
  ): Promise<boolean> {
    if (conditions.length === 0) return true

    // For now, implement simple AND logic
    // TODO: Implement complex logical operators
    for (const condition of conditions) {
      const result = await this.evaluateSingleCondition(condition, context)
      if (!result) return false
    }
    
    return true
  }

  // Evaluate a single condition
  private async evaluateSingleCondition(
    condition: WorkflowCondition,
    context: WorkflowContext
  ): Promise<boolean> {
    // Get the field value from context or database
    const fieldValue = await this.getFieldValue(condition.field, context)
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value
      case 'not_equals':
        return fieldValue !== condition.value
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue)
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue)
      case 'contains':
        return String(fieldValue).includes(String(condition.value))
      default:
        return false
    }
  }

  // Get field value for condition evaluation
  private async getFieldValue(field: string, context: WorkflowContext): Promise<string | number | boolean | null> {
    // Extract field value from context or query database
    if (context.triggerData[field] !== undefined) {
      return context.triggerData[field]
    }

    // Query database for field value
    if (context.applicationId && field.startsWith('application.')) {
      const app = await db.select().from(applications)
        .where(eq(applications.id, context.applicationId))
        .limit(1)
      
      if (app[0]) {
        const fieldName = field.replace('application.', '') as keyof typeof app[0]
        return app[0][fieldName] as string | number | boolean | null
      }
    }

    return null
  }

  // Execute workflow actions
  private async executeActions(
    actions: WorkflowAction[], 
    context: WorkflowContext
  ): Promise<void> {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'create_task':
            await this.createTask(action, context)
            break
          case 'update_status':
            await this.updateStatus(action, context)
            break
          case 'send_notification':
            await this.sendNotification(action)
            break
          case 'create_milestone':
            await this.createMilestone(action, context)
            break
          case 'assign_user':
            await this.assignUser(action)
            break
        }
      } catch (error) {
        console.error(`Error executing action ${action.type}:`, error)
        // Continue with other actions even if one fails
      }
    }
  }

  // Create automated task using advanced task automation service
  private async createTask(action: WorkflowAction, context: WorkflowContext): Promise<void> {
    if (!context.applicationId) return

    // If using template-based task generation, delegate to task automation service
    if (action.parameters.useTemplate) {
      const { oldStatus, newStatus } = context.triggerData
      if (oldStatus && newStatus) {
        await generateTasksForStatusChange(
          context.applicationId,
          oldStatus,
          newStatus,
          context.firmId,
          context.userId
        )
        return
      }
    }

    // Fallback to simple task creation for non-template tasks
    const application = await db.select({
      id: applications.id,
      clientId: applications.clientId,
      programId: applications.programId,
      assignedAdvisorId: applications.assignedAdvisorId,
      status: applications.status
    }).from(applications)
    .where(eq(applications.id, context.applicationId))
    .limit(1)

    if (!application[0]) return

    const app = application[0]

    // Determine assignee
    const assignedToId = await this.determineTaskAssignee(
      action.parameters.assignmentLogic || 'assigned_advisor',
      context
    )

    // Create the task
    await db.insert(tasks).values({
      firmId: context.firmId,
      clientId: app.clientId,
      applicationId: context.applicationId,
      createdById: context.userId || null,
      assignedToId,
      title: action.parameters.title || 'Automated Task',
      description: action.parameters.description || 'Task created by workflow automation',
      priority: action.parameters.priority || 'medium',
      status: 'pending',
      taskType: action.parameters.taskType || 'other',
      dueDate: action.parameters.dueDate ? new Date(action.parameters.dueDate) : this.calculateDueDate(action.parameters.dueDays || 7)
    })
  }

  // Generate task from workflow template
  private async generateTaskFromTemplate(
    currentStatus: string, 
    programId: string
  ): Promise<Record<string, string | number | boolean>> {
    // Get program details to determine template
    const program = await db.select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, programId))
      .limit(1)

    if (!program[0]) return {}

    const templateKey = `${program[0].countryCode.toLowerCase()}_${program[0].programType}`
    const template = CRBI_WORKFLOW_TEMPLATES[templateKey as keyof typeof CRBI_WORKFLOW_TEMPLATES]

    if (!template || !template.statusTransitions[currentStatus as keyof typeof template.statusTransitions]) {
      return {}
    }

    const statusConfig = template.statusTransitions[currentStatus as keyof typeof template.statusTransitions]
    const autoTasks = statusConfig.autoTasks || []

    // Return the first auto task (in a real implementation, you might create multiple tasks)
    return autoTasks[0] || {}
  }

  // Determine task assignee based on assignment logic
  private async determineTaskAssignee(
    assignmentLogic: string, 
    context: WorkflowContext
  ): Promise<string | null> {
    switch (assignmentLogic) {
      case 'assigned_advisor':
        if (context.applicationId) {
          const app = await db.select({ assignedAdvisorId: applications.assignedAdvisorId })
            .from(applications)
            .where(eq(applications.id, context.applicationId))
            .limit(1)
          return app[0]?.assignedAdvisorId || null
        }
        break
      
      case 'senior_advisor':
        // Find senior advisor in the firm
        const seniorAdvisor = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.firmId, context.firmId),
            eq(users.role, 'admin'),
            eq(users.isActive, true)
          ))
          .limit(1)
        return seniorAdvisor[0]?.id || null
      
      default:
        return context.userId || null
    }
    
    return null
  }

  // Update application status
  private async updateStatus(action: WorkflowAction, context: WorkflowContext): Promise<void> {
    if (!context.applicationId) return

    const newStatus = action.parameters.status || 
      (action.parameters.advanceToNextStatus ? await this.getNextStatus(context.applicationId) : null)

    if (!newStatus) return

    await db.update(applications)
      .set({ 
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(applications.id, context.applicationId))
  }

  // Get next status in workflow
  private async getNextStatus(applicationId: string): Promise<string | null> {
    const app = await db.select({ status: applications.status })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!app[0]) return null

    const statusFlow = ['draft', 'submitted', 'under_review', 'approved']
    const currentIndex = statusFlow.indexOf(app[0].status)
    
    return currentIndex >= 0 && currentIndex < statusFlow.length - 1 
      ? statusFlow[currentIndex + 1] 
      : null
  }

  // Send notification (placeholder)
  private async sendNotification(action: WorkflowAction): Promise<void> {
    // TODO: Implement notification sending
    console.log('Sending notification:', action.parameters)
  }

  // Create milestone (placeholder)
  private async createMilestone(action: WorkflowAction, context: WorkflowContext): Promise<void> {
    if (!context.applicationId) return

    await db.insert(applicationMilestones).values({
      applicationId: context.applicationId,
      milestoneName: String(action.parameters.name || 'New Milestone'),
      description: String(action.parameters.description || ''),
      dueDate: action.parameters.dueDate ? new Date(String(action.parameters.dueDate)) : null,
      orderIndex: Number(action.parameters.orderIndex) || 1
    })
  }

  // Assign user (placeholder)
  private async assignUser(action: WorkflowAction): Promise<void> {
    // TODO: Implement user assignment logic
    console.log('Assigning user:', action.parameters)
  }

  // Calculate due date
  private calculateDueDate(days: number): Date {
    const date = new Date()
    date.setDate(date.getDate() + days)
    return date
  }

  // Log workflow execution
  private async logWorkflowExecution(
    trigger: WorkflowTrigger,
    context: WorkflowContext,
    rulesExecuted: number
  ): Promise<void> {
    await db.insert(activityLogs).values({
      firmId: context.firmId,
      userId: context.userId || null,
      clientId: context.clientId || null,
      applicationId: context.applicationId || null,
      action: 'workflow_executed',
      entityType: 'workflow',
      entityId: context.applicationId || context.clientId || 'system',
      newValues: {
        trigger: trigger,
        rulesExecuted,
        executedAt: new Date().toISOString()
      }
    })
  }
}

// ============================================================================
// WORKFLOW TRIGGER HELPERS
// ============================================================================

// Singleton workflow engine instance
export const workflowEngine = new WorkflowEngine()

// Helper function to trigger workflows
export async function triggerWorkflow(
  trigger: WorkflowTrigger,
  context: WorkflowContext
): Promise<void> {
  return workflowEngine.executeWorkflow(trigger, context)
}

// Status change trigger
export async function triggerStatusChange(
  applicationId: string,
  oldStatus: string,
  newStatus: string,
  firmId: string,
  userId?: string
): Promise<void> {
  const context: WorkflowContext = {
    applicationId,
    firmId,
    triggeredBy: userId ? 'user' : 'system',
    userId,
    triggerData: { oldStatus, newStatus }
  }

  await triggerWorkflow({
    type: 'status_change',
    entity: 'application',
    eventType: 'status_changed'
  }, context)
}

// Document upload trigger
export async function triggerDocumentUpload(
  documentId: string,
  documentType: string,
  applicationId: string,
  firmId: string,
  userId?: string
): Promise<void> {
  const context: WorkflowContext = {
    applicationId,
    firmId,
    triggeredBy: userId ? 'user' : 'system',
    userId,
    triggerData: { documentId, documentType }
  }

  await triggerWorkflow({
    type: 'document_upload',
    entity: 'document',
    eventType: 'document_uploaded'
  }, context)
}