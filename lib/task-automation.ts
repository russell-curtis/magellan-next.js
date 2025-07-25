// lib/task-automation.ts - Automated Task Generation Service

import { db } from '@/db/drizzle'
import { 
  tasks, 
  applications, 
  clients, 
  users, 
  crbiPrograms,
  applicationMilestones,
  TASK_TYPES,
  TASK_PRIORITIES 
} from '@/db/schema'
import { eq, and, count, sql } from 'drizzle-orm'

// ============================================================================
// TASK TEMPLATE INTERFACES
// ============================================================================

export interface ApplicationDetails {
  id: string
  clientId: string
  programId: string
  assignedAdvisorId: string | null
  status: string
  priority: string
  investmentAmount: string | null
  client: {
    id: string
    firstName: string
    lastName: string
    email: string | null
  }
  program: {
    id: string
    countryCode: string
    countryName: string
    programType: string
    programName: string
    minInvestment: string
    processingTimeMonths: number | null
  }
}

export interface TaskTemplate {
  title: string
  description: string
  taskType: typeof TASK_TYPES[number]
  priority: typeof TASK_PRIORITIES[number]
  estimatedHours?: number
  dueDays: number
  assignmentLogic: TaskAssignmentLogic
  dependencies?: string[] // Other task types that must be completed first
  requiredDocuments?: string[] // Document types that must be uploaded
  conditions?: TaskCondition[]
}

export interface TaskCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'in' | 'greater_than' | 'less_than'
  value: string | number | boolean | string[]
}

export type TaskAssignmentLogic = 
  | 'assigned_advisor'
  | 'senior_advisor' 
  | 'compliance_officer'
  | 'document_specialist'
  | 'paralegal'
  | 'round_robin'
  | 'least_busy'

// ============================================================================
// PROGRAM-SPECIFIC TASK TEMPLATES
// ============================================================================

