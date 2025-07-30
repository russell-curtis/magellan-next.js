// Government Status Synchronization Management API
// Admin endpoints for managing real-time status sync

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { governmentStatusSyncService } from '@/lib/services/government-status-sync'

// ============================================================================
// GET - Get sync status and statistics
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can access sync management
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeDetails = searchParams.get('details') === 'true'

    // Get sync statistics
    const syncStats = governmentStatusSyncService.getSyncStatistics()

    const response: Record<string, unknown> = {
      success: true,
      syncEnabled: true, // TODO: Add ability to enable/disable sync
      statistics: syncStats,
      retrievedAt: new Date().toISOString()
    }

    if (includeDetails) {
      // Add more detailed information
      response.details = {
        syncIntervalMinutes: 5,
        batchSizeLimit: 5,
        maxFailuresBeforeDeactivation: 5,
        supportedCountries: ['KN'], // TODO: Get from portal registry
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error retrieving sync status:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve sync status' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Control sync operations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can control sync
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, applicationId } = body

    switch (action) {
      case 'force_batch_sync':
        // Force immediate sync batch
        console.log('Force batch sync requested by admin:', session.session.userId)
        const batchResult = await governmentStatusSyncService.processSyncBatch()
        
        return NextResponse.json({
          success: true,
          message: 'Batch sync completed',
          batchResult: {
            batchId: batchResult.batchId,
            totalJobs: batchResult.totalJobs,
            successfulJobs: batchResult.successfulJobs,
            failedJobs: batchResult.failedJobs,
            statusChanges: batchResult.statusChanges,
            duration: batchResult.completedAt ? 
              batchResult.completedAt.getTime() - batchResult.startedAt.getTime() : null
          }
        })

      case 'force_application_sync':
        // Force sync for specific application
        if (!applicationId) {
          return NextResponse.json(
            { error: 'Application ID is required for application sync' },
            { status: 400 }
          )
        }

        console.log(`Force application sync requested for ${applicationId} by admin:`, session.session.userId)
        
        try {
          const syncResult = await governmentStatusSyncService.forceSyncApplication(applicationId)
          
          return NextResponse.json({
            success: true,
            message: 'Application sync completed',
            syncResult: {
              applicationId: syncResult.applicationId,
              success: syncResult.success,
              statusChanged: syncResult.statusChanged,
              oldStatus: syncResult.oldStatus,
              newStatus: syncResult.newStatus,
              error: syncResult.error,
              syncedAt: syncResult.syncedAt
            }
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to sync application: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 400 })
        }

      case 'reinitialize_sync':
        // Reinitialize the entire sync system
        console.log('Sync reinitialization requested by admin:', session.session.userId)
        
        try {
          await governmentStatusSyncService.initializeSync()
          
          return NextResponse.json({
            success: true,
            message: 'Sync system reinitialized successfully',
            statistics: governmentStatusSyncService.getSyncStatistics()
          })
        } catch (error) {
          return NextResponse.json({
            success: false,
            error: `Failed to reinitialize sync: ${error instanceof Error ? error.message : 'Unknown error'}`
          }, { status: 500 })
        }

      case 'stop_sync':
        // Stop the sync scheduler
        console.log('Sync stop requested by admin:', session.session.userId)
        governmentStatusSyncService.stopSyncScheduler()
        
        return NextResponse.json({
          success: true,
          message: 'Sync scheduler stopped'
        })

      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: force_batch_sync, force_application_sync, reinitialize_sync, stop_sync' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error controlling sync operations:', error)
    return NextResponse.json(
      { error: 'Failed to execute sync operation' },
      { status: 500 }
    )
  }
}