// app/api/workflow/trigger/route.ts - Workflow Trigger API

import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { triggerWorkflow, WorkflowTrigger, WorkflowContext } from '@/lib/workflow-engine'
import { z } from 'zod'

const triggerWorkflowSchema = z.object({
  trigger: z.object({
    type: z.enum(['status_change', 'time_based', 'document_upload', 'milestone_completion']),
    entity: z.enum(['application', 'document', 'milestone', 'task']),
    eventType: z.string(),
    conditions: z.record(z.any()).optional()
  }),
  context: z.object({
    applicationId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
    programId: z.string().uuid().optional(),
    userId: z.string().optional(),
    firmId: z.string().uuid(),
    triggeredBy: z.enum(['system', 'user']),
    triggerData: z.record(z.any())
  })
})

// Trigger workflow execution
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    // Validate request body
    const validation = triggerWorkflowSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { trigger, context } = validation.data

    // Ensure the user belongs to the firm
    if (context.firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Execute workflow
    await triggerWorkflow(trigger as WorkflowTrigger, context as WorkflowContext)

    return NextResponse.json({
      success: true,
      message: 'Workflow triggered successfully',
      trigger: trigger.type,
      entity: trigger.entity,
      eventType: trigger.eventType
    })
  } catch (error) {
    console.error('Error triggering workflow:', error)
    return NextResponse.json(
      { error: 'Failed to trigger workflow' },
      { status: 500 }
    )
  }
}

// Get workflow rules and configuration
export async function GET(request: NextRequest) {
  try {
    await requireAuth() // Ensure user is authenticated
    const searchParams = request.nextUrl.searchParams
    const ruleType = searchParams.get('type')

    // Return available workflow rules and templates
    const response = {
      rules: [
        {
          id: 'auto-tasks-on-status-change',
          name: 'Auto-create tasks on application status change',
          description: 'Automatically create tasks when application status changes',
          isActive: true,
          triggerType: 'status_change'
        },
        {
          id: 'auto-review-on-document-upload',
          name: 'Auto-create review task on document upload',
          description: 'Create document review task when required documents are uploaded',
          isActive: true,
          triggerType: 'document_upload'
        },
        {
          id: 'auto-advance-on-milestone-completion',
          name: 'Auto-advance status on milestone completion',
          description: 'Automatically advance application status when all milestones are complete',
          isActive: true,
          triggerType: 'milestone_completion'
        }
      ],
      templates: [
        'portugal_residency',
        'cyprus_citizenship'
      ],
      supportedTriggers: [
        'status_change',
        'time_based',
        'document_upload',
        'milestone_completion'
      ],
      supportedActions: [
        'create_task',
        'update_status',
        'send_notification',
        'create_milestone',
        'assign_user'
      ]
    }

    if (ruleType) {
      response.rules = response.rules.filter(rule => rule.triggerType === ruleType)
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching workflow configuration:', error)
    return NextResponse.json(
      { error: 'Failed to fetch workflow configuration' },
      { status: 500 }
    )
  }
}