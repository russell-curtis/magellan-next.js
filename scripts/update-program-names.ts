// scripts/update-program-names.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { crbiPrograms } from '../db/schema'
import { eq, and } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

const programUpdates = [
  // Update existing programs to new naming convention
  { old: 'Portugal Golden Visa', new: 'Golden Visa', country: 'PT' },
  { old: 'Portugal Citizenship by Investment', new: 'Citizenship by Investment', country: 'PT' },
  { old: 'Cyprus Permanent Residency', new: 'Permanent Residency', country: 'CY' },
  { old: 'Malta Citizenship by Naturalisation', new: 'Citizenship by Naturalisation', country: 'MT' },
  { old: 'Malta Permanent Residency', new: 'Permanent Residency', country: 'MT' },
  { old: 'Greece Golden Visa', new: 'Golden Visa', country: 'GR' },
  { old: 'Spain Golden Visa', new: 'Golden Visa', country: 'ES' },
  { old: 'Antigua Citizenship by Investment', new: 'Citizenship by Investment', country: 'AG' },
  { old: 'Dominica Citizenship by Investment', new: 'Citizenship by Investment', country: 'DM' },
  { old: 'Grenada Citizenship by Investment', new: 'Citizenship by Investment', country: 'GD' },
  { old: 'St. Kitts Citizenship by Investment', new: 'Citizenship by Investment', country: 'KN' }
]

async function updateProgramNames() {
  try {
    console.log('🔄 Updating program names...')
    
    // First, clean up any duplicates created by the seed script
    console.log('🧹 Cleaning up duplicates first...')
    
    for (const update of programUpdates) {
      const allPrograms = await db
        .select()
        .from(crbiPrograms)
        .where(eq(crbiPrograms.countryCode, update.country))
      
      const oldPrograms = allPrograms.filter(p => p.programName === update.old)
      const newPrograms = allPrograms.filter(p => p.programName === update.new)
      
      if (newPrograms.length > 0 && oldPrograms.length > 0) {
        // Remove the new duplicates, keep the old ones (we'll rename them)
        for (const newProgram of newPrograms) {
          await db
            .delete(crbiPrograms)
            .where(eq(crbiPrograms.id, newProgram.id))
          console.log(`🗑️  Removed duplicate new program: ${update.country} - ${update.new}`)
        }
      } else if (newPrograms.length > 1) {
        // Remove extra new programs
        const toDelete = newPrograms.slice(1)
        for (const duplicate of toDelete) {
          await db
            .delete(crbiPrograms)
            .where(eq(crbiPrograms.id, duplicate.id))
          console.log(`🗑️  Removed duplicate: ${update.country} - ${update.new}`)
        }
      }
    }
    
    // Now update the old program names
    for (const update of programUpdates) {
      const [oldProgram] = await db
        .select()
        .from(crbiPrograms)
        .where(and(
          eq(crbiPrograms.countryCode, update.country),
          eq(crbiPrograms.programName, update.old)
        ))
        .limit(1)
      
      if (oldProgram) {
        // Update the program name
        await db
          .update(crbiPrograms)
          .set({ programName: update.new })
          .where(and(
            eq(crbiPrograms.countryCode, update.country),
            eq(crbiPrograms.programName, update.old)
          ))
        
        console.log(`✅ Updated: ${update.country} - ${update.old} → ${update.new}`)
      } else {
        console.log(`ℹ️  Skipped: ${update.country} - ${update.old} (not found)`)
      }
    }
    
    console.log('🎉 Program names updated successfully!')
    
  } catch (error) {
    console.error('❌ Error updating program names:', error)
    process.exit(1)
  }
}

// Run the update function
updateProgramNames()