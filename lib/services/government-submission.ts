// Government Submission Service
// Handles document compilation and submission to government portals

import { db } from '@/db/drizzle'
import { 
  applications, 
  documents,
  documentRequirements,
  activityLogs,
  workflowStages,
  programWorkflowTemplates,
  crbiPrograms
} from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// ============================================================================
// INTERFACES AND TYPES
// ============================================================================

export interface DocumentPackageItem {
  requirementId: string
  documentId: string
  fileName: string
  fileSize: number
  uploadedAt: string
  approvedAt: string | null
  category: string
  documentName: string
  isRequired: boolean
}

export interface GovernmentSubmissionPackage {
  applicationId: string
  applicationNumber: string
  programName: string
  countryCode: string
  clientInfo: {
    firstName: string
    lastName: string
    email: string
  }
  documents: DocumentPackageItem[]
  submissionMetadata: {
    totalDocuments: number
    requiredDocuments: number
    optionalDocuments: number
    packageSizeMB: number
    compiledAt: string
    compiledBy: string
  }
  validation: {
    isComplete: boolean
    missingRequiredDocs: string[]
    warnings: string[]
  }
}

export interface SubmissionResult {
  success: boolean
  submissionId?: string
  governmentReferenceNumber?: string
  submittedAt?: string
  errors?: string[]
  warnings?: string[]
}

// ============================================================================
// DOCUMENT COMPILATION SERVICE
// ============================================================================

export class DocumentCompilationService {
  
  /**
   * Compile all approved documents for government submission
   */
  async compileSubmissionPackage(
    applicationId: string,
    compiledBy: string
  ): Promise<GovernmentSubmissionPackage> {
    try {
      // Get application details
      const application = await this.getApplicationDetails(applicationId)
      if (!application) {
        throw new Error('Application not found')
      }

      // Get all document requirements for this program
      const requirements = await this.getDocumentRequirements(application.programId)
      
      // Get uploaded and approved documents
      const approvedDocuments = await this.getApprovedDocuments(applicationId)
      
      // Compile package
      const submissionPackage: GovernmentSubmissionPackage = {
        applicationId,
        applicationNumber: application.applicationNumber,
        programName: application.program.programName,
        countryCode: application.program.countryCode,
        clientInfo: {
          firstName: application.client.firstName,
          lastName: application.client.lastName,
          email: application.client.email
        },
        documents: approvedDocuments,
        submissionMetadata: {
          totalDocuments: approvedDocuments.length,
          requiredDocuments: approvedDocuments.filter(d => d.isRequired).length,
          optionalDocuments: approvedDocuments.filter(d => !d.isRequired).length,
          packageSizeMB: this.calculatePackageSize(approvedDocuments),
          compiledAt: new Date().toISOString(),
          compiledBy
        },
        validation: this.validatePackage(requirements, approvedDocuments)
      }

      // Log compilation activity
      await this.logCompilationActivity(applicationId, compiledBy, submissionPackage)

      return submissionPackage
    } catch (error) {
      console.error('Error compiling submission package:', error)
      throw error
    }
  }

  /**
   * Get application details with related data
   */
  private async getApplicationDetails(applicationId: string) {
    const result = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        firmId: applications.firmId,
        programId: applications.programId,
        client: {
          id: applications.clientId,
          firstName: applications.clientId, // Will be joined properly
          lastName: applications.clientId,
          email: applications.clientId
        },
        program: {
          id: applications.programId,
          programName: applications.programId, // Will be joined properly
          countryCode: applications.programId,
          countryName: applications.programId
        }
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!result.length) return null

    // TODO: Add proper joins for client and program data
    // For now, we'll need to fetch separately
    const app = result[0]
    
    return {
      ...app,
      applicationNumber: app.applicationNumber || `APP-${applicationId.slice(-8).toUpperCase()}`,
      client: {
        firstName: 'Client', // TODO: Get from proper join
        lastName: 'Name',
        email: 'client@example.com'
      },
      program: {
        programName: 'St. Kitts Citizenship', // TODO: Get from proper join
        countryCode: 'KN',
        countryName: 'St. Kitts and Nevis'
      }
    }
  }

  /**
   * Get document requirements for a program
   */
  private async getDocumentRequirements(programId: string) {
    return await db
      .select({
        id: documentRequirements.id,
        documentName: documentRequirements.documentName,
        description: documentRequirements.description,
        category: documentRequirements.category,
        isRequired: documentRequirements.isRequired,
        stageId: documentRequirements.stageId
      })
      .from(documentRequirements)
      .where(eq(documentRequirements.programId, programId))
  }

  /**
   * Get approved documents for an application
   */
  private async getApprovedDocuments(applicationId: string): Promise<DocumentPackageItem[]> {
    const result = await db
      .select({
        requirementId: documents.requirementId,
        documentId: documents.id,
        fileName: documents.fileName,
        fileSize: documents.fileSize,
        uploadedAt: documents.uploadedAt,
        approvedAt: documents.approvedAt,
        category: documents.category,
        documentName: documents.fileName, // Will be enhanced with requirement data
        isRequired: documents.isRequired
      })
      .from(documents)
      .where(
        and(
          eq(documents.applicationId, applicationId),
          eq(documents.status, 'approved')
        )
      )

    return result.map(doc => ({
      requirementId: doc.requirementId || '',
      documentId: doc.documentId,
      fileName: doc.fileName,
      fileSize: doc.fileSize || 0,
      uploadedAt: doc.uploadedAt?.toISOString() || '',
      approvedAt: doc.approvedAt?.toISOString() || null,
      category: doc.category || 'general',
      documentName: doc.documentName,
      isRequired: doc.isRequired || false
    }))
  }

  /**
   * Calculate total package size in MB
   */
  private calculatePackageSize(documents: DocumentPackageItem[]): number {
    const totalBytes = documents.reduce((sum, doc) => sum + doc.fileSize, 0)
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Validate submission package completeness
   */
  private validatePackage(
    requirements: any[], 
    documents: DocumentPackageItem[]
  ): { isComplete: boolean; missingRequiredDocs: string[]; warnings: string[] } {
    const requiredRequirements = requirements.filter(req => req.isRequired)
    const uploadedRequirementIds = new Set(documents.map(doc => doc.requirementId))
    
    const missingRequiredDocs = requiredRequirements
      .filter(req => !uploadedRequirementIds.has(req.id))
      .map(req => req.documentName)

    const warnings: string[] = []
    
    // Check for large files
    const largeFiles = documents.filter(doc => doc.fileSize > 50 * 1024 * 1024) // 50MB
    if (largeFiles.length > 0) {
      warnings.push(`${largeFiles.length} large file(s) detected. May cause submission delays.`)
    }

    // Check for old documents
    const oldDocuments = documents.filter(doc => {
      const uploadDate = new Date(doc.uploadedAt)
      const daysOld = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)
      return daysOld > 90 // 3 months old
    })
    if (oldDocuments.length > 0) {
      warnings.push(`${oldDocuments.length} document(s) are older than 3 months.`)
    }

    return {
      isComplete: missingRequiredDocs.length === 0,
      missingRequiredDocs,
      warnings
    }
  }

  /**
   * Log compilation activity
   */
  private async logCompilationActivity(
    applicationId: string,
    compiledBy: string,
    submissionPackage: GovernmentSubmissionPackage
  ) {
    await db.insert(activityLogs).values({
      firmId: submissionPackage.applicationId, // TODO: Get proper firmId
      userId: compiledBy,
      applicationId,
      action: 'document_package_compiled',
      entityType: 'application',
      entityId: applicationId,
      newValues: {
        packageMetadata: submissionPackage.submissionMetadata,
        validation: submissionPackage.validation,
        compiledAt: new Date().toISOString()
      }
    })
  }
}

// ============================================================================
// GOVERNMENT SUBMISSION SERVICE
// ============================================================================

export class GovernmentSubmissionService {
  private compilationService = new DocumentCompilationService()

  /**
   * Prepare application for government submission
   */
  async prepareForSubmission(applicationId: string, userId: string): Promise<{
    success: boolean
    package?: GovernmentSubmissionPackage
    errors?: string[]
  }> {
    try {
      // Compile submission package
      const submissionPackage = await this.compilationService.compileSubmissionPackage(
        applicationId,
        userId
      )

      // Validate package is complete
      if (!submissionPackage.validation.isComplete) {
        return {
          success: false,
          errors: [
            'Application is not ready for submission.',
            `Missing required documents: ${submissionPackage.validation.missingRequiredDocs.join(', ')}`
          ]
        }
      }

      // Update application status to ready_for_submission
      await db
        .update(applications)
        .set({ 
          status: 'ready_for_submission',
          updatedAt: new Date()
        })
        .where(eq(applications.id, applicationId))

      return {
        success: true,
        package: submissionPackage
      }
    } catch (error) {
      console.error('Error preparing for submission:', error)
      return {
        success: false,
        errors: [`Failed to prepare submission: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Submit to government (placeholder for actual implementation)
   */
  async submitToGovernment(
    applicationId: string,
    submissionPackage: GovernmentSubmissionPackage,
    userId: string
  ): Promise<SubmissionResult> {
    try {
      // TODO: Implement actual government portal integration
      // For now, simulate the submission process
      
      const submissionId = `SUBM-${Date.now()}-${applicationId.slice(-6).toUpperCase()}`
      const governmentReferenceNumber = `GOV-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
      
      // Update application status
      await db
        .update(applications)
        .set({ 
          status: 'submitted_to_government',
          submittedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(applications.id, applicationId))

      // Log submission activity
      await db.insert(activityLogs).values({
        firmId: submissionPackage.applicationId, // TODO: Get proper firmId
        userId,
        applicationId,
        action: 'government_submission_completed',
        entityType: 'application',
        entityId: applicationId,
        newValues: {
          submissionId,
          governmentReferenceNumber,
          submittedAt: new Date().toISOString(),
          packageMetadata: submissionPackage.submissionMetadata
        }
      })

      return {
        success: true,
        submissionId,
        governmentReferenceNumber,
        submittedAt: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error submitting to government:', error)
      return {
        success: false,
        errors: [`Submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      }
    }
  }

  /**
   * Check submission status with government portal
   */
  async checkSubmissionStatus(
    applicationId: string,
    governmentReferenceNumber: string
  ): Promise<{
    status: string
    lastUpdated: string
    governmentNotes?: string
    nextSteps?: string[]
  }> {
    // TODO: Implement actual government API integration
    // For now, return mock status
    return {
      status: 'under_review',
      lastUpdated: new Date().toISOString(),
      governmentNotes: 'Application received and under initial review',
      nextSteps: [
        'Government conducting due diligence checks',
        'Additional documents may be requested',
        'Estimated review time: 90-120 days'
      ]
    }
  }
}

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

export const documentCompilationService = new DocumentCompilationService()
export const governmentSubmissionService = new GovernmentSubmissionService()