// scripts/check-passport-requirement.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { 
  documentRequirements,
  crbiPrograms
} from '../db/schema'
import { eq, and, like } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function checkPassportRequirement() {
  try {
    console.log('🔍 Checking Passport Copy requirement...')
    
    // Find St. Kitts program
    const [stKittsProgram] = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, '334c527a-7696-4fc4-b756-645d478216cf'))
      .limit(1)
    
    if (stKittsProgram) {
      console.log('✅ St. Kitts Program found:', stKittsProgram.programName)
      
      // Find passport requirement
      const passportReqs = await db
        .select()
        .from(documentRequirements)
        .where(and(
          eq(documentRequirements.programId, stKittsProgram.id),
          like(documentRequirements.documentName, '%Passport%')
        ))
      
      console.log(`Found ${passportReqs.length} passport-related requirements:`)
      passportReqs.forEach((req, i) => {
        console.log(`${i + 1}. ${req.documentName}:`)
        console.log(`   - ID: ${req.id}`)
        console.log(`   - Accepted Formats: ${req.acceptedFormats}`)
        console.log(`   - Max File Size: ${req.maxFileSizeMB}MB`)
        console.log(`   - Category: ${req.category}`)
        console.log(`   - Stage ID: ${req.stageId}`)
      })
      
      // Also check all requirements for this program
      const allReqs = await db
        .select()
        .from(documentRequirements)
        .where(eq(documentRequirements.programId, stKittsProgram.id))
      
      console.log(`\nAll ${allReqs.length} requirements for St. Kitts:`)
      allReqs.forEach((req, i) => {
        console.log(`${i + 1}. ${req.documentName} - Formats: ${req.acceptedFormats}`)
      })
      
    } else {
      console.log('❌ St. Kitts program not found')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkPassportRequirement()