// St. Kitts and Nevis Citizenship by Investment Program Workflow Template
// This seed file creates the complete workflow template and document requirements for St. Kitts

import { db } from '../drizzle'
import { 
  crbiPrograms, 
  programWorkflowTemplates, 
  workflowStages, 
  documentRequirements 
} from '../schema'
import { eq } from 'drizzle-orm'

export async function seedStKittsWorkflow() {
  console.log('🌴 Seeding St. Kitts workflow template and document requirements...')

  try {
    // Find the St. Kitts program
    const stKittsProgram = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.countryCode, 'KN'))
      .limit(1)

    if (!stKittsProgram.length) {
      console.error('❌ St. Kitts program not found. Please run the CRBI programs seed first.')
      return
    }

    const programId = stKittsProgram[0].id
    console.log(`✅ Found St. Kitts program: ${programId}`)

    // 1. Create Program Workflow Template
    const [workflowTemplate] = await db
      .insert(programWorkflowTemplates)
      .values({
        programId,
        templateName: 'St. Kitts and Nevis Citizenship by Investment - Standard Workflow',
        description: 'Complete workflow template for St. Kitts citizenship applications including all required stages and document collection phases.',
        totalStages: 6,
        estimatedTimeMonths: 6, // 6 months total processing time
        isActive: true,
        version: 1,
      })
      .returning()

    console.log(`✅ Created workflow template: ${workflowTemplate.id}`)

    // 2. Create Workflow Stages
    const stages = [
      {
        stageOrder: 1,
        stageName: 'Application Setup',
        description: 'Initial application setup, investment option selection, and client consultation',
        estimatedDays: 5,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        dependsOnStages: [],
      },
      {
        stageOrder: 2,
        stageName: 'Document Collection',
        description: 'Collection of all required personal, financial, and due diligence documents',
        estimatedDays: 21,
        isRequired: true,
        canSkip: false,
        autoProgress: true, // Auto-advance when all required documents are approved
        dependsOnStages: [], // Will be populated after stage creation
      },
      {
        stageOrder: 3,
        stageName: 'Investment Processing',
        description: 'Real estate purchase agreements, SISC contribution, or other investment verification',
        estimatedDays: 30,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        dependsOnStages: [],
      },
      {
        stageOrder: 4,
        stageName: 'Government Submission',
        description: 'Complete application package preparation and submission to St. Kitts government',
        estimatedDays: 7,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        dependsOnStages: [],
      },
      {
        stageOrder: 5,
        stageName: 'Review & Processing',
        description: 'Government review period, due diligence checks, and additional document requests',
        estimatedDays: 120, // 4 months
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        dependsOnStages: [],
      },
      {
        stageOrder: 6,
        stageName: 'Approval & Completion',
        description: 'Certificate issuance, passport processing, and final completion',
        estimatedDays: 14,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        dependsOnStages: [],
      },
    ]

    const createdStages = []
    for (const stage of stages) {
      const [createdStage] = await db
        .insert(workflowStages)
        .values({
          templateId: workflowTemplate.id,
          ...stage,
        })
        .returning()

      createdStages.push(createdStage)
      console.log(`✅ Created stage: ${createdStage.stageName}`)
    }

    // Update dependencies (stage 2 depends on stage 1, etc.)
    await db
      .update(workflowStages)
      .set({ dependsOnStages: [createdStages[0].id] })
      .where(eq(workflowStages.id, createdStages[1].id))

    await db
      .update(workflowStages)
      .set({ dependsOnStages: [createdStages[1].id] })
      .where(eq(workflowStages.id, createdStages[2].id))

    await db
      .update(workflowStages)
      .set({ dependsOnStages: [createdStages[2].id] })
      .where(eq(workflowStages.id, createdStages[3].id))

    await db
      .update(workflowStages)
      .set({ dependsOnStages: [createdStages[3].id] })
      .where(eq(workflowStages.id, createdStages[4].id))

    await db
      .update(workflowStages)
      .set({ dependsOnStages: [createdStages[4].id] })
      .where(eq(workflowStages.id, createdStages[5].id))

    // 3. Create Document Requirements
    const documentRequirements_data = [
      // Stage 1: Application Setup Documents
      {
        stageId: createdStages[0].id, // Application Setup
        documentName: 'Completed Application Form',
        description: 'Official St. Kitts citizenship application form, fully completed and signed',
        category: 'legal',
        isRequired: true,
        isClientUploadable: false, // Advisor uploads after completion
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        expirationMonths: null,
        sortOrder: 1,
        displayGroup: 'Application Forms',
        helpText: 'This form will be completed by your advisor during the consultation process.',
      },

      // Stage 2: Document Collection - Personal Documents
      {
        stageId: createdStages[1].id, // Document Collection
        documentName: 'Current Passport (Bio-data Page)',
        description: 'Clear, high-quality scan of passport bio-data page showing personal details and photo',
        category: 'personal',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSizeMB: 10,
        expirationMonths: null, // Passport itself has expiration
        sortOrder: 1,
        displayGroup: 'Personal Identity',
        helpText: 'Ensure the scan is clear and all text is legible. Passport must be valid for at least 6 months.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Birth Certificate',
        description: 'Certified copy of birth certificate with apostille/authentication',
        category: 'personal',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: null,
        sortOrder: 2,
        displayGroup: 'Personal Identity',
        helpText: 'Must be an official certified copy with apostille or other authentication as required by your country.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Marriage Certificate (if applicable)',
        description: 'Certified copy of marriage certificate with apostille/authentication',
        category: 'personal',
        isRequired: false,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: null,
        sortOrder: 3,
        displayGroup: 'Personal Identity',
        helpText: 'Required only if married and including spouse in application.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Divorce Decree (if applicable)',
        description: 'Certified copy of divorce decree or legal separation documents',
        category: 'personal',
        isRequired: false,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: null,
        sortOrder: 4,
        displayGroup: 'Personal Identity',
        helpText: 'Required if previously married and now divorced.',
      },

      // Financial Documents
      {
        stageId: createdStages[1].id,
        documentName: 'Bank Statements (6 months)',
        description: 'Official bank statements from all accounts for the past 6 months',
        category: 'financial',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 25,
        expirationMonths: 3, // Bank statements become stale
        sortOrder: 5,
        displayGroup: 'Financial Documentation',
        helpText: 'Must be official statements directly from the bank, not online printouts. All pages required.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Source of Funds Documentation',
        description: 'Comprehensive documentation proving the legal source of investment funds',
        category: 'financial',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf', 'doc', 'docx'],
        maxFileSizeMB: 50,
        expirationMonths: 6,
        sortOrder: 6,
        displayGroup: 'Financial Documentation',
        helpText: 'May include business sale documents, employment records, investment returns, inheritance papers, etc.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Net Worth Statement',
        description: 'Detailed statement of assets and liabilities prepared by accountant or financial advisor',
        category: 'financial',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 15,
        expirationMonths: 6,
        sortOrder: 7,
        displayGroup: 'Financial Documentation',
        helpText: 'Should be prepared by a qualified accountant or financial professional.',
      },

      // Due Diligence Documents
      {
        stageId: createdStages[1].id,
        documentName: 'Police Clearance Certificate (Country of Birth)',
        description: 'Police clearance certificate from country of birth',
        category: 'legal',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: 6, // Usually valid for 6 months
        sortOrder: 8,
        displayGroup: 'Due Diligence',
        helpText: 'Must be issued within the last 6 months and cover the entire period of residence.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Police Clearance Certificate (Country of Residence)',
        description: 'Police clearance certificate from current country of residence (if different from birth country)',
        category: 'legal',
        isRequired: false, // Conditional
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: 6,
        sortOrder: 9,
        displayGroup: 'Due Diligence',
        helpText: 'Required if you have lived in a different country from your birth country for more than 12 months.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'Police Clearance Certificates (Other Countries)',
        description: 'Police clearance certificates from any other countries where you have lived for 12+ months',
        category: 'legal',
        isRequired: false, // Conditional
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 25,
        expirationMonths: 6,
        sortOrder: 10,
        displayGroup: 'Due Diligence',
        helpText: 'Required for each country where you have lived for 12 or more months since age 16.',
      },

      // Medical Documents
      {
        stageId: createdStages[1].id,
        documentName: 'Medical Certificate',
        description: 'Health certificate from licensed physician confirming good health',
        category: 'medical',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: 6,
        sortOrder: 11,
        displayGroup: 'Medical Documentation',
        helpText: 'Must be issued by a licensed physician and include standard health assessment.',
      },
      {
        stageId: createdStages[1].id,
        documentName: 'HIV Test Results',
        description: 'Recent HIV test results from certified medical facility',
        category: 'medical',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        expirationMonths: 3, // HIV tests are more time-sensitive
        sortOrder: 12,
        displayGroup: 'Medical Documentation',
        helpText: 'Test must be conducted within the last 3 months at a certified medical facility.',
      },

      // Stage 3: Investment Processing Documents
      {
        stageId: createdStages[2].id, // Investment Processing
        documentName: 'Real Estate Purchase Agreement',
        description: 'Signed purchase agreement for approved real estate investment (if choosing real estate option)',
        category: 'investment',
        isRequired: false, // Conditional based on investment choice
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 20,
        expirationMonths: null,
        sortOrder: 1,
        displayGroup: 'Investment Documentation',
        helpText: 'Required only if choosing the real estate investment option. Property must be government-approved.',
      },
      {
        stageId: createdStages[2].id,
        documentName: 'SISC Payment Confirmation',
        description: 'Proof of payment to the Sustainable Island State Contribution (if choosing SISC option)',
        category: 'investment',
        isRequired: false, // Conditional based on investment choice
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        expirationMonths: null,
        sortOrder: 2,
        displayGroup: 'Investment Documentation',
        helpText: 'Required only if choosing the SISC contribution option. Payment must be made to official government account.',
      },
      {
        stageId: createdStages[2].id,
        documentName: 'Investment Funds Transfer Documentation',
        description: 'Bank wire transfer receipts and confirmations for investment funds',
        category: 'investment',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 15,
        expirationMonths: null,
        sortOrder: 3,
        displayGroup: 'Investment Documentation',
        helpText: 'Must show the complete transfer of investment funds from your account to the required destination.',
      },

      // Stage 4: Government Submission Documents
      {
        stageId: createdStages[3].id, // Government Submission
        documentName: 'Government Application Package',
        description: 'Complete application package prepared for government submission',
        category: 'legal',
        isRequired: true,
        isClientUploadable: false, // Advisor prepares and uploads
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 100,
        expirationMonths: null,
        sortOrder: 1,
        displayGroup: 'Government Submission',
        helpText: 'This comprehensive package will be prepared by your advisor and includes all required forms and supporting documents.',
      },
      {
        stageId: createdStages[3].id,
        documentName: 'Government Fees Payment Receipt',
        description: 'Receipt confirming payment of all government processing fees',
        category: 'financial',
        isRequired: true,
        isClientUploadable: false, // Advisor handles government fee payments
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        expirationMonths: null,
        sortOrder: 2,
        displayGroup: 'Government Submission',
        helpText: 'Government processing fees will be handled by your advisor as part of the submission process.',
      },

      // Stage 5: Review & Processing (mostly government-side, few client documents)
      {
        stageId: createdStages[4].id, // Review & Processing
        documentName: 'Additional Documentation (if requested)',
        description: 'Any additional documents requested by the government during review process',
        category: 'legal',
        isRequired: false, // Conditional based on government requests
        isClientUploadable: true,
        acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png'],
        maxFileSizeMB: 50,
        expirationMonths: null,
        sortOrder: 1,
        displayGroup: 'Government Review',
        helpText: 'The government may request additional documentation during their review. We will notify you if anything is needed.',
      },

      // Stage 6: Approval & Completion
      {
        stageId: createdStages[5].id, // Approval & Completion
        documentName: 'Passport Photos',
        description: 'Professional passport-style photographs meeting St. Kitts requirements',
        category: 'personal',
        isRequired: true,
        isClientUploadable: true,
        acceptedFormats: ['jpg', 'jpeg', 'png'],
        maxFileSizeMB: 5,
        expirationMonths: 6,
        sortOrder: 1,
        displayGroup: 'Final Documentation',
        helpText: 'Photos must meet St. Kitts government specifications for passport/certificate photos.',
      },
      {
        stageId: createdStages[5].id,
        documentName: 'Oath of Allegiance',
        description: 'Signed oath of allegiance to St. Kitts and Nevis',
        category: 'legal',
        isRequired: true,
        isClientUploadable: false, // Part of final government process
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        expirationMonths: null,
        sortOrder: 2,
        displayGroup: 'Final Documentation',
        helpText: 'This will be completed as part of the final approval process with government officials.',
      },
    ]

    // Insert all document requirements
    for (const docReq of documentRequirements_data) {
      await db.insert(documentRequirements).values({
        programId,
        ...docReq,
      })
    }

    console.log(`✅ Created ${documentRequirements_data.length} document requirements`)

    console.log(`
🎉 St. Kitts workflow template successfully created!

📋 Summary:
- Program: St. Kitts and Nevis Citizenship by Investment
- Workflow Template: ${workflowTemplate.id}
- Stages: ${createdStages.length}
- Document Requirements: ${documentRequirements_data.length}
- Estimated Timeline: 6 months

🏗️ Workflow Stages:
1. Application Setup (5 days)
2. Document Collection (21 days) - ${documentRequirements_data.filter(d => d.stageId === createdStages[1].id).length} documents
3. Investment Processing (30 days) - ${documentRequirements_data.filter(d => d.stageId === createdStages[2].id).length} documents
4. Government Submission (7 days) - ${documentRequirements_data.filter(d => d.stageId === createdStages[3].id).length} documents
5. Review & Processing (120 days) - ${documentRequirements_data.filter(d => d.stageId === createdStages[4].id).length} documents
6. Approval & Completion (14 days) - ${documentRequirements_data.filter(d => d.stageId === createdStages[5].id).length} documents

✨ Features:
- Program-specific document requirements
- Stage-based workflow progression
- Conditional document requirements based on investment choice
- Client-uploadable vs advisor-managed documents
- Document expiration tracking
- Comprehensive help text for each requirement
`)

  } catch (error) {
    console.error('❌ Error seeding St. Kitts workflow:', error)
    throw error
  }
}

// Run the seed if this file is executed directly
if (require.main === module) {
  seedStKittsWorkflow()
    .then(() => {
      console.log('✅ St. Kitts workflow seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ St. Kitts workflow seeding failed:', error)
      process.exit(1)
    })
}