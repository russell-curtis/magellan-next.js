// Original Document Service
// Handles operations for physical document tracking throughout the government submission process

import { db } from '@/db/drizzle'
import { 
  originalDocuments,
  documentRequirements,
  applicationDocuments,
  applications,
  clients,
  users,
  activityLogs
} from '@/db/schema'
import { eq, and, desc, gte, lte, inArray } from 'drizzle-orm'
import { originalDocumentNotificationService } from './original-document-notifications'
import { updateOriginalDocumentsStageProgress } from './original-documents-workflow'
import { 
  validateOriginalDocumentStatusTransition,
  type RequestOriginalDocumentInput,
  type UpdateShippingInfoInput,
  type ConfirmReceiptInput,
  type CompleteVerificationInput,
  type UpdateOriginalDocumentStatusInput,
  type BulkRequestOriginalDocumentsInput,
  type OriginalDocumentFilters
} from '@/lib/validations/original-documents'

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface OriginalDocumentWithDetails {
  id: string
  applicationId: string
  documentRequirementId: string
  digitalDocumentId: string | null
  status: string
  documentName: string
  category: string | null
  isRequired: boolean
  
  // Shipping & Logistics
  shippedAt: Date | null
  courierService: string | null
  trackingNumber: string | null
  shippingAddress: string | null
  clientReference: string | null
  
  // Receipt & Verification
  receivedAt: Date | null
  receivedBy: string | null
  verifiedAt: Date | null
  verifiedBy: string | null
  
  // Document Condition & Quality
  documentCondition: string | null
  qualityNotes: string | null
  isAuthenticated: boolean
  authenticationDetails: string | null
  
  // Deadlines & Communication
  deadline: Date | null
  isUrgent: boolean
  governmentDeadline: Date | null
  requestedAt: Date | null
  requestedBy: string | null
  clientNotifiedAt: Date | null
  remindersSent: number
  
  // Notes
  internalNotes: string | null
  clientInstructions: string | null
  
  // Related Data
  application: {
    applicationNumber: string
    status: string
  }
  documentRequirement: {
    documentName: string
    category: string
    isRequired: boolean
  }
  digitalDocument?: {
    filename: string
    uploadedAt: Date
    status: string
  }
  requestedByUser?: {
    name: string
    email: string
  }
  receivedByUser?: {
    name: string
    email: string
  }
  verifiedByUser?: {
    name: string
    email: string
  }
  
  createdAt: Date
  updatedAt: Date
}

export interface OriginalDocumentStats {
  total: number
  digitalApproved: number
  originalsRequested: number
  originalsShipped: number
  originalsReceived: number
  originalsVerified: number
  readyForGovernment: number
  urgent: number
  overdue: number
}

// ============================================================================
// ORIGINAL DOCUMENT SERVICE
// ============================================================================

export class OriginalDocumentService {

  /**
   * Parse deadline date from datetime-local input or ISO string
   */
  private parseDeadlineDate(deadline: string): Date {
    try {
      // If the string doesn't include timezone info (from datetime-local input)
      // it will be in format "2025-01-15T14:30"
      if (deadline.includes('T') && !deadline.includes('+') && !deadline.endsWith('Z')) {
        // Assume local timezone for datetime-local inputs
        return new Date(deadline)
      }
      // Otherwise parse as-is (for ISO datetime strings)
      return new Date(deadline)
    } catch (error) {
      console.warn('Failed to parse deadline date:', deadline, error)
      return new Date() // Fallback to current date
    }
  }

