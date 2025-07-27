// scripts/test-requirements.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { 
  applications,
  programWorkflowTemplates,
  workflowStages,
  documentRequirements,
  crbiPrograms
} from '../db/schema'
import { eq, and } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function testRequirements() {
  try {
    console.log('🔍 Testing document requirements for St. Kitts applications...')
    
    // Find St. Kitts program
    const [stKittsProgram] = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, '334c527a-7696-4fc4-b756-645d478216cf'))
      .limit(1)
    
    if (stKittsProgram) {
      console.log(`✅ St. Kitts Program: ${stKittsProgram.programName}`)
      
      // Check workflow template
      const [workflowTemplate] = await db
        .select()
        .from(programWorkflowTemplates)
        .where(eq(programWorkflowTemplates.programId, stKittsProgram.id))
        .limit(1)
      
      if (workflowTemplate) {
        console.log(`✅ Workflow Template: ${workflowTemplate.templateName}`)
        
        // Check stages
        const stages = await db
          .select()
          .from(workflowStages)
          .where(eq(workflowStages.templateId, workflowTemplate.id))
        
        console.log(`✅ Found ${stages.length} workflow stages`)
        
        // Check document requirements
        const requirements = await db
          .select()
          .from(documentRequirements)
          .where(eq(documentRequirements.programId, stKittsProgram.id))
        
        console.log(`✅ Found ${requirements.length} document requirements`)
        
        // Show first few requirements
        console.log('\nDocument Requirements:')
        requirements.slice(0, 5).forEach((req, i) => {
          console.log(`${i + 1}. ${req.documentName} (Stage: ${req.stageId}, Required: ${req.isRequired})`)
        })
        
        // Test the API logic for a specific application
        const testApplicationId = '538a937e-c962-4293-8129-6874ac6dc45a'
        console.log(`\n🔍 Testing API logic for application: ${testApplicationId}`)
        
        const [application] = await db
          .select()
          .from(applications)
          .where(eq(applications.id, testApplicationId))
          .limit(1)
        
        if (application) {
          console.log(`✅ Application found: ${application.applicationNumber}, Program: ${application.programId}`)
          
          // Get workflow template for this application's program
          const [appWorkflowTemplate] = await db
            .select()
            .from(programWorkflowTemplates)
            .where(and(
              eq(programWorkflowTemplates.programId, application.programId),
              eq(programWorkflowTemplates.isActive, true)
            ))
            .limit(1)
          
          if (appWorkflowTemplate) {
            console.log(`✅ App Workflow Template: ${appWorkflowTemplate.templateName}`)
            
            // Get stages for this template
            const appStages = await db
              .select()
              .from(workflowStages)
              .where(eq(workflowStages.templateId, appWorkflowTemplate.id))
            
            console.log(`✅ App has ${appStages.length} stages`)
            
            // Get document requirements for this program
            const appRequirements = await db
              .select()
              .from(documentRequirements)
              .where(eq(documentRequirements.programId, application.programId))
            
            console.log(`✅ App has ${appRequirements.length} document requirements`)
            
            // Group requirements by stage
            const stagesWithRequirements = appStages.map(stage => {
              const stageReqs = appRequirements.filter(req => req.stageId === stage.id)
              return {
                stageName: stage.stageName,
                requirementCount: stageReqs.length,
                requirements: stageReqs.map(r => ({ id: r.id, name: r.documentName }))
              }
            })
            
            console.log('\nStages with Requirements:')
            stagesWithRequirements.forEach(stage => {
              console.log(`- ${stage.stageName}: ${stage.requirementCount} requirements`)
              stage.requirements.forEach(req => {
                console.log(`  * ${req.name} (${req.id})`)
              })
            })
          }
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testRequirements()