// Government Status Tracking API
// Checks status with government portals and updates application accordingly

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users, activityLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { governmentSubmissionService } from '@/lib/services/government-submission'

// ============================================================================
// GET - Check status with government portal
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const { searchParams } = new URL(request.url)
    const governmentReferenceNumber = searchParams.get('ref')
    
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get application and verify access
    const application = await db
      .select({
        id: applications.id,
        status: applications.status,
        firmId: applications.firmId,
        assignedAdvisorId: applications.assignedAdvisorId,
        submittedAt: applications.submittedAt
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application[0]

    // Check permissions
    const hasPermission = 
      user[0].firmId === app.firmId && (
        user[0].role === 'admin' || 
        user[0].id === app.assignedAdvisorId
      )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Check if application was submitted to government
    if (!['submitted_to_government', 'under_review', 'approved', 'rejected'].includes(app.status)) {
      return NextResponse.json(
        { error: 'Application has not been submitted to government yet' },
        { status: 400 }
      )
    }

    // Check status with government (mock implementation)
    const governmentStatus = await governmentSubmissionService.checkSubmissionStatus(
      applicationId,
      governmentReferenceNumber || 'UNKNOWN'
    )

    // If status has changed from submitted_to_government to under_review, update it
    if (app.status === 'submitted_to_government' && governmentStatus.status === 'under_review') {
      await db
        .update(applications)
        .set({ 
          status: 'under_review',
          updatedAt: new Date()
        })
        .where(eq(applications.id, applicationId))

      // Log status change
      await db.insert(activityLogs).values({
        firmId: app.firmId,
        userId: session.session.userId,
        applicationId,
        action: 'status_updated_from_government',
        entityType: 'application',
        entityId: applicationId,
        oldValues: { status: app.status },
        newValues: { 
          status: 'under_review',
          governmentUpdate: governmentStatus,
          updatedAt: new Date().toISOString()
        }
      })
    }

    return NextResponse.json({
      applicationId,
      currentStatus: governmentStatus.status === 'under_review' ? 'under_review' : app.status,
      governmentStatus,
      submittedAt: app.submittedAt,
      daysSinceSubmission: app.submittedAt 
        ? Math.floor((Date.now() - new Date(app.submittedAt).getTime()) / (1000 * 60 * 60 * 24))
        : null
    })

  } catch (error) {
    console.error('Error checking government status:', error)
    return NextResponse.json(
      { error: 'Failed to check government status' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Manual status update from government communication
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const body = await request.json()
    const { 
      newStatus, 
      governmentNotes, 
      governmentReferenceNumber,
      documentRequests,
      estimatedCompletionDate 
    } = body
    
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can manually update government status
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required for manual status updates' },
        { status: 403 }
      )
    }

    // Get application and verify access
    const application = await db
      .select({
        id: applications.id,
        status: applications.status,
        firmId: applications.firmId
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application[0]

    // Check firm access
    if (user[0].firmId !== app.firmId) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate status transition
    const validStatuses = ['submitted_to_government', 'under_review', 'approved', 'rejected']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: 'Invalid status for government update' },
        { status: 400 }
      )
    }

    // Update application status
    const updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    }

    if (newStatus === 'approved' || newStatus === 'rejected') {
      updateData.decidedAt = new Date()
    }

    if (estimatedCompletionDate) {
      updateData.decisionExpectedAt = new Date(estimatedCompletionDate)
    }

    await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))

    // Log manual status update
    await db.insert(activityLogs).values({
      firmId: app.firmId,
      userId: session.session.userId,
      applicationId,
      action: 'manual_government_status_update',
      entityType: 'application',
      entityId: applicationId,
      oldValues: { status: app.status },
      newValues: {
        status: newStatus,
        governmentNotes,
        governmentReferenceNumber,
        documentRequests,
        estimatedCompletionDate,
        updatedBy: session.session.userId,
        updatedAt: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Government status updated successfully',
      applicationId,
      oldStatus: app.status,
      newStatus,
      updatedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error updating government status:', error)
    return NextResponse.json(
      { error: 'Failed to update government status' },
      { status: 500 }
    )
  }
}