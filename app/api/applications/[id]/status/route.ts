// app/api/applications/[id]/status/route.ts - Application Status Management with Workflow Automation

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, activityLogs, clients, users, crbiPrograms } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-utils'
import { triggerStatusChange } from '@/lib/workflow-engine'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['draft', 'started', 'submitted', 'ready_for_submission', 'submitted_to_government', 'under_review', 'approved', 'rejected', 'archived']),
  notes: z.string().optional(),
  triggerWorkflow: z.boolean().default(true)
})


// Update application status with workflow automation
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id: applicationId } = await params
    const body = await request.json()
    
    // Validate request body
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status: newStatus, notes, triggerWorkflow } = validation.data

    // Verify application exists and user has access
    const applicationCheck = await db
      .select({
        id: applications.id,
        firmId: applications.firmId,
        clientId: applications.clientId,
        programId: applications.programId,
        currentStatus: applications.status,
        applicationNumber: applications.applicationNumber,
        assignedAdvisorId: applications.assignedAdvisorId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName,
          programType: crbiPrograms.programType
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!applicationCheck.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const application = applicationCheck[0]

    // Check access permissions
    if (application.firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Prevent invalid status transitions
    const validTransitions = getValidStatusTransitions(application.currentStatus || 'draft')
    if (!validTransitions.includes(newStatus)) {
      return NextResponse.json(
        { 
          error: 'Invalid status transition',
          details: `Cannot change status from '${application.currentStatus}' to '${newStatus}'`,
          validTransitions
        },
        { status: 400 }
      )
    }

    const oldStatus = application.currentStatus

    // Update application status
    const updateData: {
      status: string
      updatedAt: Date
      submittedAt?: Date
      decidedAt?: Date
      internalNotes?: string
    } = {
      status: newStatus,
      updatedAt: new Date()
    }

    // Set timestamps based on status
    if (newStatus === 'submitted_to_government') {
      updateData.submittedAt = new Date()
    } else if (newStatus === 'approved' || newStatus === 'rejected') {
      updateData.decidedAt = new Date()
    }

    // Add notes to internal notes if provided
    if (notes) {
      updateData.internalNotes = `${new Date().toISOString()}: ${notes}`
    }

    await db.update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))

    // Log the status change
    await db.insert(activityLogs).values({
      firmId: user.firmId,
      userId: user.id,
      clientId: application.clientId,
      applicationId: applicationId,
      action: 'status_changed',
      entityType: 'application',
      entityId: applicationId,
      oldValues: { status: oldStatus },
      newValues: { 
        status: newStatus,
        changedBy: user.name,
        notes: notes || null,
        timestamp: new Date().toISOString()
      }
    })

    // Trigger workflow automation if enabled
    if (triggerWorkflow) {
      try {
        await triggerStatusChange(
          applicationId,
          oldStatus || 'draft',
          newStatus,
          user.firmId,
          user.id
        )
      } catch (workflowError) {
        console.error('Workflow automation error:', workflowError)
        // Don't fail the status update if workflow fails
      }
    }

    // Fetch updated application with relations
    const updatedApplication = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        priority: applications.priority,
        submittedAt: applications.submittedAt,
        decisionExpectedAt: applications.decisionExpectedAt,
        decidedAt: applications.decidedAt,
        investmentAmount: applications.investmentAmount,
        investmentType: applications.investmentType,
        notes: applications.notes,
        internalNotes: applications.internalNotes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName,
          programType: crbiPrograms.programType,
          minInvestment: crbiPrograms.minInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths
        },
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .leftJoin(users, eq(applications.assignedAdvisorId, users.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: `Application status updated to '${newStatus}' successfully`,
      application: updatedApplication[0],
      statusChange: {
        from: oldStatus,
        to: newStatus,
        changedBy: user.name,
        changedAt: new Date().toISOString(),
        workflowTriggered: triggerWorkflow
      }
    })
  } catch (error) {
    console.error('Error updating application status:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update application status' },
      { status: 500 }
    )
  }
}

// Get application status and available transitions
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id: applicationId } = await params

    // Fetch application with full details
    const applicationQuery = await db
      .select({
        id: applications.id,
        firmId: applications.firmId,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        priority: applications.priority,
        submittedAt: applications.submittedAt,
        decisionExpectedAt: applications.decisionExpectedAt,
        decidedAt: applications.decidedAt,
        investmentAmount: applications.investmentAmount,
        investmentType: applications.investmentType,
        notes: applications.notes,
        internalNotes: applications.internalNotes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName,
          programType: crbiPrograms.programType
        },
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .leftJoin(users, eq(applications.assignedAdvisorId, users.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!applicationQuery.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const application = applicationQuery[0]

    // Check access permissions
    if (application.firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const validTransitions = getValidStatusTransitions(application.status || 'draft')

    return NextResponse.json({
      application,
      statusInfo: {
        currentStatus: application.status,
        validTransitions,
        canEdit: user.role === 'admin' || application.assignedAdvisor?.id === user.id,
        statusHistory: [] // TODO: Implement status history from activity logs
      }
    })
  } catch (error) {
    console.error('Error fetching application status:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch application status' },
      { status: 500 }
    )
  }
}

// Helper function to get valid status transitions
function getValidStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    'draft': ['started'],
    'started': ['submitted', 'draft'],
    'submitted': ['ready_for_submission', 'started'],
    'ready_for_submission': ['submitted_to_government', 'submitted'],
    'submitted_to_government': ['under_review', 'ready_for_submission'],
    'under_review': ['approved', 'rejected', 'submitted_to_government'],
    'approved': [], // Final state
    'rejected': ['started'], // Can restart the process
    'archived': [] // Final state
  }

  return transitions[currentStatus] || []
}