export const TASK_TEMPLATES_BY_PROGRAM = {
  // Portugal Golden Visa Tasks
  portugal_residency: {
    draft_to_submitted: [
      {
        title: 'Initial Client Consultation - Portugal Golden Visa',
        description: 'Conduct comprehensive consultation to understand client goals, family situation, and investment preferences for Portugal Golden Visa program.',
        taskType: 'client_communication',
        priority: 'high',
        estimatedHours: 2,
        dueDays: 3,
        assignmentLogic: 'assigned_advisor'
      },
      {
        title: 'Document Collection Checklist - Portugal',
        description: 'Provide client with comprehensive document checklist and begin collection process for Portugal Golden Visa application.',
        taskType: 'document_review',
        priority: 'high',
        estimatedHours: 1,
        dueDays: 2,
        assignmentLogic: 'document_specialist',
        requiredDocuments: ['passport', 'bank_statements', 'criminal_record']
      },
      {
        title: 'Investment Options Analysis - Portugal',
        description: 'Analyze and present investment options suitable for client\'s budget and preferences (real estate, investment funds, business creation).',
        taskType: 'application_preparation',
        priority: 'medium',
        estimatedHours: 3,
        dueDays: 7,
        assignmentLogic: 'assigned_advisor'
      }
    ],
    submitted_to_under_review: [
      {
        title: 'Enhanced Due Diligence - Portugal Application',
        description: 'Conduct comprehensive background check and financial verification for Portugal Golden Visa application.',
        taskType: 'due_diligence',
        priority: 'high',
        estimatedHours: 4,
        dueDays: 10,
        assignmentLogic: 'compliance_officer'
      },
      {
        title: 'Document Translation and Notarization',
        description: 'Coordinate translation and notarization of all required documents for Portugal submission.',
        taskType: 'document_review',
        priority: 'high',
        estimatedHours: 2,
        dueDays: 7,
        assignmentLogic: 'paralegal'
      },
      {
        title: 'Investment Execution Support',
        description: 'Assist client with executing chosen investment option and obtaining required certificates.',
        taskType: 'application_preparation',
        priority: 'high',
        estimatedHours: 5,
        dueDays: 14,
        assignmentLogic: 'assigned_advisor'
      },
      {
        title: 'Application Compilation and Review',
        description: 'Compile complete application package and conduct final review before submission to Portuguese authorities.',
        taskType: 'application_preparation',
        priority: 'high',
        estimatedHours: 3,
        dueDays: 5,
        assignmentLogic: 'senior_advisor',
        dependencies: ['due_diligence', 'document_review']
      }
    ],
    under_review: [
      {
        title: 'Weekly Status Check - Portugal Authorities',
        description: 'Contact Portuguese immigration authorities for application status update.',
        taskType: 'follow_up',
        priority: 'medium',
        estimatedHours: 0.5,
        dueDays: 7,
        assignmentLogic: 'assigned_advisor'
      },
      {
        title: 'Client Progress Update',
        description: 'Provide client with detailed progress update and expected timeline.',
        taskType: 'client_communication',
        priority: 'medium',
        estimatedHours: 1,
        dueDays: 14,
        assignmentLogic: 'assigned_advisor'
      }
    ]
  },

  // Cyprus Investment Program Tasks
  cyprus_citizenship: {
    draft_to_submitted: [
      {
        title: 'Cyprus CIP Eligibility Assessment',
        description: 'Comprehensive eligibility assessment for Cyprus Investment Program including enhanced due diligence requirements.',
        taskType: 'compliance_check',
        priority: 'urgent',
        estimatedHours: 3,
        dueDays: 2,
        assignmentLogic: 'compliance_officer'
      },
      {
        title: 'Investment Structure Planning - Cyprus',
        description: 'Design optimal investment structure for Cyprus CIP requirements (€2M+ investment plus real estate).',
        taskType: 'application_preparation',
        priority: 'high',
        estimatedHours: 4,
        dueDays: 5,
        assignmentLogic: 'senior_advisor'
      },
      {
        title: 'Enhanced Document Collection - Cyprus',
        description: 'Collect enhanced documentation required for Cyprus CIP including financial source verification.',
        taskType: 'document_review',
        priority: 'high',
        estimatedHours: 2,
        dueDays: 7,
        assignmentLogic: 'document_specialist',
        requiredDocuments: ['passport', 'bank_statements', 'investment_proof', 'source_of_funds', 'medical_certificate']
      }
    ],
    submitted_to_under_review: [
      {
        title: 'Enhanced Due Diligence - Cyprus CIP',
        description: 'Conduct enhanced due diligence meeting Cyprus CIP requirements including international database checks.',
        taskType: 'due_diligence',
        priority: 'urgent',
        estimatedHours: 6,
        dueDays: 7,
        assignmentLogic: 'compliance_officer'
      },
      {
        title: 'Investment Execution - Cyprus CIP',
        description: 'Coordinate execution of Cyprus CIP investment requirements and obtain certificates.',
        taskType: 'application_preparation',
        priority: 'urgent',
        estimatedHours: 8,
        dueDays: 10,
        assignmentLogic: 'senior_advisor'
      }
    ]
  }
} as const

// ============================================================================
// TASK AUTOMATION SERVICE CLASS
// ============================================================================

export class TaskAutomationService {
  
