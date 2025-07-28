// Check what St. Kitts templates exist
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { programWorkflowTemplates } from '../db/schema'
import { like } from 'drizzle-orm'

config({ path: '.env.local' })

const neonSql = neon(process.env.DATABASE_URL!)
const db = drizzle(neonSql)

async function checkTemplates() {
  console.log('🔍 Checking existing workflow templates...')
  
  const templates = await db
    .select()
    .from(programWorkflowTemplates)
    
  console.log('Found templates:')
  templates.forEach(template => {
    console.log(`- "${template.templateName}" (ID: ${template.id})`)
  })
  
  const stKittsTemplates = await db
    .select()
    .from(programWorkflowTemplates)
    .where(like(programWorkflowTemplates.templateName, '%St. Kitts%'))
    
  console.log('\nSt. Kitts templates:')
  stKittsTemplates.forEach(template => {
    console.log(`- "${template.templateName}" (ID: ${template.id})`)
  })
}

checkTemplates()
  .then(() => process.exit(0))
  .catch(console.error)