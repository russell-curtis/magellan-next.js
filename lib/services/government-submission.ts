// Government Submission Service
// Handles document compilation and submission to government portals

import { db } from '@/db/drizzle'
import { 
  applications, 
  documents,
  documentRequirements,
  activityLogs,
  clients,
  crbiPrograms
} from '@/db/schema'
import { eq } from 'drizzle-orm'

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
      console.log('=== COMPILE SUBMISSION PACKAGE STARTED ===')
      console.log('Application ID:', applicationId)
      console.log('Compiled by:', compiledBy)

      // Get application details
      const application = await this.getApplicationDetails(applicationId)
      console.log('Application details:', application ? 'Found' : 'Not found')
      if (!application) {
        throw new Error('Application not found')
      }

      // Get all document requirements for this program
      const requirements = await this.getDocumentRequirements(application.programId)
      console.log('Requirements found:', requirements.length)
      
      // Get uploaded and approved documents
      const approvedDocuments = await this.getApprovedDocuments(applicationId)
      console.log('Approved documents found:', approvedDocuments.length)
      
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
      try {
        await this.logCompilationActivity(applicationId, compiledBy, submissionPackage, application.firmId)
        console.log('Activity logging completed')
      } catch (logError) {
        console.error('Activity logging failed (non-critical):', logError)
        // Continue despite logging failure
      }

      console.log('=== COMPILE SUBMISSION PACKAGE COMPLETED ===')
      return submissionPackage
    } catch (error) {
      console.error('=== ERROR IN COMPILE SUBMISSION PACKAGE ===', error)
      throw error
    }
  }

  /**
   * Get application details with related data
   */
  private async getApplicationDetails(applicationId: string) {
    try {
      console.log('Getting application details for:', applicationId)
      
      // Get application with related client and program data
      const result = await db
        .select({
          // Application fields
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          status: applications.status,
          firmId: applications.firmId,
          programId: applications.programId,
          clientId: applications.clientId,
          investmentAmount: applications.investmentAmount,
          createdAt: applications.createdAt,
          // Client fields
          clientFirstName: clients.firstName,
          clientLastName: clients.lastName,
          clientEmail: clients.email,
          clientPhone: clients.phone,
          clientNationality: clients.nationality,
          clientPassportNumber: clients.passportNumber,
          // Program fields
          programName: crbiPrograms.programName,
          countryCode: crbiPrograms.countryCode,
          countryName: crbiPrograms.countryName,
          programType: crbiPrograms.programType,
          minInvestment: crbiPrograms.minInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths
        })
        .from(applications)
        .leftJoin(clients, eq(applications.clientId, clients.id))
        .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
        .where(eq(applications.id, applicationId))
        .limit(1)

      if (!result.length) {
        console.log('Application not found:', applicationId)
        return null
      }

      const data = result[0]
      console.log('Application details retrieved:', {
        applicationId: data.id,
        hasClient: !!data.clientFirstName,
        hasProgram: !!data.programName
      })

      return {
        id: data.id,
        applicationNumber: data.applicationNumber || `APP-${applicationId.slice(-8).toUpperCase()}`,
        status: data.status,
        firmId: data.firmId,
        programId: data.programId,
        clientId: data.clientId,
        investmentAmount: data.investmentAmount,
        createdAt: data.createdAt,
        client: {
          firstName: data.clientFirstName || 'Unknown',
          lastName: data.clientLastName || 'Client',
          email: data.clientEmail || 'client@example.com',
          phone: data.clientPhone,
          nationality: data.clientNationality,
          passportNumber: data.clientPassportNumber
        },
        program: {
          programName: data.programName || 'Unknown Program',
          countryCode: data.countryCode || 'XX',
          countryName: data.countryName || 'Unknown Country',
          programType: data.programType || 'unknown',
          minInvestment: data.minInvestment,
          processingTimeMonths: data.processingTimeMonths
        }
      }
    } catch (error) {
      console.error('Error getting application details:', error)
      return null
    }
  }

  /**
   * Get document requirements for a program with enhanced validation data
   */
  private async getDocumentRequirements(programId: string) {
    try {
      console.log('Getting document requirements for program:', programId)
      
      const requirements = await db
        .select({
          id: documentRequirements.id,
          documentName: documentRequirements.documentName,
          description: documentRequirements.description,
          category: documentRequirements.category,
          isRequired: documentRequirements.isRequired,
          stageId: documentRequirements.stageId,
          acceptedFormats: documentRequirements.acceptedFormats,
          maxFileSize: documentRequirements.maxFileSize,
          validityDays: documentRequirements.validityDays,
          notes: documentRequirements.notes
        })
        .from(documentRequirements)
        .where(eq(documentRequirements.programId, programId))
      
      console.log('Document requirements retrieved:', requirements.length)
      
      // If no specific requirements found, return default CRBI requirements
      if (requirements.length === 0) {
        console.log('No specific requirements found, using default CRBI requirements')
        return this.getDefaultCRBIRequirements()
      }
      
      return requirements
    } catch (error) {
      console.error('Error getting document requirements:', error)
      // Fallback to default requirements on error
      return this.getDefaultCRBIRequirements()
    }
  }

  /**
   * Get default CRBI document requirements when program-specific ones are not available
   */
  private getDefaultCRBIRequirements() {
    return [
      {
        id: 'default-passport',
        documentName: 'Valid Passport',
        description: 'Current passport with at least 6 months validity',
        category: 'identity',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf', 'jpg', 'png'],
        maxFileSize: 10485760, // 10MB
        validityDays: 180,
        notes: 'All pages must be clearly visible'
      },
      {
        id: 'default-birth-certificate',
        documentName: 'Birth Certificate',
        description: 'Certified copy of birth certificate',
        category: 'identity',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 5242880, // 5MB
        validityDays: null,
        notes: 'Must be apostilled or legalized'
      },
      {
        id: 'default-police-clearance',
        documentName: 'Police Clearance Certificate',
        description: 'Police clearance from country of residence',
        category: 'background',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 5242880, // 5MB
        validityDays: 90,
        notes: 'Must be issued within 3 months'
      },
      {
        id: 'default-financial-statement',
        documentName: 'Financial Statements',
        description: 'Bank statements or investment proofs',
        category: 'financial',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 10485760, // 10MB
        validityDays: 90,
        notes: 'Last 6 months of statements required'
      },
      {
        id: 'default-medical-certificate',
        documentName: 'Medical Certificate',
        description: 'Health certificate from approved medical facility',
        category: 'medical',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 5242880, // 5MB
        validityDays: 30,
        notes: 'Must include HIV/AIDS and tuberculosis tests'
      },
      {
        id: 'default-investment-proof',
        documentName: 'Investment Documentation',
        description: 'Proof of investment commitment',
        category: 'investment',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 20971520, // 20MB
        validityDays: 180,
        notes: 'Investment agreement and proof of funds'
      }
    ]
  }

  /**
   * Get approved documents for an application
   */
  private async getApprovedDocuments(applicationId: string): Promise<DocumentPackageItem[]> {
    try {
      console.log('Getting approved documents for application:', applicationId)
      
      const result = await db
        .select({
          documentId: documents.id,
          fileName: documents.filename,
          originalFileName: documents.originalFilename,
          fileSize: documents.fileSize,
          uploadedAt: documents.createdAt, // Using createdAt as upload timestamp
          category: documents.category,
          documentType: documents.documentType
        })
        .from(documents)
        .where(eq(documents.applicationId, applicationId)) // Remove status filter for now
      
      console.log('Raw documents found:', result.length)

      return result.map(doc => ({
        requirementId: '', // Not available in current schema
        documentId: doc.documentId,
        fileName: doc.fileName || doc.originalFileName || 'document.pdf',
        fileSize: doc.fileSize || 0,
        uploadedAt: doc.uploadedAt?.toISOString() || new Date().toISOString(),
        approvedAt: doc.uploadedAt?.toISOString() || null, // Using upload time as approved time
        category: doc.category || 'general',
        documentName: doc.originalFileName || doc.fileName || 'Document',
        isRequired: true // Default to required for now
      }))
    } catch (error) {
      console.error('Error getting approved documents:', error)
      // Return empty array instead of throwing
      return []
    }
  }

  /**
   * Calculate total package size in MB
   */
  private calculatePackageSize(documents: DocumentPackageItem[]): number {
    const totalBytes = documents.reduce((sum, doc) => sum + doc.fileSize, 0)
    return Math.round((totalBytes / (1024 * 1024)) * 100) / 100 // Round to 2 decimal places
  }

  /**
   * Validate submission package completeness against program requirements
   */
  private validatePackage(
    requirements: Array<{
      id: string
      documentName: string
      description: string
      category: string
      isRequired: boolean
      stageId: string | null
      acceptedFormats?: string[]
      maxFileSize?: number
      validityDays?: number
      notes?: string
    }>, 
    documents: DocumentPackageItem[]
  ): { isComplete: boolean; missingRequiredDocs: string[]; warnings: string[] } {
    const warnings: string[] = []
    const missingRequiredDocs: string[] = []
    
    console.log('Validating package with requirements:', requirements.length, 'documents:', documents.length)
    
    // Enhanced file size validation based on requirements
    for (const doc of documents) {
      // Find matching requirement for more precise validation
      const matchingReq = requirements.find(req => 
        this.isDocumentMatchingRequirement(doc, req)
      )
      
      if (matchingReq?.maxFileSize && doc.fileSize > matchingReq.maxFileSize) {
        warnings.push(`${doc.documentName} exceeds maximum file size (${this.formatFileSize(matchingReq.maxFileSize)})`)
      } else if (!matchingReq && doc.fileSize > 50 * 1024 * 1024) {
        // General large file warning for unmatched documents
        warnings.push(`${doc.documentName} is very large (>50MB). May cause submission delays.`)
      }
    }

    // Enhanced document age validation based on requirements
    for (const doc of documents) {
      const uploadDate = new Date(doc.uploadedAt)
      const daysOld = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)
      
      const matchingReq = requirements.find(req => 
        this.isDocumentMatchingRequirement(doc, req)
      )
      
      if (matchingReq?.validityDays && daysOld > matchingReq.validityDays) {
        warnings.push(`${doc.documentName} is older than required validity period (${matchingReq.validityDays} days)`)
      } else if (!matchingReq && daysOld > 90) {
        // General age warning for unmatched documents
        warnings.push(`${doc.documentName} is older than 3 months. Consider requesting updated version.`)
      }
    }

    // File format validation
    for (const doc of documents) {
      const fileExtension = doc.fileName.split('.').pop()?.toLowerCase()
      
      if (!fileExtension) {
        warnings.push(`${doc.documentName} missing file extension. May cause processing issues.`)
        continue
      }
      
      const matchingReq = requirements.find(req => 
        this.isDocumentMatchingRequirement(doc, req)
      )
      
      if (matchingReq?.acceptedFormats && !matchingReq.acceptedFormats.includes(fileExtension)) {
        warnings.push(`${doc.documentName} format (${fileExtension}) not accepted. Expected: ${matchingReq.acceptedFormats.join(', ')}`)
      }
    }

    // Validate against program requirements with improved matching
    const requiredDocs = requirements.filter(req => req.isRequired)
    
    for (const requirement of requiredDocs) {
      const matchingDocs = documents.filter(doc => 
        this.isDocumentMatchingRequirement(doc, requirement)
      )
      
      if (matchingDocs.length === 0) {
        missingRequiredDocs.push(`${requirement.documentName} (${requirement.category})`)
      } else if (matchingDocs.length > 1) {
        warnings.push(`Multiple documents found for ${requirement.documentName}. Please ensure only the most current version is included.`)
      }
    }

    // Quality checks
    if (documents.length === 0) {
      warnings.push('No documents uploaded. Submission cannot proceed.')
      missingRequiredDocs.push('At least one document is required')
    }

    // Check for documents without matching requirements
    const unmatchedDocs = documents.filter(doc => 
      !requirements.some(req => this.isDocumentMatchingRequirement(doc, req))
    )
    
    if (unmatchedDocs.length > 0) {
      warnings.push(`${unmatchedDocs.length} document(s) don't match program requirements: ${unmatchedDocs.map(d => d.documentName).join(', ')}`)
    }

    // Check for critical document categories
    const criticalCategories = ['identity', 'financial', 'background']
    const presentCategories = new Set(documents.map(doc => doc.category.toLowerCase()))
    
    for (const category of criticalCategories) {
      if (!presentCategories.has(category)) {
        const missingCategoryReqs = requirements.filter(req => 
          req.category?.toLowerCase() === category && req.isRequired
        )
        if (missingCategoryReqs.length > 0) {
          warnings.push(`No ${category} documents found. This category is typically required for CRBI applications.`)
        }
      }
    }

    const isComplete = missingRequiredDocs.length === 0
    
    console.log('Enhanced validation result:', {
      isComplete,
      missingRequiredDocs: missingRequiredDocs.length,
      warnings: warnings.length,
      unmatchedDocuments: unmatchedDocs.length
    })

    return {
      isComplete,
      missingRequiredDocs,
      warnings
    }
  }

  /**
   * Check if a document matches a requirement using enhanced matching logic
   */
  private isDocumentMatchingRequirement(document: DocumentPackageItem, requirement: {
    id: string
    documentName: string
    description: string
    category: string
    isRequired: boolean
    stageId: string | null
    acceptedFormats?: string[]
    maxFileSize?: number
    validityDays?: number
    notes?: string
  }): boolean {
    const docCategory = document.category?.toLowerCase() || ''
    const docName = document.documentName?.toLowerCase() || ''
    const docFileName = document.fileName?.toLowerCase() || ''
    
    const reqCategory = requirement.category?.toLowerCase() || ''
    const reqName = requirement.documentName?.toLowerCase() || ''
    
    // Direct category match
    if (docCategory === reqCategory) {
      return true
    }
    
    // Document name contains requirement name
    if (reqName && (docName.includes(reqName) || docFileName.includes(reqName))) {
      return true
    }
    
    // Category-based keyword matching
    const categoryKeywords: Record<string, string[]> = {
      identity: ['passport', 'birth', 'certificate', 'id', 'identity'],
      financial: ['bank', 'statement', 'financial', 'investment', 'funds'],
      background: ['police', 'clearance', 'criminal', 'background'],
      medical: ['medical', 'health', 'certificate', 'examination'],
      investment: ['investment', 'proof', 'commitment', 'agreement']
    }
    
    const reqKeywords = categoryKeywords[reqCategory] || []
    const docText = `${docName} ${docFileName} ${docCategory}`
    
    return reqKeywords.some(keyword => docText.includes(keyword))
  }

  /**
   * Format file size for human reading
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * Get detailed validation report for frontend display
   */
  async getValidationReport(applicationId: string): Promise<{
    applicationDetails: {
      id: string
      applicationNumber: string
      status: string
      firmId: string
      programId: string
      clientId: string
      investmentAmount: number | null
      createdAt: Date | null
      client: {
        firstName: string
        lastName: string
        email: string
        phone: string | null
        nationality: string | null
        passportNumber: string | null
      }
      program: {
        programName: string
        countryCode: string
        countryName: string
        programType: string
        minInvestment: number | null
        processingTimeMonths: number | null
      }
    }
    requirements: Array<{
      id: string
      documentName: string
      description: string
      category: string
      isRequired: boolean
      stageId: string | null
      acceptedFormats?: string[]
      maxFileSize?: number
      validityDays?: number
      notes?: string
    }>
    documents: DocumentPackageItem[]
    validation: { isComplete: boolean; missingRequiredDocs: string[]; warnings: string[] }
    detailedChecks: {
      requirementName: string
      status: 'complete' | 'missing' | 'warning'
      documents: DocumentPackageItem[]
      issues: string[]
      notes?: string
    }[]
  }> {
    try {
      console.log('Generating validation report for application:', applicationId)
      
      // Get application details
      const application = await this.getApplicationDetails(applicationId)
      if (!application) {
        throw new Error('Application not found')
      }
      
      // Get requirements and documents
      const requirements = await this.getDocumentRequirements(application.programId)
      const documents = await this.getApprovedDocuments(applicationId)
      
      // Run validation
      const validation = this.validatePackage(requirements, documents)
      
      // Generate detailed checks for each requirement
      const detailedChecks = requirements.map(requirement => {
        const matchingDocs = documents.filter(doc => 
          this.isDocumentMatchingRequirement(doc, requirement)
        )
        
        const issues: string[] = []
        let status: 'complete' | 'missing' | 'warning' = 'complete'
        
        if (matchingDocs.length === 0 && requirement.isRequired) {
          status = 'missing'
          issues.push('Required document not uploaded')
        } else if (matchingDocs.length === 0 && !requirement.isRequired) {
          status = 'warning'
          issues.push('Optional document not provided')
        } else {
          // Check individual document issues
          for (const doc of matchingDocs) {
            // File size check
            if (requirement.maxFileSize && doc.fileSize > requirement.maxFileSize) {
              status = 'warning'
              issues.push(`File size exceeds limit (${this.formatFileSize(requirement.maxFileSize)})`)
            }
            
            // Age check
            if (requirement.validityDays) {
              const uploadDate = new Date(doc.uploadedAt)
              const daysOld = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24)
              if (daysOld > requirement.validityDays) {
                status = 'warning'
                issues.push(`Document is ${Math.floor(daysOld)} days old (max: ${requirement.validityDays} days)`)
              }
            }
            
            // Format check
            const fileExtension = doc.fileName.split('.').pop()?.toLowerCase()
            if (requirement.acceptedFormats && fileExtension && !requirement.acceptedFormats.includes(fileExtension)) {
              status = 'warning'
              issues.push(`Format ${fileExtension} not accepted (expected: ${requirement.acceptedFormats.join(', ')})`)
            }
          }
          
          // Multiple documents check
          if (matchingDocs.length > 1) {
            status = status === 'complete' ? 'warning' : status
            issues.push(`Multiple documents found (${matchingDocs.length}). Consider keeping only the most recent.`)
          }
        }
        
        return {
          requirementName: requirement.documentName || requirement.category || 'Unknown',
          status,
          documents: matchingDocs,
          issues,
          notes: requirement.notes
        }
      })
      
      console.log('Validation report generated:', {
        requirements: requirements.length,
        documents: documents.length,
        detailedChecks: detailedChecks.length
      })
      
      return {
        applicationDetails: application,
        requirements,
        documents,
        validation,
        detailedChecks
      }
    } catch (error) {
      console.error('Error generating validation report:', error)
      throw error
    }
  }

  /**
   * Log compilation activity
   */
  private async logCompilationActivity(
    applicationId: string,
    compiledBy: string,
    submissionPackage: GovernmentSubmissionPackage,
    firmId: string
  ) {
    await db.insert(activityLogs).values({
      firmId,
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
      // Get application details for firmId
      const app = await db
        .select({ firmId: applications.firmId })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1)

      if (!app.length) {
        throw new Error('Application not found')
      }

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
        firmId: app[0].firmId,
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
    _applicationId: string,
    _governmentReferenceNumber: string
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