  // Generate tasks based on application status change
  async generateTasksForStatusChange(
    applicationId: string,
    oldStatus: string,
    newStatus: string,
    firmId: string,
    userId?: string
  ): Promise<void> {
    try {
      // Get application details with program information
      const application = await this.getApplicationDetails(applicationId)
      
      if (!application) {
        console.error('Application not found for task generation:', applicationId)
        return
      }

      // Determine program template key
      const templateKey = this.getProgramTemplateKey(
        application.program.countryCode,
        application.program.programType
      )

      // Get task templates for the status transition
      const transitionKey = `${oldStatus}_to_${newStatus}` as keyof typeof TASK_TEMPLATES_BY_PROGRAM.portugal_residency
      const taskTemplates = TASK_TEMPLATES_BY_PROGRAM[templateKey]?.[transitionKey] || []

      // Generate tasks from templates
      for (const template of taskTemplates) {
        await this.createTaskFromTemplate(
          template,
          application,
          firmId,
          userId
        )
      }

      // Generate milestone-based tasks if entering under_review
      if (newStatus === 'under_review') {
        await this.generateMilestoneTasks(application, firmId, userId)
      }

      console.log(`Generated ${taskTemplates.length} tasks for ${applicationId} status change: ${oldStatus} -> ${newStatus}`)
    } catch (error) {
      console.error('Error generating tasks for status change:', error)
      throw error
    }
  }

  // Create task from template
  private async createTaskFromTemplate(
    template: TaskTemplate,
    application: ApplicationDetails,
    firmId: string,
    createdById?: string
  ): Promise<void> {
    // Check if task already exists to avoid duplicates
    const existingTask = await db.select({ id: tasks.id })
      .from(tasks)
      .where(and(
        eq(tasks.applicationId, application.id),
        eq(tasks.title, template.title),
        eq(tasks.status, 'pending')
      ))
      .limit(1)

    if (existingTask.length > 0) {
      console.log('Task already exists, skipping:', template.title)
      return
    }

    // Determine assignee
    const assignedToId = await this.determineTaskAssignee(
      template.assignmentLogic,
      application,
      firmId
    )

    // Calculate due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + template.dueDays)

    // Create the task
    await db.insert(tasks).values({
      firmId,
      clientId: application.clientId,
      applicationId: application.id,
      createdById: createdById || null,
      assignedToId,
      title: template.title,
      description: template.description,
      priority: template.priority,
      status: 'pending',
      taskType: template.taskType,
      dueDate
    })
  }

