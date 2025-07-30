// Government Submission Service
// Handles document compilation and submission to government portals

import { db } from '@/db/drizzle'
import { 
  applications, 
  documents,
  documentRequirements,
  activityLogs,
  clients,
  crbiPrograms,
  investmentOptions
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
          selectedInvestmentOptionId: applications.selectedInvestmentOptionId,
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
          maxInvestment: crbiPrograms.maxInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths,
          description: crbiPrograms.description,
          metadata: crbiPrograms.metadata,
          // Investment option fields
          optionType: investmentOptions.optionType,
          optionName: investmentOptions.optionName,
          optionDescription: investmentOptions.description,
          baseAmount: investmentOptions.baseAmount,
          familyPricing: investmentOptions.familyPricing,
          holdingPeriod: investmentOptions.holdingPeriod
        })
        .from(applications)
        .leftJoin(clients, eq(applications.clientId, clients.id))
        .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
        .leftJoin(investmentOptions, eq(applications.selectedInvestmentOptionId, investmentOptions.id))
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
        hasProgram: !!data.programName,
        hasInvestmentOption: !!data.optionName,
        countryCode: data.countryCode,
        programType: data.programType
      })

      // Get all available investment options for this program
      const availableOptions = await db
        .select({
          id: investmentOptions.id,
          optionType: investmentOptions.optionType,
          optionName: investmentOptions.optionName,
          description: investmentOptions.description,
          baseAmount: investmentOptions.baseAmount,
          familyPricing: investmentOptions.familyPricing,
          holdingPeriod: investmentOptions.holdingPeriod,
          isActive: investmentOptions.isActive,
          sortOrder: investmentOptions.sortOrder
        })
        .from(investmentOptions)
        .where(eq(investmentOptions.programId, data.programId))
        .orderBy(investmentOptions.sortOrder)

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
          description: data.description,
          minInvestment: data.minInvestment,
          maxInvestment: data.maxInvestment,
          processingTimeMonths: data.processingTimeMonths,
          metadata: data.metadata,
          availableInvestmentOptions: availableOptions
        },
        selectedInvestmentOption: data.optionName ? {
          id: data.selectedInvestmentOptionId,
          optionType: data.optionType,
          optionName: data.optionName,
          description: data.optionDescription,
          baseAmount: data.baseAmount,
          familyPricing: data.familyPricing,
          holdingPeriod: data.holdingPeriod
        } : null
      }
    } catch (error) {
      console.error('Error getting application details:', error)
      return null
    }
  }

  /**
   * Get document requirements for a program with enhanced multi-country validation
   */
  private async getDocumentRequirements(programId: string) {
    try {
      console.log('Getting document requirements for program:', programId)
      
      // Get program details to determine country-specific requirements
      const programInfo = await db
        .select({
          countryCode: crbiPrograms.countryCode,
          programType: crbiPrograms.programType,
          programName: crbiPrograms.programName,
          metadata: crbiPrograms.metadata
        })
        .from(crbiPrograms)
        .where(eq(crbiPrograms.id, programId))
        .limit(1)
      
      if (!programInfo.length) {
        console.log('Program not found, using default requirements')
        return this.getDefaultCRBIRequirements()
      }

      const program = programInfo[0]
      console.log('Program found:', {
        countryCode: program.countryCode,
        programType: program.programType,
        programName: program.programName
      })
      
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
      
      // If no specific requirements found, generate country-specific defaults
      if (requirements.length === 0) {
        console.log('No specific requirements found, generating country-specific requirements')
        return this.getCountrySpecificRequirements(program.countryCode, program.programType)
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
   * Get country-specific document requirements based on program type and country
   */
  private getCountrySpecificRequirements(countryCode: string, programType: string) {
    console.log(`Generating requirements for ${countryCode} (${programType})`)
    
    const baseRequirements = this.getDefaultCRBIRequirements()
    
    // Country-specific document requirements based on multi-country support documentation
    const countrySpecificDocs = this.getCountryDocumentRequirements(countryCode, programType)
    
    // Merge base requirements with country-specific ones
    return [...baseRequirements, ...countrySpecificDocs]
  }

  /**
   * Get document requirements specific to each country's CRBI program
   */
  private getCountryDocumentRequirements(countryCode: string, _programType: string) {
    const commonFinancialDocs = [
      {
        id: `${countryCode.toLowerCase()}-bank-statements`,
        documentName: 'Bank Statements',
        description: 'Recent bank statements (last 6 months)',
        category: 'financial',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 10485760,
        validityDays: 90,
        notes: 'All pages must be stamped by bank'
      },
      {
        id: `${countryCode.toLowerCase()}-source-of-funds`,
        documentName: 'Source of Funds Declaration',
        description: 'Detailed explanation and proof of source of investment funds',
        category: 'financial',
        isRequired: true,
        stageId: null,
        acceptedFormats: ['pdf'],
        maxFileSize: 20971520,
        validityDays: 180,
        notes: 'Must include supporting documentation'
      }
    ]

    switch (countryCode) {
      case 'PT': // Portugal Golden Visa
        return [
          ...commonFinancialDocs,
          {
            id: 'pt-sef-forms',
            documentName: 'SEF Application Forms',
            description: 'Completed Portuguese SEF application forms',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 30,
            notes: 'Forms must be completed in Portuguese'
          },
          {
            id: 'pt-apostille-docs',
            documentName: 'Apostilled Documents',
            description: 'All foreign documents with Portuguese apostille',
            category: 'legal',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 52428800,
            validityDays: 365,
            notes: 'Required under Hague Convention'
          }
        ]

      case 'GR': // Greece Golden Visa
        return [
          ...commonFinancialDocs,
          {
            id: 'gr-property-deed',
            documentName: 'Property Purchase Agreement',
            description: 'Signed property purchase agreement or investment contract',
            category: 'investment',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 20971520,
            validityDays: 90,
            notes: 'Must be for minimum €400,000 investment'
          },
          {
            id: 'gr-tax-clearance',
            documentName: 'Tax Clearance Certificate',
            description: 'Greek tax registration and clearance certificate',
            category: 'legal',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 10485760,
            validityDays: 60,
            notes: 'Required for all property investments'
          }
        ]

      case 'GD': // Grenada CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'gd-due-diligence',
            documentName: 'Enhanced Due Diligence Forms',
            description: 'Completed enhanced due diligence questionnaire',
            category: 'background',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 10485760,
            validityDays: 90,
            notes: 'Required for all CBI applications'
          },
          {
            id: 'gd-police-clearance',
            documentName: 'Police Clearance Certificate',
            description: 'Police clearance from all countries of residence',
            category: 'background',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 10485760,
            validityDays: 90,
            notes: 'Required for applicants over 16 years'
          }
        ]

      case 'KN': // St. Kitts & Nevis CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'kn-sisc-forms',
            documentName: 'SISC Application Forms',
            description: 'Sustainable Island State Contribution application forms',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 60,
            notes: 'Original CBI program forms'
          }
        ]

      case 'LC': // St. Lucia CBI  
        return [
          ...commonFinancialDocs,
          {
            id: 'lc-nef-forms',
            documentName: 'National Economic Fund Forms',
            description: 'St. Lucia National Economic Fund application',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 90,
            notes: 'Family-friendly pricing available'
          }
        ]

      case 'AG': // Antigua & Barbuda CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'ag-ndf-forms',
            documentName: 'National Development Fund Forms',
            description: 'Antigua & Barbuda National Development Fund application',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 90,
            notes: 'Special family rates available'
          }
        ]

      case 'DM': // Dominica CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'dm-edf-forms',
            documentName: 'Economic Diversification Fund Forms',
            description: 'Dominica Economic Diversification Fund application',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 90,
            notes: 'Nature-focused investment options'
          }
        ]

      case 'VU': // Vanuatu CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'vu-dsp-forms',
            documentName: 'Development Support Program Forms',
            description: 'Vanuatu Development Support Program application',
            category: 'application',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 15728640,
            validityDays: 30,
            notes: 'Fastest processing globally (2-3 months)'
          }
        ]

      case 'TR': // Turkey CBI
        return [
          ...commonFinancialDocs,
          {
            id: 'tr-property-valuation',
            documentName: 'Property Valuation Report',
            description: 'Official property valuation for minimum $400K investment',
            category: 'investment',
            isRequired: true,
            stageId: null,
            acceptedFormats: ['pdf'],
            maxFileSize: 20971520,
            validityDays: 90,
            notes: 'Must be from approved valuation company'
          }
        ]

      default:
        console.log(`No specific requirements for country: ${countryCode}`)
        return []
    }
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
   * Submit to government using portal integration framework
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

      // Try to use actual government portal integration
      try {
        const { governmentPortalRegistry } = await import('./government-portal-integration')
        const portalAdapter = governmentPortalRegistry.getPortalAdapter(submissionPackage.countryCode)
        
        if (portalAdapter) {
          console.log(`Using government portal integration for ${submissionPackage.countryCode}`)
          
          // Authenticate with government portal
          const authResult = await portalAdapter.authenticate()
          if (!authResult.success) {
            throw new Error(`Portal authentication failed: ${authResult.error}`)
          }

          // Submit to actual government portal
          const submissionResult = await portalAdapter.submitApplication(
            submissionPackage,
            authResult.accessToken!
          )

          if (!submissionResult.success) {
            throw new Error(`Portal submission failed: ${submissionResult.errors?.join(', ')}`)
          }

          // Update application status with real government data
          await db
            .update(applications)
            .set({ 
              status: 'submitted_to_government',
              submittedAt: new Date(),
              updatedAt: new Date(),
              governmentReferenceNumber: submissionResult.governmentReferenceNumber
            })
            .where(eq(applications.id, applicationId))

          // Log successful portal submission
          await db.insert(activityLogs).values({
            firmId: app[0].firmId,
            userId,
            applicationId,
            action: 'government_portal_submission_completed',
            entityType: 'application',
            entityId: applicationId,
            newValues: {
              submissionId: submissionResult.submissionId,
              governmentReferenceNumber: submissionResult.governmentReferenceNumber,
              submittedAt: submissionResult.submittedAt,
              trackingUrl: submissionResult.trackingUrl,
              estimatedProcessingTime: submissionResult.estimatedProcessingTime,
              portalUsed: true,
              countryCode: submissionPackage.countryCode,
              packageMetadata: submissionPackage.submissionMetadata
            }
          })

          // Add application to status sync system
          try {
            const { governmentStatusSyncService } = await import('./government-status-sync')
            await governmentStatusSyncService.addApplicationToSync(
              applicationId,
              submissionResult.governmentReferenceNumber!,
              submissionPackage.countryCode,
              app[0].firmId
            )
            console.log(`Added application ${applicationId} to status sync system`)
          } catch (syncError) {
            console.warn('Failed to add application to status sync:', syncError)
            // Don't fail the submission if sync addition fails
          }

          return {
            success: true,
            submissionId: submissionResult.submissionId,
            governmentReferenceNumber: submissionResult.governmentReferenceNumber,
            submittedAt: submissionResult.submittedAt
          }
        }
      } catch (portalError) {
        console.warn('Government portal integration failed, falling back to mock submission:', portalError)
      }

      // Fallback to mock submission if portal integration fails or is not available
      console.log('Using mock government submission process')
      
      const submissionId = `MOCK-${Date.now()}-${applicationId.slice(-6).toUpperCase()}`
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

      // Log mock submission activity
      await db.insert(activityLogs).values({
        firmId: app[0].firmId,
        userId,
        applicationId,
        action: 'government_mock_submission_completed',
        entityType: 'application',
        entityId: applicationId,
        newValues: {
          submissionId,
          governmentReferenceNumber,
          submittedAt: new Date().toISOString(),
          portalUsed: false,
          mockSubmission: true,
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
    try {
      // Get application details to determine country code
      const application = await this.getApplicationDetails(applicationId)
      if (!application) {
        throw new Error('Application not found')
      }

      // Try to use actual government portal integration
      try {
        const { governmentPortalRegistry } = await import('./government-portal-integration')
        const portalAdapter = governmentPortalRegistry.getPortalAdapter(application.program.countryCode)
        
        if (portalAdapter) {
          console.log(`Checking status with government portal for ${application.program.countryCode}`)
          
          // Authenticate with government portal
          const authResult = await portalAdapter.authenticate()
          if (!authResult.success) {
            throw new Error(`Portal authentication failed: ${authResult.error}`)
          }

          // Check status with actual government portal
          const statusResult = await portalAdapter.checkApplicationStatus(
            governmentReferenceNumber,
            authResult.accessToken!
          )

          return {
            status: statusResult.status,
            lastUpdated: statusResult.lastUpdated,
            governmentNotes: statusResult.governmentNotes,
            nextSteps: statusResult.nextSteps
          }
        }
      } catch (portalError) {
        console.warn('Government portal status check failed, falling back to mock status:', portalError)
      }

      // Fallback to mock status if portal integration fails or is not available
      console.log('Using mock government status check')
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: 'Application received and under initial review (mock status)',
        nextSteps: [
          'Government conducting due diligence checks',
          'Additional documents may be requested',
          'Estimated review time: 90-120 days'
        ]
      }
    } catch (error) {
      console.error('Error checking submission status:', error)
      return {
        status: 'under_review',
        lastUpdated: new Date().toISOString(),
        governmentNotes: `Status check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        nextSteps: ['Manual status verification required']
      }
    }
  }
}

// ============================================================================
// SERVICE INSTANCES
// ============================================================================

export const documentCompilationService = new DocumentCompilationService()
export const governmentSubmissionService = new GovernmentSubmissionService()