// Government Status Synchronization Service
// Provides real-time status updates from government portals

import { db } from '@/db/drizzle'
import { applications, activityLogs, users } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { governmentPortalRegistry } from './government-portal-integration'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface SyncJob {
  id: string
  applicationId: string
  governmentReferenceNumber: string
  countryCode: string
  firmId: string
  lastSyncAt: Date | null
  nextSyncAt: Date
  syncInterval: number // minutes
  isActive: boolean
  failureCount: number
  maxFailures: number
  lastError?: string
}

export interface SyncResult {
  applicationId: string
  success: boolean
  statusChanged: boolean
  oldStatus?: string
  newStatus?: string
  error?: string
  syncedAt: Date
  nextSyncAt: Date
}

export interface SyncBatch {
  batchId: string
  startedAt: Date
  completedAt?: Date
  totalJobs: number
  successfulJobs: number
  failedJobs: number
  statusChanges: number
  results: SyncResult[]
}

// ============================================================================
// GOVERNMENT STATUS SYNC SERVICE
// ============================================================================

export class GovernmentStatusSyncService {
  private syncJobs: Map<string, SyncJob> = new Map()
  private isRunning = false
  private syncIntervalId: NodeJS.Timeout | null = null

  /**
   * Initialize status synchronization for applications
   */
  async initializeSync(): Promise<void> {
    try {
      console.log('Initializing government status synchronization...')
      
      // Get all applications that need status sync
      const applicationsToSync = await db
        .select({
          id: applications.id,
          firmId: applications.firmId,
          status: applications.status,
          programId: applications.programId,
          submittedAt: applications.submittedAt,
          lastStatusCheck: applications.lastStatusCheck,
          governmentReferenceNumber: sql<string>`COALESCE(
            applications.government_reference_number, 
            CONCAT('REF-', UPPER(SUBSTRING(applications.id, -8)))
          )`,
          countryCode: sql<string>`COALESCE(
            (SELECT country_code FROM crbi_programs WHERE id = applications.program_id),
            'KN'
          )`
        })
        .from(applications)
        .where(
          and(
            inArray(applications.status, [
              'submitted_to_government',
              'under_review',
              'requires_action'
            ]),
            sql`applications.submitted_at IS NOT NULL`
          )
        )

      console.log(`Found ${applicationsToSync.length} applications requiring status sync`)

      // Create sync jobs
      for (const app of applicationsToSync) {
        const syncJob: SyncJob = {
          id: `sync-${app.id}`,
          applicationId: app.id,
          governmentReferenceNumber: app.governmentReferenceNumber,
          countryCode: app.countryCode,
          firmId: app.firmId,
          lastSyncAt: app.lastStatusCheck,
          nextSyncAt: this.calculateNextSyncTime(app.status, app.lastStatusCheck),
          syncInterval: this.getSyncInterval(app.status),
          isActive: true,
          failureCount: 0,
          maxFailures: 5
        }

        this.syncJobs.set(app.id, syncJob)
      }

      console.log(`Initialized ${this.syncJobs.size} sync jobs`)
      
      // Start the sync scheduler
      this.startSyncScheduler()
    } catch (error) {
      console.error('Failed to initialize status sync:', error)
      throw error
    }
  }

  /**
   * Start the sync scheduler
   */
  private startSyncScheduler(): void {
    if (this.isRunning) {
      console.log('Sync scheduler already running')
      return
    }

    this.isRunning = true
    console.log('Starting government status sync scheduler...')

    // Run sync every 5 minutes
    this.syncIntervalId = setInterval(async () => {
      try {
        await this.processSyncBatch()
      } catch (error) {
        console.error('Sync batch processing failed:', error)
      }
    }, 5 * 60 * 1000) // 5 minutes

    // Run initial sync immediately
    setTimeout(() => {
      this.processSyncBatch().catch(error => {
        console.error('Initial sync batch failed:', error)
      })
    }, 1000)
  }

