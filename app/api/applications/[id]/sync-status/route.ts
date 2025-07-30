// Manual Government Status Sync API
// Trigger manual status sync for specific applications

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { governmentStatusSyncService } from '@/lib/services/government-status-sync'

// ============================================================================
// POST - Trigger manual status sync for application
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    
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
        governmentReferenceNumber: applications.governmentReferenceNumber,
        submittedAt: applications.submittedAt,
        lastStatusCheck: applications.lastStatusCheck
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

    // Check if application is in a syncable status
    const syncableStatuses = [
      'submitted_to_government',
      'under_review',
      'requires_action'
    ]

    if (!syncableStatuses.includes(app.status)) {
      return NextResponse.json(
        { error: `Application status '${app.status}' is not eligible for status sync. Must be one of: ${syncableStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    if (!app.submittedAt) {
      return NextResponse.json(
        { error: 'Application has not been submitted to government yet' },
        { status: 400 }
      )
    }

    // Trigger manual sync
    try {
      console.log(`Manual status sync triggered for application ${applicationId} by user ${session.session.userId}`)
      
      const syncResult = await governmentStatusSyncService.forceSyncApplication(applicationId)
      
      // Calculate time since last sync
      const timeSinceLastSync = app.lastStatusCheck ? 
        Date.now() - new Date(app.lastStatusCheck).getTime() : null

      return NextResponse.json({
        success: true,
        message: 'Status sync completed',
        applicationId,
        syncResult: {
          success: syncResult.success,
          statusChanged: syncResult.statusChanged,
          oldStatus: syncResult.oldStatus,
          newStatus: syncResult.newStatus,
          error: syncResult.error,
          syncedAt: syncResult.syncedAt
        },
        previousSync: {
          lastSyncAt: app.lastStatusCheck,
          timeSinceLastSyncMs: timeSinceLastSync,
          timeSinceLastSyncHuman: timeSinceLastSync ? 
            formatDuration(timeSinceLastSync) : 'Never synced'
        },
        triggeredBy: session.session.userId
      })
    } catch (error) {
      console.error(`Manual status sync failed for application ${applicationId}:`, error)
      
      return NextResponse.json({
        success: false,
        error: 'Failed to sync application status',
        details: error instanceof Error ? error.message : 'Unknown error',
        applicationId
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error triggering manual status sync:', error)
    return NextResponse.json(
      { error: 'Failed to trigger status sync' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET - Get sync status for application
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    
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
        governmentReferenceNumber: applications.governmentReferenceNumber,
        submittedAt: applications.submittedAt,
        lastStatusCheck: applications.lastStatusCheck
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

    // Get sync statistics
    const syncStats = governmentStatusSyncService.getSyncStatistics()
    
    // Check if this application is in the sync system
    const nextSyncInfo = syncStats.nextSyncTimes.find(
      sync => sync.applicationId === applicationId
    )

    const timeSinceLastSync = app.lastStatusCheck ? 
      Date.now() - new Date(app.lastStatusCheck).getTime() : null

    const syncableStatuses = [
      'submitted_to_government',
      'under_review', 
      'requires_action'
    ]

    return NextResponse.json({
      success: true,
      applicationId,
      currentStatus: app.status,
      governmentReferenceNumber: app.governmentReferenceNumber,
      submittedAt: app.submittedAt,
      syncInfo: {
        isEligibleForSync: syncableStatuses.includes(app.status) && !!app.submittedAt,
        isInSyncSystem: !!nextSyncInfo,
        lastSyncAt: app.lastStatusCheck,
        timeSinceLastSyncMs: timeSinceLastSync,
        timeSinceLastSyncHuman: timeSinceLastSync ? 
          formatDuration(timeSinceLastSync) : 'Never synced',
        nextSyncAt: nextSyncInfo?.nextSync || null
      },
      globalSyncStats: {
        totalSyncJobs: syncStats.totalJobs,
        activeSyncJobs: syncStats.activeJobs,
        averageIntervalMinutes: Math.round(syncStats.averageInterval)
      }
    })

  } catch (error) {
    console.error('Error getting sync status:', error)
    return NextResponse.json(
      { error: 'Failed to get sync status' },
      { status: 500 }
    )
  }
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`
  } else {
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`
  }
}