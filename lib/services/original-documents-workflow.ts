// Service to integrate original documents tracking with workflow stage progress
import { db } from '@/db/drizzle'
import { originalDocuments, applications, workflowStages, stageProgress } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export interface OriginalDocumentsProgress {
  totalRequested: number
  shipped: number
  received: number
  verified: number
  completionPercentage: number
  status: 'pending' | 'in_progress' | 'completed'
  canCompleteStage: boolean
}

/**
 * Calculate the progress of original documents collection for a specific application
 */
export async function getOriginalDocumentsProgress(applicationId: string): Promise<OriginalDocumentsProgress> {
  try {
    // Get all original documents for this application
    const documents = await db
      .select()
      .from(originalDocuments)
      .where(eq(originalDocuments.applicationId, applicationId))

    if (documents.length === 0) {
      return {
        totalRequested: 0,
        shipped: 0,
        received: 0,
        verified: 0,
        completionPercentage: 0,
        status: 'pending',
        canCompleteStage: true // If no originals are required, stage can be completed
      }
    }

    // Count documents by status
    const shipped = documents.filter(doc => 
      ['originals_shipped', 'originals_received', 'originals_verified'].includes(doc.status)
    ).length

    const received = documents.filter(doc => 
      ['originals_received', 'originals_verified'].includes(doc.status)
    ).length

    const verified = documents.filter(doc => doc.status === 'originals_verified').length

    // Calculate completion percentage based on verification (most critical step)
    const completionPercentage = Math.round((verified / documents.length) * 100)

    // Determine stage status
    let status: 'pending' | 'in_progress' | 'completed' = 'pending'
    let canCompleteStage = false

    if (verified === documents.length) {
      status = 'completed'
      canCompleteStage = true
    } else if (shipped > 0 || received > 0) {
      status = 'in_progress'
      canCompleteStage = false
    } else {
      status = 'pending'
      canCompleteStage = false
    }

    return {
      totalRequested: documents.length,
      shipped,
      received,
      verified,
      completionPercentage,
      status,
      canCompleteStage
    }

  } catch (error) {
    console.error('Error calculating original documents progress:', error)
    return {
      totalRequested: 0,
      shipped: 0,
      received: 0,
      verified: 0,
      completionPercentage: 0,
      status: 'pending',
      canCompleteStage: true
    }
  }
}

/**
 * Check if an application has any original document requirements
 */
export async function hasOriginalDocumentRequirements(applicationId: string): Promise<boolean> {
  try {
    const documents = await db
      .select({ id: originalDocuments.id })
      .from(originalDocuments)
      .where(eq(originalDocuments.applicationId, applicationId))
      .limit(1)

    return documents.length > 0
  } catch (error) {
    console.error('Error checking original document requirements:', error)
    return false
  }
}

/**
 * Update the stage progress when original documents status changes
 * This should be called whenever an original document status is updated
 */
export async function updateOriginalDocumentsStageProgress(applicationId: string): Promise<void> {
  try {
    const progress = await getOriginalDocumentsProgress(applicationId)
    
    // Get the Original Documents Collection stage for this application
    const application = await db
      .select({ workflowTemplateId: applications.workflowTemplateId })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application.length) {
      console.log('Application not found for stage progress update')
      return
    }

    // Find the Original Documents Collection stage
    const originalDocsStage = await db
      .select({ id: workflowStages.id })
      .from(workflowStages)
      .where(and(
        eq(workflowStages.templateId, application[0].workflowTemplateId),
        eq(workflowStages.stageOrder, ORIGINAL_DOCUMENTS_STAGE_ORDER),
        eq(workflowStages.stageName, 'Original Documents Collection')
      ))
      .limit(1)

    if (!originalDocsStage.length) {
      console.log('Original Documents Collection stage not found')
      return
    }

    // Update or insert stage progress
    
    // Check if stage progress already exists
    const existingProgress = await db
      .select()
      .from(stageProgress)
      .where(and(
        eq(stageProgress.applicationId, applicationId),
        eq(stageProgress.stageId, originalDocsStage[0].id)
      ))
      .limit(1)

    const stageProgressData = {
      status: progress.status,
      completionPercentage: progress.completionPercentage.toString(),
      ...(progress.status === 'in_progress' && !existingProgress.length ? { startedAt: new Date() } : {}),
      ...(progress.status === 'completed' ? { completedAt: new Date() } : {}),
      updatedAt: new Date()
    }

    if (existingProgress.length) {
      // Update existing progress
      await db
        .update(stageProgress)
        .set(stageProgressData)
        .where(and(
          eq(stageProgress.applicationId, applicationId),
          eq(stageProgress.stageId, originalDocsStage[0].id)
        ))
    } else {
      // Insert new progress
      await db
        .insert(stageProgress)
        .values({
          applicationId,
          stageId: originalDocsStage[0].id,
          ...stageProgressData
        })
    }

    console.log(`✅ Updated stage progress for Original Documents Collection: ${progress.status} (${progress.completionPercentage}%)`)
  } catch (error) {
    console.error('Error updating original documents stage progress:', error)
  }
}

/**
 * Get the stage order for the Original Documents Collection stage
 */
export const ORIGINAL_DOCUMENTS_STAGE_ORDER = 4