  /**
   * Stop the sync scheduler
   */
  stopSyncScheduler(): void {
    if (this.syncIntervalId) {
      clearInterval(this.syncIntervalId)
      this.syncIntervalId = null
    }
    this.isRunning = false
    console.log('Government status sync scheduler stopped')
  }

  /**
   * Process a batch of sync jobs
   */
  async processSyncBatch(): Promise<SyncBatch> {
    const batchId = `batch-${Date.now()}`
    const startedAt = new Date()
    
    console.log(`Starting sync batch ${batchId}`)

    // Get jobs that need syncing
    const jobsToSync = Array.from(this.syncJobs.values()).filter(job => 
      job.isActive && 
      job.nextSyncAt <= new Date() &&
      job.failureCount < job.maxFailures
    )

    console.log(`Processing ${jobsToSync.length} sync jobs`)

    const batch: SyncBatch = {
      batchId,
      startedAt,
      totalJobs: jobsToSync.length,
      successfulJobs: 0,
      failedJobs: 0,
      statusChanges: 0,
      results: []
    }

    // Process jobs in smaller chunks to avoid overwhelming APIs
    const chunkSize = 5
    for (let i = 0; i < jobsToSync.length; i += chunkSize) {
      const chunk = jobsToSync.slice(i, i + chunkSize)
      
      // Process chunk in parallel
      const chunkResults = await Promise.allSettled(
        chunk.map(job => this.syncApplicationStatus(job))
      )

      // Collect results
      for (let j = 0; j < chunkResults.length; j++) {
        const result = chunkResults[j]
        const job = chunk[j]

        if (result.status === 'fulfilled') {
          batch.results.push(result.value)
          if (result.value.success) {
            batch.successfulJobs++
            if (result.value.statusChanged) {
              batch.statusChanges++
            }
            // Reset failure count on success
            job.failureCount = 0
          } else {
            batch.failedJobs++
            job.failureCount++
            job.lastError = result.value.error
          }
        } else {
          batch.failedJobs++
          job.failureCount++
          job.lastError = result.reason?.message || 'Unknown error'
          
          batch.results.push({
            applicationId: job.applicationId,
            success: false,
            statusChanged: false,
            error: job.lastError,
            syncedAt: new Date(),
            nextSyncAt: this.calculateNextSyncTime('error', null, job.failureCount)
          })
        }

        // Update job sync times
        job.lastSyncAt = new Date()
        job.nextSyncAt = this.calculateNextSyncTime(
          job.isActive ? 'active' : 'inactive', 
          job.lastSyncAt, 
          job.failureCount
        )

        // Deactivate job if too many failures
        if (job.failureCount >= job.maxFailures) {
          job.isActive = false
          console.warn(`Deactivating sync job for application ${job.applicationId} due to repeated failures`)
        }
      }

      // Small delay between chunks to be nice to APIs
      if (i + chunkSize < jobsToSync.length) {
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }

    batch.completedAt = new Date()
    
    console.log(`Completed sync batch ${batchId}:`, {
      totalJobs: batch.totalJobs,
      successful: batch.successfulJobs,
      failed: batch.failedJobs,
      statusChanges: batch.statusChanges,
      duration: batch.completedAt.getTime() - batch.startedAt.getTime()
    })

    return batch
  }

  /**
   * Sync status for a single application
   */
  async syncApplicationStatus(job: SyncJob): Promise<SyncResult> {
    try {
      console.log(`Syncing status for application ${job.applicationId}`)

      // Get portal adapter
      const portalAdapter = governmentPortalRegistry.getPortalAdapter(job.countryCode)
      if (!portalAdapter) {
        throw new Error(`No portal adapter found for country ${job.countryCode}`)
      }

      // Get current application status
      const currentApp = await db
        .select({
          id: applications.id,
          status: applications.status,
          firmId: applications.firmId
        })
        .from(applications)
        .where(eq(applications.id, job.applicationId))
        .limit(1)

      if (!currentApp.length) {
        throw new Error('Application not found')
      }

      const app = currentApp[0]
      const oldStatus = app.status

      // Authenticate with portal
      const authResult = await portalAdapter.authenticate()
      if (!authResult.success) {
        throw new Error(`Portal authentication failed: ${authResult.error}`)
      }

      // Check status with government portal
      const statusResult = await portalAdapter.checkApplicationStatus(
        job.governmentReferenceNumber,
        authResult.accessToken!
      )

      // Map portal status to our status
      const newStatus = this.mapPortalStatusToApplicationStatus(statusResult.status)
      const statusChanged = oldStatus !== newStatus

      // Update application if status changed
      if (statusChanged) {
        console.log(`Status changed for application ${job.applicationId}: ${oldStatus} -> ${newStatus}`)

        await db
          .update(applications)
          .set({
            status: newStatus,
            lastStatusCheck: new Date(),
            updatedAt: new Date(),
            ...(newStatus === 'approved' && { decidedAt: new Date() }),
            ...(newStatus === 'rejected' && { decidedAt: new Date() })
          })
          .where(eq(applications.id, job.applicationId))

        // Log status change activity
        await db.insert(activityLogs).values({
          firmId: app.firmId,
          userId: 'system', // System-initiated sync
          applicationId: job.applicationId,
          action: 'government_status_sync_update',
          entityType: 'application',
          entityId: job.applicationId,
          oldValues: { status: oldStatus },
          newValues: {
            status: newStatus,
            governmentNotes: statusResult.governmentNotes,
            nextSteps: statusResult.nextSteps,
            lastUpdated: statusResult.lastUpdated,
            syncedAt: new Date().toISOString(),
            portalUsed: job.countryCode
          }
        })

        // TODO: Send notifications to firm members about status change
        await this.notifyStatusChange(job.applicationId, job.firmId, oldStatus, newStatus, statusResult)
      } else {
        // Update last check time even if status didn't change
        await db
          .update(applications)
          .set({
            lastStatusCheck: new Date(),
            updatedAt: new Date()
          })
          .where(eq(applications.id, job.applicationId))
      }

      return {
        applicationId: job.applicationId,
        success: true,
        statusChanged,
        oldStatus,
        newStatus,
        syncedAt: new Date(),
        nextSyncAt: this.calculateNextSyncTime(newStatus, new Date())
      }
    } catch (error) {
      console.error(`Failed to sync status for application ${job.applicationId}:`, error)
      
      return {
        applicationId: job.applicationId,
        success: false,
        statusChanged: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        syncedAt: new Date(),
        nextSyncAt: this.calculateNextSyncTime('error', new Date(), job.failureCount + 1)
      }
    }
  }

  /**
   * Add new application to sync
   */
  async addApplicationToSync(
    applicationId: string, 
    governmentReferenceNumber: string,
    countryCode: string,
    firmId: string
  ): Promise<void> {
    const syncJob: SyncJob = {
      id: `sync-${applicationId}`,
      applicationId,
      governmentReferenceNumber,
      countryCode,
      firmId,
      lastSyncAt: null,
      nextSyncAt: new Date(Date.now() + 60000), // Start syncing in 1 minute
      syncInterval: this.getSyncInterval('submitted_to_government'),
      isActive: true,
      failureCount: 0,
      maxFailures: 5
    }

    this.syncJobs.set(applicationId, syncJob)
    console.log(`Added application ${applicationId} to status sync`)
  }

  /**
   * Remove application from sync
   */
  removeApplicationFromSync(applicationId: string): void {
    if (this.syncJobs.has(applicationId)) {
      this.syncJobs.delete(applicationId)
      console.log(`Removed application ${applicationId} from status sync`)
    }
  }

  /**
   * Get sync interval based on application status
   */
  private getSyncInterval(status: string): number {
    const intervals: Record<string, number> = {
      'submitted_to_government': 30, // 30 minutes - frequent checks for new submissions
      'under_review': 120, // 2 hours - less frequent for ongoing reviews
      'requires_action': 60, // 1 hour - moderate frequency for action needed
      'approved': 1440, // 24 hours - rare checks for approved (just in case)
      'rejected': 1440, // 24 hours - rare checks for rejected (just in case)
      'error': 240 // 4 hours - retry failed syncs less frequently
    }

    return intervals[status] || 120
  }

  /**
   * Calculate next sync time
   */
  private calculateNextSyncTime(
    status: string, 
    lastSync: Date | null, 
    failureCount = 0
  ): Date {
    const baseInterval = this.getSyncInterval(status)
    
    // Add exponential backoff for failures
    const backoffMultiplier = Math.min(Math.pow(2, failureCount), 8) // Max 8x backoff
    const intervalMinutes = baseInterval * backoffMultiplier
    
    return new Date(Date.now() + (intervalMinutes * 60 * 1000))
  }

  /**
   * Map portal status to application status
   */
  private mapPortalStatusToApplicationStatus(portalStatus: string): string {
    const statusMap: Record<string, string> = {
      'submitted': 'submitted_to_government',
      'under_review': 'under_review',
      'requires_action': 'requires_action',
      'approved': 'approved',
      'rejected': 'rejected',
      'cancelled': 'cancelled'
    }

    return statusMap[portalStatus] || 'under_review'
  }

  /**
   * Notify about status changes
   */
  private async notifyStatusChange(
    applicationId: string,
    firmId: string,
    oldStatus: string,
    newStatus: string,
    statusResult: {
      governmentNotes?: string
      nextSteps?: string[]
      lastUpdated: string
    }
  ): Promise<void> {
    try {
      // Get firm users to notify
      const firmUsers = await db
        .select({
          id: users.id,
          email: users.email,
          role: users.role
        })
        .from(users)
        .where(eq(users.firmId, firmId))

      // TODO: Implement notification system (email, in-app, etc.)
      console.log(`Would notify ${firmUsers.length} users about status change for application ${applicationId}: ${oldStatus} -> ${newStatus}`)
      
      // For now, just log the notification intent
      await db.insert(activityLogs).values({
        firmId,
        userId: 'system',
        applicationId,
        action: 'status_change_notification_queued',
        entityType: 'notification',
        entityId: applicationId,
        newValues: {
          oldStatus,
          newStatus,
          recipientCount: firmUsers.length,
          governmentNotes: statusResult.governmentNotes,
          nextSteps: statusResult.nextSteps,
          queuedAt: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Failed to queue status change notification:', error)
    }
  }

  /**
   * Get sync statistics
   */
  getSyncStatistics(): {
    totalJobs: number
    activeJobs: number
    inactiveJobs: number
    failedJobs: number
    averageInterval: number
    nextSyncTimes: { applicationId: string; nextSync: Date }[]
  } {
    const jobs = Array.from(this.syncJobs.values())
    
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter(j => j.isActive).length,
      inactiveJobs: jobs.filter(j => !j.isActive).length,
      failedJobs: jobs.filter(j => j.failureCount > 0).length,
      averageInterval: jobs.reduce((sum, j) => sum + j.syncInterval, 0) / jobs.length || 0,
      nextSyncTimes: jobs
        .filter(j => j.isActive)
        .sort((a, b) => a.nextSyncAt.getTime() - b.nextSyncAt.getTime())
        .slice(0, 10)
        .map(j => ({
          applicationId: j.applicationId,
          nextSync: j.nextSyncAt
        }))
    }
  }

  /**
   * Force sync for specific application
   */
  async forceSyncApplication(applicationId: string): Promise<SyncResult> {
    const job = this.syncJobs.get(applicationId)
    if (!job) {
      throw new Error('Application not found in sync jobs')
    }

    return await this.syncApplicationStatus(job)
  }
}

// ============================================================================
// SERVICE INSTANCE
// ============================================================================

export const governmentStatusSyncService = new GovernmentStatusSyncService()

// Auto-initialize on module load if not in test environment
if (process.env.NODE_ENV !== 'test' && process.env.NODE_ENV !== 'development') {
  setTimeout(async () => {
    try {
      await governmentStatusSyncService.initializeSync()
    } catch (error) {
      console.error('Failed to auto-initialize status sync:', error)
    }
  }, 10000) // Start after 10 seconds to allow app to fully initialize
}