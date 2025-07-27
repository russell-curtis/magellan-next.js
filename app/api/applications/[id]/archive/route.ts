import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, activityLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-utils'

// Archive/Unarchive application
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAuth()
    const { id: applicationId } = await params
    const body = await request.json()
    const { archived, notes } = body

    // Verify application exists and user has access
    const applicationCheck = await db
      .select({
        id: applications.id,
        firmId: applications.firmId,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        assignedAdvisorId: applications.assignedAdvisorId
      })
      .from(applications)
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

    // Check if user can archive/unarchive
    const canArchive = user.role === 'admin' || application.assignedAdvisorId === user.id
    if (!canArchive) {
      return NextResponse.json(
        { error: 'Only the assigned advisor or admin can archive/unarchive applications' },
        { status: 403 }
      )
    }

    // Determine new status
    const newStatus = archived ? 'archived' : 'started'
    const action = archived ? 'archived' : 'unarchived'

    // Check business rules
    if (archived && application.status === 'draft') {
      return NextResponse.json(
        { error: 'Draft applications cannot be archived. Use delete instead.' },
        { status: 400 }
      )
    }

    if (archived && application.status === 'archived') {
      return NextResponse.json(
        { error: 'Application is already archived' },
        { status: 400 }
      )
    }

    if (!archived && application.status !== 'archived') {
      return NextResponse.json(
        { error: 'Application is not archived' },
        { status: 400 }
      )
    }

    // Update application status
    await db
      .update(applications)
      .set({
        status: newStatus,
        updatedAt: new Date()
      })
      .where(eq(applications.id, applicationId))

    // Log the archive action
    await db.insert(activityLogs).values({
      firmId: user.firmId,
      userId: user.id,
      applicationId: applicationId,
      action: `application_${action}`,
      entityType: 'application',
      entityId: applicationId,
      oldValues: {
        status: application.status
      },
      newValues: {
        status: newStatus,
        notes: notes || null,
        actionBy: user.name,
        actionAt: new Date().toISOString()
      }
    })

    return NextResponse.json({
      success: true,
      message: `Application ${application.applicationNumber} has been ${action}`,
      status: newStatus
    })

  } catch (error) {
    console.error('Error archiving/unarchiving application:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to archive/unarchive application. Please try again.' },
      { status: 500 }
    )
  }
}