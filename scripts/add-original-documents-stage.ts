// Script to add Original Documents Collection stage to St. Kitts workflow
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { workflowStages, programWorkflowTemplates, documentRequirements, stageProgress, applications } from '../db/schema'
import { eq, and, sql } from 'drizzle-orm'

config({ path: '.env.local' })

const neonSql = neon(process.env.DATABASE_URL!)
const db = drizzle(neonSql)

async function addOriginalDocumentsStage() {
  console.log('🚀 Starting migration: Add Original Documents Collection stage')

  try {
    // Get the St. Kitts template
    const template = await db
      .select()
      .from(programWorkflowTemplates)
      .where(eq(programWorkflowTemplates.templateName, 'St. Kitts Standard Citizenship Process'))
      .limit(1)

    if (!template.length) {
      console.log('❌ St. Kitts workflow template not found')
      return
    }

    const templateId = template[0].id
    console.log('✅ Found St. Kitts template:', templateId)

    // Step 1: Update existing stage orders (shift stages 4, 5, 6 to 5, 6, 7)
    console.log('📝 Updating existing stage orders...')
    
    // Approval & Completion: 6 -> 7
    await db
      .update(workflowStages)
      .set({ stageOrder: 7 })
      .where(and(
        eq(workflowStages.templateId, templateId),
        eq(workflowStages.stageOrder, 6)
      ))

    // Review & Processing: 5 -> 6
    await db
      .update(workflowStages)
      .set({ stageOrder: 6 })
      .where(and(
        eq(workflowStages.templateId, templateId),
        eq(workflowStages.stageOrder, 5)
      ))

    // Government Submission: 4 -> 5
    await db
      .update(workflowStages)
      .set({ stageOrder: 5 })
      .where(and(
        eq(workflowStages.templateId, templateId),
        eq(workflowStages.stageOrder, 4)
      ))

    console.log('✅ Updated existing stage orders')

    // Step 2: Insert the new Original Documents Collection stage
    console.log('📝 Inserting new Original Documents Collection stage...')
    
    const [newStage] = await db
      .insert(workflowStages)
      .values({
        templateId: templateId,
        stageOrder: 4,
        stageName: 'Original Documents Collection',
        description: 'Collection and verification of original physical documents required for government submission',
        estimatedDays: 10,
        isRequired: true,
        canSkip: false,
        autoProgress: true
      })
      .returning({ id: workflowStages.id })

    console.log('✅ Created new stage:', newStage.id)

    // Step 3: Update template total stages count
    console.log('📝 Updating template total stages count...')
    
    await db
      .update(programWorkflowTemplates)
      .set({ totalStages: 7 })
      .where(eq(programWorkflowTemplates.id, templateId))

    console.log('✅ Updated template total stages to 7')

    // Step 4: Add stage progress for existing applications
    console.log('📝 Adding stage progress for existing applications...')
    
    const existingApplications = await db
      .select({ 
        id: applications.id, 
        status: applications.status,
        workflowTemplateId: applications.workflowTemplateId 
      })
      .from(applications)
      .where(eq(applications.workflowTemplateId, templateId))

    console.log(`📊 Found ${existingApplications.length} existing applications`)

    for (const app of existingApplications) {
      // Check if stage progress already exists for this stage
      const existingProgress = await db
        .select()
        .from(stageProgress)
        .where(and(
          eq(stageProgress.applicationId, app.id),
          eq(stageProgress.stageId, newStage.id)
        ))
        .limit(1)

      if (!existingProgress.length) {
        // Determine status based on application status
        let status = 'pending'
        let completionPercentage = '0.00'

        if (['ready_for_submission', 'submitted_to_government', 'under_review', 'approved', 'rejected'].includes(app.status)) {
          status = 'completed'
          completionPercentage = '100.00'
        }

        await db
          .insert(stageProgress)
          .values({
            applicationId: app.id,
            stageId: newStage.id,
            status: status,
            completionPercentage: completionPercentage
          })

        console.log(`✅ Added stage progress for application ${app.id} with status: ${status}`)
      }
    }

    console.log('🎉 Migration completed successfully!')
    console.log('📋 Summary:')
    console.log('  - Added Original Documents Collection stage (order 4)')
    console.log('  - Updated Government Submission to order 5')
    console.log('  - Updated Review & Processing to order 6')
    console.log('  - Updated Approval & Completion to order 7')
    console.log('  - Updated template total stages to 7')
    console.log(`  - Added stage progress for ${existingApplications.length} existing applications`)

  } catch (error) {
    console.error('❌ Migration failed:', error)
    throw error
  }
}

// Run the migration
addOriginalDocumentsStage()
  .then(() => {
    console.log('✅ Migration script completed')
    process.exit(0)
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error)
    process.exit(1)
  })