  /**
   * Request original documents from client
   */
  async requestOriginalDocument(
    input: RequestOriginalDocumentInput,
    requestedBy: string,
    firmId: string
  ): Promise<{ success: boolean; originalDocument?: any; error?: string }> {
    try {
      // Validate that digital document exists and is approved
      const digitalDoc = input.digitalDocumentId ? await db
        .select({
          id: applicationDocuments.id,
          status: applicationDocuments.status,
          applicationId: applicationDocuments.applicationId
        })
        .from(applicationDocuments)
        .where(eq(applicationDocuments.id, input.digitalDocumentId))
        .limit(1) : null

      if (input.digitalDocumentId && (!digitalDoc?.length || digitalDoc[0].status !== 'approved')) {
        return {
          success: false,
          error: 'Digital document must be approved before requesting originals'
        }
      }

      // Get document requirement details
      const requirement = await db
        .select({
          id: documentRequirements.id,
          documentName: documentRequirements.documentName,
          category: documentRequirements.category,
          isRequired: documentRequirements.isRequired
        })
        .from(documentRequirements)
        .where(eq(documentRequirements.id, input.documentRequirementId))
        .limit(1)

      if (!requirement.length) {
        return {
          success: false,
          error: 'Document requirement not found'
        }
      }

      // Check if original document tracking already exists
      const existingOriginal = await db
        .select({ id: originalDocuments.id, status: originalDocuments.status })
        .from(originalDocuments)
        .where(and(
          eq(originalDocuments.applicationId, input.applicationId),
          eq(originalDocuments.documentRequirementId, input.documentRequirementId)
        ))
        .limit(1)

      if (existingOriginal.length) {
        return {
          success: false,
          error: 'Original document tracking already exists for this requirement'
        }
      }

      // Create original document tracking record
      const originalDocumentData = {
        applicationId: input.applicationId,
        documentRequirementId: input.documentRequirementId,
        digitalDocumentId: input.digitalDocumentId || null,
        status: 'originals_requested',
        requestedAt: new Date(),
        requestedBy,
        clientNotifiedAt: new Date(),
        clientInstructions: input.clientInstructions || null,
        deadline: input.deadline ? this.parseDeadlineDate(input.deadline) : null,
        isUrgent: input.isUrgent,
        shippingAddress: input.shippingAddress,
        internalNotes: input.internalNotes || null,
        remindersSent: 0
      }

      const result = await db
        .insert(originalDocuments)
        .values(originalDocumentData)
        .returning()

      // Log activity
      await this.logOriginalDocumentActivity(
        input.applicationId,
        result[0].id,
        'originals_requested',
        requestedBy,
        firmId,
        {
          documentName: requirement[0].documentName,
          deadline: input.deadline,
          isUrgent: input.isUrgent
        }
      )

      // Send notification to client
      console.log('🚀 About to send notification for original document request...')
      console.log('🚀 Notification data will be:', {
        applicationId: input.applicationId,
        documentName: requirement[0].documentName,
        deadline: input.deadline,
        isUrgent: input.isUrgent,
        shippingAddress: input.shippingAddress,
        clientInstructions: input.clientInstructions,
        requestedBy,
        firmId
      })
      
      let notificationSent = false
      try {
        notificationSent = await originalDocumentNotificationService.notifyClientOfOriginalDocumentRequest({
          applicationId: input.applicationId,
          documentName: requirement[0].documentName,
          deadline: input.deadline,
          isUrgent: input.isUrgent,
          shippingAddress: input.shippingAddress,
          clientInstructions: input.clientInstructions,
          requestedBy,
          firmId
        })
        console.log('🚀 Notification result:', notificationSent)
      } catch (notificationError) {
        console.error('❌ Error during notification send:', notificationError)
        notificationSent = false
      }

      if (notificationSent) {
        console.log(`✅ Client notification sent for original document request: ${requirement[0].documentName}`)
      } else {
        console.warn(`⚠️ Failed to send client notification for original document request: ${requirement[0].documentName}`)
      }

      return {
        success: true,
        originalDocument: result[0]
      }
    } catch (error) {
      console.error('Error requesting original document:', error)
      return {
        success: false,
        error: `Failed to request original document: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Update shipping information
   */
  async updateShippingInfo(
    originalDocumentId: string,
    input: UpdateShippingInfoInput,
    updatedBy: string,
    firmId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate status transition
      const currentDoc = await db
        .select({ status: originalDocuments.status })
        .from(originalDocuments)
        .where(eq(originalDocuments.id, originalDocumentId))
        .limit(1)

      if (!currentDoc.length) {
        return { success: false, error: 'Original document not found' }
      }

      const transition = validateOriginalDocumentStatusTransition(currentDoc[0].status, 'originals_shipped')
      if (!transition.valid) {
        return { success: false, error: transition.error }
      }

      // Update shipping information and status
      await db
        .update(originalDocuments)
        .set({
          status: 'originals_shipped',
          courierService: input.courierService,
          trackingNumber: input.trackingNumber,
          shippedAt: input.shippedAt ? new Date(input.shippedAt) : new Date(),
          clientReference: input.clientReference || null,
          expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
          updatedAt: new Date()
        })
        .where(eq(originalDocuments.id, originalDocumentId))

      // Log activity
      await this.logOriginalDocumentActivity(
        '', // Will be fetched in log function
        originalDocumentId,
        'shipping_updated',
        updatedBy,
        firmId,
        {
          courierService: input.courierService,
          trackingNumber: input.trackingNumber
        }
      )

      // Update workflow stage progress
      const doc = await db
        .select({ applicationId: originalDocuments.applicationId })
        .from(originalDocuments)
        .where(eq(originalDocuments.id, originalDocumentId))
        .limit(1)
      
      if (doc.length) {
        await updateOriginalDocumentsStageProgress(doc[0].applicationId)
      }

      return { success: true }
    } catch (error) {
      console.error('Error updating shipping info:', error)
      return {
        success: false,
        error: `Failed to update shipping info: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Confirm receipt of original documents
   */
  async confirmReceipt(
    originalDocumentId: string,
    input: ConfirmReceiptInput,
    receivedBy: string,
    firmId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current document with application and requirement details for notification
      const currentDoc = await db
        .select({
          status: originalDocuments.status,
          applicationId: originalDocuments.applicationId,
          documentRequirementId: originalDocuments.documentRequirementId,
          documentName: documentRequirements.documentName
        })
        .from(originalDocuments)
        .leftJoin(documentRequirements, eq(originalDocuments.documentRequirementId, documentRequirements.id))
        .where(eq(originalDocuments.id, originalDocumentId))
        .limit(1)

      if (!currentDoc.length) {
        return { success: false, error: 'Original document not found' }
      }

      const transition = validateOriginalDocumentStatusTransition(currentDoc[0].status, 'originals_received')
      if (!transition.valid) {
        return { success: false, error: transition.error }
      }

      // Update receipt information
      await db
        .update(originalDocuments)
        .set({
          status: 'originals_received',
          receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
          receivedBy,
          documentCondition: input.documentCondition,
          qualityNotes: input.qualityNotes || null,
          isAuthenticated: input.isAuthenticated,
          authenticationDetails: input.authenticationDetails || null,
          internalNotes: input.internalNotes || null,
          updatedAt: new Date()
        })
        .where(eq(originalDocuments.id, originalDocumentId))

      // Log activity
      await this.logOriginalDocumentActivity(
        currentDoc[0].applicationId || '',
        originalDocumentId,
        'originals_received',
        receivedBy,
        firmId,
        {
          documentCondition: input.documentCondition,
          isAuthenticated: input.isAuthenticated
        }
      )

      // Send notification to client
      if (currentDoc[0].applicationId && currentDoc[0].documentName) {
        const notificationSent = await originalDocumentNotificationService.notifyClientOfDocumentReceived(
          currentDoc[0].applicationId,
          currentDoc[0].documentName,
          input.documentCondition,
          receivedBy
        )
        
        if (notificationSent) {
          console.log(`✅ Client notification sent for document received: ${currentDoc[0].documentName}`)
        } else {
          console.warn(`⚠️ Failed to send client notification for document received: ${currentDoc[0].documentName}`)
        }
      }

      // Update workflow stage progress
      await updateOriginalDocumentsStageProgress(currentDoc[0].applicationId)

      return { success: true }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      return {
        success: false,
        error: `Failed to confirm receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Complete verification of original documents
   */
  async completeVerification(
    originalDocumentId: string,
    input: CompleteVerificationInput,
    verifiedBy: string,
    firmId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current document with application and requirement details for notification
      const currentDoc = await db
        .select({
          status: originalDocuments.status,
          applicationId: originalDocuments.applicationId,
          documentRequirementId: originalDocuments.documentRequirementId,
          documentName: documentRequirements.documentName
        })
        .from(originalDocuments)
        .leftJoin(documentRequirements, eq(originalDocuments.documentRequirementId, documentRequirements.id))
        .where(eq(originalDocuments.id, originalDocumentId))
        .limit(1)

      if (!currentDoc.length) {
        return { success: false, error: 'Original document not found' }
      }

      const newStatus = input.verificationStatus === 'verified' ? 'originals_verified' : 'originals_received'
      const transition = validateOriginalDocumentStatusTransition(currentDoc[0].status, newStatus)
      if (!transition.valid) {
        return { success: false, error: transition.error }
      }

      // Update verification information
      await db
        .update(originalDocuments)
        .set({
          status: newStatus,
          verifiedAt: new Date(),
          verifiedBy,
          isAuthenticated: input.isAuthenticated,
          authenticationDetails: input.authenticationDetails || null,
          internalNotes: input.internalNotes || null,
          updatedAt: new Date()
        })
        .where(eq(originalDocuments.id, originalDocumentId))

      // Log activity
      await this.logOriginalDocumentActivity(
        currentDoc[0].applicationId || '',
        originalDocumentId,
        'verification_completed',
        verifiedBy,
        firmId,
        {
          verificationStatus: input.verificationStatus,
          isAuthenticated: input.isAuthenticated
        }
      )

      // Send notification to client if document was verified successfully
      if (input.verificationStatus === 'verified' && currentDoc[0].applicationId && currentDoc[0].documentName) {
        const notificationSent = await originalDocumentNotificationService.notifyClientOfDocumentVerified(
          currentDoc[0].applicationId,
          currentDoc[0].documentName,
          verifiedBy
        )
        
        if (notificationSent) {
          console.log(`✅ Client notification sent for document verified: ${currentDoc[0].documentName}`)
        } else {
          console.warn(`⚠️ Failed to send client notification for document verified: ${currentDoc[0].documentName}`)
        }
      }

      // Update workflow stage progress
      await updateOriginalDocumentsStageProgress(currentDoc[0].applicationId)

      return { success: true }
    } catch (error) {
      console.error('Error completing verification:', error)
      return {
        success: false,
        error: `Failed to complete verification: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }

  /**
   * Get original documents for an application
   */
  async getOriginalDocumentsByApplication(applicationId: string): Promise<OriginalDocumentWithDetails[]> {
    try {
      const results = await db
        .select({
          // Original document fields
          id: originalDocuments.id,
          applicationId: originalDocuments.applicationId,
          documentRequirementId: originalDocuments.documentRequirementId,
          digitalDocumentId: originalDocuments.digitalDocumentId,
          status: originalDocuments.status,
          
          // Shipping & Logistics
          shippedAt: originalDocuments.shippedAt,
          courierService: originalDocuments.courierService,
          trackingNumber: originalDocuments.trackingNumber,
          shippingAddress: originalDocuments.shippingAddress,
          clientReference: originalDocuments.clientReference,
          
          // Receipt & Verification
          receivedAt: originalDocuments.receivedAt,
          receivedBy: originalDocuments.receivedBy,
          verifiedAt: originalDocuments.verifiedAt,
          verifiedBy: originalDocuments.verifiedBy,
          
          // Document Condition & Quality
          documentCondition: originalDocuments.documentCondition,
          qualityNotes: originalDocuments.qualityNotes,
          isAuthenticated: originalDocuments.isAuthenticated,
          authenticationDetails: originalDocuments.authenticationDetails,
          
          // Deadlines & Communication
          deadline: originalDocuments.deadline,
          isUrgent: originalDocuments.isUrgent,
          governmentDeadline: originalDocuments.governmentDeadline,
          requestedAt: originalDocuments.requestedAt,
          requestedBy: originalDocuments.requestedBy,
          clientNotifiedAt: originalDocuments.clientNotifiedAt,
          remindersSent: originalDocuments.remindersSent,
          
          // Notes
          internalNotes: originalDocuments.internalNotes,
          clientInstructions: originalDocuments.clientInstructions,
          
          // Timestamps
          createdAt: originalDocuments.createdAt,
          updatedAt: originalDocuments.updatedAt,
          
          // Related data
          application: {
            applicationNumber: applications.applicationNumber,
            status: applications.status
          },
          // Document requirement details
          documentName: documentRequirements.documentName,
          category: documentRequirements.category,
          isRequired: documentRequirements.isRequired,
          
          documentRequirement: {
            documentName: documentRequirements.documentName,
            category: documentRequirements.category,
            isRequired: documentRequirements.isRequired
          }
        })
        .from(originalDocuments)
        .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
        .leftJoin(documentRequirements, eq(originalDocuments.documentRequirementId, documentRequirements.id))
        .where(eq(originalDocuments.applicationId, applicationId))
        .orderBy(desc(originalDocuments.createdAt))

      return results as OriginalDocumentWithDetails[]
    } catch (error) {
      console.error('Error fetching original documents:', error)
      return []
    }
  }

  /**
   * Get original document statistics
   */
  async getOriginalDocumentStats(firmId: string): Promise<OriginalDocumentStats> {
    try {
      const results = await db
        .select({
          status: originalDocuments.status,
          isUrgent: originalDocuments.isUrgent,
          deadline: originalDocuments.deadline
        })
        .from(originalDocuments)
        .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
        .where(eq(applications.firmId, firmId))

      const now = new Date()
      const stats: OriginalDocumentStats = {
        total: results.length,
        digitalApproved: 0,
        originalsRequested: 0,
        originalsShipped: 0,
        originalsReceived: 0,
        originalsVerified: 0,
        readyForGovernment: 0,
        urgent: 0,
        overdue: 0
      }

      results.forEach(doc => {
        // Count by status
        switch (doc.status) {
          case 'digital_approved':
            stats.digitalApproved++
            break
          case 'originals_requested':
            stats.originalsRequested++
            break
          case 'originals_shipped':
            stats.originalsShipped++
            break
          case 'originals_received':
            stats.originalsReceived++
            break
          case 'originals_verified':
            stats.originalsVerified++
            break
          case 'ready_for_government':
            stats.readyForGovernment++
            break
        }

        // Count urgent
        if (doc.isUrgent) {
          stats.urgent++
        }

        // Count overdue
        if (doc.deadline && new Date(doc.deadline) < now) {
          stats.overdue++
        }
      })

      return stats
    } catch (error) {
      console.error('Error fetching original document stats:', error)
      return {
        total: 0,
        digitalApproved: 0,
        originalsRequested: 0,
        originalsShipped: 0,
        originalsReceived: 0,
        originalsVerified: 0,
        readyForGovernment: 0,
        urgent: 0,
        overdue: 0
      }
    }
  }

  /**
   * Log original document activity
   */
  private async logOriginalDocumentActivity(
    applicationId: string,
    originalDocumentId: string,
    action: string,
    userId: string,
    firmId: string,
    metadata: Record<string, any>
  ) {
    try {
      // If applicationId not provided, fetch it from original document
      let appId = applicationId
      if (!appId) {
        const doc = await db
          .select({ applicationId: originalDocuments.applicationId })
          .from(originalDocuments)
          .where(eq(originalDocuments.id, originalDocumentId))
          .limit(1)
        
        if (doc.length) {
          appId = doc[0].applicationId
        }
      }

      await db.insert(activityLogs).values({
        firmId,
        userId,
        applicationId: appId,
        action,
        entityType: 'original_document',
        entityId: originalDocumentId,
        newValues: {
          ...metadata,
          timestamp: new Date().toISOString()
        }
      })
    } catch (error) {
      console.error('Error logging original document activity:', error)
      // Don't throw - activity logging is non-critical
    }
  }
}

// ============================================================================
// SERVICE INSTANCE
// ============================================================================

export const originalDocumentService = new OriginalDocumentService()