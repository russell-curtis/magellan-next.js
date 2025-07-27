// scripts/reset-st-kitts-workflow.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { 
  crbiPrograms,
  programWorkflowTemplates,
  workflowStages,
  documentRequirements
} from '../db/schema'
import { eq, and } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function resetStKittsWorkflow() {
  try {
    console.log('🧹 Resetting St. Kitts workflow...')
    
    // Find St. Kitts program
    const [stKittsProgram] = await db
      .select()
      .from(crbiPrograms)
      .where(and(
        eq(crbiPrograms.countryCode, 'KN'),
        eq(crbiPrograms.programName, 'Citizenship by Investment')
      ))
      .limit(1)
    
    if (!stKittsProgram) {
      console.error('❌ St. Kitts program not found')
      process.exit(1)
    }
    
    console.log('✅ Found St. Kitts program:', stKittsProgram.id)
    
    // Delete existing document requirements for this program
    await db.delete(documentRequirements).where(eq(documentRequirements.programId, stKittsProgram.id))
    console.log('🗑️ Deleted existing document requirements')
    
    // Delete existing workflow stages and templates
    const existingTemplates = await db
      .select()
      .from(programWorkflowTemplates)
      .where(eq(programWorkflowTemplates.programId, stKittsProgram.id))
    
    for (const template of existingTemplates) {
      await db.delete(workflowStages).where(eq(workflowStages.templateId, template.id))
      console.log(`🗑️ Deleted stages for template: ${template.templateName}`)
    }
    
    await db.delete(programWorkflowTemplates).where(eq(programWorkflowTemplates.programId, stKittsProgram.id))
    console.log('🗑️ Deleted existing workflow templates')
    
    // Create new workflow template
    const [newTemplate] = await db
      .insert(programWorkflowTemplates)
      .values({
        programId: stKittsProgram.id,
        templateName: 'St. Kitts Standard Citizenship Process',
        description: 'Complete 6-stage citizenship by investment workflow for St. Kitts and Nevis',
        version: 1,
        isActive: true,
        totalStages: 6,
        estimatedTimeMonths: 6,
        createdBy: 'system'
      })
      .returning()
    
    console.log('✅ Created new workflow template:', newTemplate.id)
    
    // Create workflow stages
    const stages = [
      {
        templateId: newTemplate.id,
        stageOrder: 1,
        stageName: 'Initial Documentation',
        description: 'Submit personal identity and basic documentation',
        estimatedDays: 14,
        isRequired: true,
        canSkip: false,
        autoProgress: false
      },
      {
        templateId: newTemplate.id,
        stageOrder: 2,
        stageName: 'Financial Documentation',
        description: 'Provide proof of funds and source of wealth documentation',
        estimatedDays: 21,
        isRequired: true,
        canSkip: false,
        autoProgress: false
      },
      {
        templateId: newTemplate.id,
        stageOrder: 3,
        stageName: 'Due Diligence',
        description: 'Background checks and compliance verification',
        estimatedDays: 30,
        isRequired: true,
        canSkip: false,
        autoProgress: true
      },
      {
        templateId: newTemplate.id,
        stageOrder: 4,
        stageName: 'Investment Selection',
        description: 'Choose and document investment option (SIDF or Real Estate)',
        estimatedDays: 14,
        isRequired: true,
        canSkip: false,
        autoProgress: false
      },
      {
        templateId: newTemplate.id,
        stageOrder: 5,
        stageName: 'Government Submission',
        description: 'Official application submission to St. Kitts CIU',
        estimatedDays: 7,
        isRequired: true,
        canSkip: false,
        autoProgress: true
      },
      {
        templateId: newTemplate.id,
        stageOrder: 6,
        stageName: 'Citizenship Completion',
        description: 'Passport issuance and final documentation',
        estimatedDays: 30,
        isRequired: true,
        canSkip: false,
        autoProgress: true
      }
    ]
    
    const insertedStages = await db
      .insert(workflowStages)
      .values(stages)
      .returning()
    
    console.log(`✅ Created ${insertedStages.length} workflow stages`)
    
    // Create document requirements for each stage
    const documentRequirementsData = [
      // Stage 1: Initial Documentation
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[0].id,
        documentName: 'Passport Copy',
        description: 'Certified copy of valid passport (all pages)',
        category: 'personal',
        isRequired: true,
        acceptedFormats: ['pdf', 'jpg', 'png'],
        maxFileSizeMB: 5,
        examples: ['passport-main-page.pdf', 'passport-all-pages.pdf'],
        validationRules: { 'min_validity_months': 6 }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[0].id,
        documentName: 'Birth Certificate',
        description: 'Official birth certificate with apostille',
        category: 'personal',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['birth-certificate-apostilled.pdf'],
        validationRules: { 'requires_apostille': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[0].id,
        documentName: 'Marriage Certificate',
        description: 'Marriage certificate with apostille (if applicable)',
        category: 'personal',
        isRequired: false,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['marriage-certificate-apostilled.pdf'],
        validationRules: { 'requires_apostille': true }
      },
      
      // Stage 2: Financial Documentation
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[1].id,
        documentName: 'Bank Statements',
        description: 'Last 6 months of bank statements from all accounts',
        category: 'financial',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        examples: ['bank-statements-6months.pdf'],
        validationRules: { 'months_required': 6, 'must_be_recent': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[1].id,
        documentName: 'Source of Funds Letter',
        description: 'Detailed letter explaining source of investment funds',
        category: 'financial',
        isRequired: true,
        acceptedFormats: ['pdf', 'doc', 'docx'],
        maxFileSizeMB: 5,
        examples: ['source-of-funds-letter.pdf'],
        validationRules: { 'must_be_detailed': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[1].id,
        documentName: 'Tax Returns',
        description: 'Last 2 years of personal tax returns',
        category: 'financial',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        examples: ['tax-returns-2years.pdf'],
        validationRules: { 'years_required': 2 }
      },
      
      // Stage 3: Due Diligence
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[2].id,
        documentName: 'Criminal Background Check',
        description: 'Police clearance certificate from country of residence and citizenship',
        category: 'legal',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['police-clearance-apostilled.pdf'],
        validationRules: { 'max_age_months': 6, 'requires_apostille': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[2].id,
        documentName: 'Professional References',
        description: 'Character references from professionals (lawyer, accountant, etc.)',
        category: 'legal',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['professional-references.pdf'],
        validationRules: { 'minimum_references': 2 }
      },
      
      // Stage 4: Investment Selection
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[3].id,
        documentName: 'Investment Choice Declaration',
        description: 'Formal declaration of chosen investment option (SIDF or Real Estate)',
        category: 'investment',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['investment-choice-sidf.pdf', 'investment-choice-realestate.pdf'],
        validationRules: { 'requires_signature': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[3].id,
        documentName: 'Investment Proof',
        description: 'Proof of investment commitment (SIDF receipt or real estate contract)',
        category: 'investment',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 10,
        examples: ['sidf-payment-receipt.pdf', 'real-estate-contract.pdf'],
        validationRules: { 'must_meet_minimum': true }
      },
      
      // Stage 5: Government Submission
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[4].id,
        documentName: 'CIU Application Form',
        description: 'Official government application form (completed by agent)',
        category: 'legal',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['ciu-application-form.pdf'],
        validationRules: { 'agent_only': true }
      },
      
      // Stage 6: Citizenship Completion
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[5].id,
        documentName: 'Citizenship Certificate',
        description: 'Official citizenship certificate issued by St. Kitts government',
        category: 'legal',
        isRequired: true,
        acceptedFormats: ['pdf'],
        maxFileSizeMB: 5,
        examples: ['citizenship-certificate.pdf'],
        validationRules: { 'government_issued': true }
      },
      {
        programId: stKittsProgram.id,
        stageId: insertedStages[5].id,
        documentName: 'St. Kitts Passport',
        description: 'New St. Kitts and Nevis passport',
        category: 'personal',
        isRequired: true,
        acceptedFormats: ['pdf', 'jpg'],
        maxFileSizeMB: 5,
        examples: ['st-kitts-passport-copy.pdf'],
        validationRules: { 'government_issued': true }
      }
    ]
    
    const insertedRequirements = await db
      .insert(documentRequirements)
      .values(documentRequirementsData)
      .returning()
    
    console.log(`✅ Created ${insertedRequirements.length} document requirements`)
    
    console.log('🎉 St. Kitts workflow reset and recreated successfully!')
    
  } catch (error) {
    console.error('❌ Error resetting St. Kitts workflow:', error)
    process.exit(1)
  }
}

resetStKittsWorkflow()