  // Get application details with relations
  private async getApplicationDetails(applicationId: string): Promise<ApplicationDetails | null> {
    const result = await db
      .select({
        id: applications.id,
        clientId: applications.clientId,
        programId: applications.programId,
        assignedAdvisorId: applications.assignedAdvisorId,
        status: applications.status,
        priority: applications.priority,
        investmentAmount: applications.investmentAmount,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryCode: crbiPrograms.countryCode,
          countryName: crbiPrograms.countryName,
          programType: crbiPrograms.programType,
          programName: crbiPrograms.programName,
          minInvestment: crbiPrograms.minInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    return result[0] || null
  }

  // Get program template key
  private getProgramTemplateKey(countryCode: string, programType: string): keyof typeof TASK_TEMPLATES_BY_PROGRAM {
    const key = `${countryCode.toLowerCase()}_${programType}` as keyof typeof TASK_TEMPLATES_BY_PROGRAM
    return TASK_TEMPLATES_BY_PROGRAM[key] ? key : 'portugal_residency' // fallback
  }

  // Determine task assignee based on assignment logic
  private async determineTaskAssignee(
    assignmentLogic: TaskAssignmentLogic,
    application: ApplicationDetails,
    firmId: string
  ): Promise<string | null> {
    switch (assignmentLogic) {
      case 'assigned_advisor':
        return application.assignedAdvisorId || null

      case 'senior_advisor':
        const seniorAdvisor = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.firmId, firmId),
            eq(users.role, 'admin'),
            eq(users.isActive, true)
          ))
          .limit(1)
        return seniorAdvisor[0]?.id || null

      case 'compliance_officer':
        // Find user with compliance role or senior advisor
        const complianceOfficer = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.firmId, firmId),
            sql`${users.role} IN ('admin', 'advisor')`,
            eq(users.isActive, true)
          ))
          .limit(1)
        return complianceOfficer[0]?.id || null

      case 'document_specialist':
      case 'paralegal':
        // Find any active advisor for now (can be enhanced with role-specific matching)
        const specialist = await db.select({ id: users.id })
          .from(users)
          .where(and(
            eq(users.firmId, firmId),
            eq(users.isActive, true)
          ))
          .limit(1)
        return specialist[0]?.id || null

      case 'round_robin':
        // Simple round-robin: get user with least assigned tasks
        const leastBusyUser = await db
          .select({ 
            id: users.id,
            taskCount: count(tasks.id)
          })
          .from(users)
          .leftJoin(tasks, and(
            eq(tasks.assignedToId, users.id),
            eq(tasks.status, 'pending')
          ))
          .where(and(
            eq(users.firmId, firmId),
            eq(users.isActive, true)
          ))
          .groupBy(users.id)
          .orderBy(count(tasks.id))
          .limit(1)
        return leastBusyUser[0]?.id || null

      case 'least_busy':
        return this.determineTaskAssignee('round_robin', application, firmId)

      default:
        return application.assignedAdvisorId || null
    }
  }

  // Generate milestone-based tasks
  private async generateMilestoneTasks(
    application: ApplicationDetails,
    firmId: string,
    userId?: string
  ): Promise<void> {
    // Get existing milestones for the application
    const milestones = await db.select()
      .from(applicationMilestones)
      .where(eq(applicationMilestones.applicationId, application.id))

    // If no milestones exist, create them based on program template
    if (milestones.length === 0) {
      await this.createMilestonesFromTemplate(application, firmId)
    }

    // Create tracking tasks for each milestone
    for (const milestone of milestones) {
      if (!milestone.completedAt) {
        await this.createMilestoneTrackingTask(milestone, application, firmId, userId)
      }
    }
  }

  // Create milestones from program template
  private async createMilestonesFromTemplate(
    application: ApplicationDetails,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    firmId: string
  ): Promise<void> {
    // In a real implementation, you'd extract milestone data from templates
    // For now, create default milestones
    
    const defaultMilestones = [
      { name: 'Initial Review Complete', orderIndex: 1, estimatedDays: 7 },
      { name: 'Due Diligence Complete', orderIndex: 2, estimatedDays: 14 },
      { name: 'Documents Prepared', orderIndex: 3, estimatedDays: 21 },
      { name: 'Application Submitted', orderIndex: 4, estimatedDays: 28 }
    ]

    for (const milestone of defaultMilestones) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + milestone.estimatedDays)

      await db.insert(applicationMilestones).values({
        applicationId: application.id,
        milestoneName: milestone.name,
        description: `${milestone.name} for ${application.program.programName}`,
        dueDate,
        orderIndex: milestone.orderIndex,
        status: 'pending'
      })
    }
  }

  // Create milestone tracking task
  private async createMilestoneTrackingTask(
    milestone: { id: string; milestoneName: string; description: string | null; dueDate: Date | null },
    application: ApplicationDetails,
    firmId: string,
    createdById?: string
  ): Promise<void> {
    const assignedToId = application.assignedAdvisorId

    await db.insert(tasks).values({
      firmId,
      clientId: application.clientId,
      applicationId: application.id,
      createdById: createdById || null,
      assignedToId,
      title: `Complete Milestone: ${milestone.milestoneName}`,
      description: `Ensure completion of milestone: ${milestone.milestoneName}. ${milestone.description || ''}`,
      priority: 'medium',
      status: 'pending',
      taskType: 'follow_up',
      dueDate: milestone.dueDate || new Date()
    })
  }
}

// ============================================================================
// SINGLETON SERVICE INSTANCE
// ============================================================================

export const taskAutomationService = new TaskAutomationService()

// Helper function to trigger task generation
export async function generateTasksForStatusChange(
  applicationId: string,
  oldStatus: string,
  newStatus: string,
  firmId: string,
  userId?: string
): Promise<void> {
  return taskAutomationService.generateTasksForStatusChange(
    applicationId,
    oldStatus,
    newStatus,
    firmId,
    userId
  )
}