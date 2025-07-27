// scripts/seed-crbi-programs.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { crbiPrograms, documentTypes } from '../db/schema'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

const programs = [
  // Portugal Programs
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    programType: 'residency',
    programName: 'Golden Visa',
    minInvestment: '500000',
    processingTimeMonths: 6,
    requirements: {
      investment_options: ['real_estate', 'investment_fund', 'capital_transfer'],
      minimum_stay: '7 days per year',
      language_requirement: false,
      criminal_background_check: true
    }
  },
  {
    countryCode: 'PT',
    countryName: 'Portugal',
    programType: 'citizenship',
    programName: 'Citizenship by Investment',
    minInvestment: '1500000',
    processingTimeMonths: 24,
    requirements: {
      investment_options: ['real_estate', 'business_investment'],
      minimum_stay: '5 years residency',
      language_requirement: true,
      criminal_background_check: true
    }
  },

  // Cyprus Programs
  {
    countryCode: 'CY',
    countryName: 'Cyprus',
    programType: 'residency',
    programName: 'Permanent Residency',
    minInvestment: '300000',
    processingTimeMonths: 3,
    requirements: {
      investment_options: ['real_estate', 'business'],
      minimum_stay: '1 day every 2 years',
      language_requirement: false,
      criminal_background_check: true
    }
  },

  // Malta Programs
  {
    countryCode: 'MT',
    countryName: 'Malta',
    programType: 'citizenship',
    programName: 'Citizenship by Naturalisation',
    minInvestment: '750000',
    processingTimeMonths: 36,
    requirements: {
      investment_options: ['government_contribution', 'real_estate', 'government_bonds'],
      minimum_stay: '12 months',
      language_requirement: false,
      criminal_background_check: true,
      due_diligence: 'enhanced'
    }
  },
  {
    countryCode: 'MT',
    countryName: 'Malta',
    programType: 'residency',
    programName: 'Permanent Residency',
    minInvestment: '150000',
    processingTimeMonths: 6,
    requirements: {
      investment_options: ['government_contribution', 'real_estate'],
      minimum_stay: 'none',
      language_requirement: false,
      criminal_background_check: true
    }
  },

  // Greece Programs
  {
    countryCode: 'GR',
    countryName: 'Greece',
    programType: 'residency',
    programName: 'Golden Visa',
    minInvestment: '250000',
    processingTimeMonths: 3,
    requirements: {
      investment_options: ['real_estate'],
      minimum_stay: 'none',
      language_requirement: false,
      criminal_background_check: true
    }
  },

  // Spain Programs
  {
    countryCode: 'ES',
    countryName: 'Spain',
    programType: 'residency',
    programName: 'Golden Visa',
    minInvestment: '500000',
    processingTimeMonths: 4,
    requirements: {
      investment_options: ['real_estate', 'business', 'government_bonds'],
      minimum_stay: '1 day per year',
      language_requirement: false,
      criminal_background_check: true
    }
  },

  // Caribbean Programs
  {
    countryCode: 'AG',
    countryName: 'Antigua and Barbuda',
    programType: 'citizenship',
    programName: 'Citizenship by Investment',
    minInvestment: '230000',
    processingTimeMonths: 4,
    requirements: {
      investment_options: ['government_fund', 'real_estate', 'business'],
      minimum_stay: '5 days in 5 years',
      language_requirement: false,
      criminal_background_check: true
    }
  },
  {
    countryCode: 'DM',
    countryName: 'Dominica',
    programType: 'citizenship',
    programName: 'Citizenship by Investment',
    minInvestment: '200000',
    processingTimeMonths: 3,
    requirements: {
      investment_options: ['government_fund', 'real_estate'],
      minimum_stay: 'none',
      language_requirement: false,
      criminal_background_check: true
    }
  },
  {
    countryCode: 'GD',
    countryName: 'Grenada',
    programType: 'citizenship',
    programName: 'Citizenship by Investment',
    minInvestment: '235000',
    processingTimeMonths: 4,
    requirements: {
      investment_options: ['government_fund', 'real_estate'],
      minimum_stay: 'none',
      language_requirement: false,
      criminal_background_check: true,
      usa_visa_waiver: true
    }
  },
  {
    countryCode: 'KN',
    countryName: 'St. Kitts and Nevis',
    programType: 'citizenship',
    programName: 'Citizenship by Investment',
    minInvestment: '250000',
    processingTimeMonths: 6,
    requirements: {
      investment_options: ['government_fund', 'real_estate'],
      minimum_stay: 'none',
      language_requirement: false,
      criminal_background_check: true
    }
  }
]

const docTypes = [
  // Identity Documents
  { name: 'Passport', category: 'identity', description: 'Valid passport', isRequired: true },
  { name: 'National ID', category: 'identity', description: 'National identity card', isRequired: false },
  { name: 'Birth Certificate', category: 'identity', description: 'Official birth certificate', isRequired: true },
  { name: 'Marriage Certificate', category: 'identity', description: 'Marriage certificate (if applicable)', isRequired: false },
  
  // Financial Documents
  { name: 'Bank Statement', category: 'financial', description: 'Recent bank statements', isRequired: true },
  { name: 'Source of Funds', category: 'financial', description: 'Documentation of income source', isRequired: true },
  { name: 'Tax Returns', category: 'financial', description: 'Recent tax returns', isRequired: true },
  { name: 'Investment Portfolio', category: 'financial', description: 'Investment portfolio statements', isRequired: false },
  { name: 'Business Documents', category: 'financial', description: 'Business registration and financials', isRequired: false },
  
  // Legal Documents
  { name: 'Criminal Background Check', category: 'legal', description: 'Clean criminal record certificate', isRequired: true },
  { name: 'Due Diligence Report', category: 'legal', description: 'Enhanced due diligence report', isRequired: false },
  { name: 'Legal Representation', category: 'legal', description: 'Power of attorney documents', isRequired: false },
  
  // Medical Documents
  { name: 'Medical Certificate', category: 'medical', description: 'Clean bill of health', isRequired: false },
  { name: 'Health Insurance', category: 'medical', description: 'Health insurance coverage proof', isRequired: true },
  
  // Investment Documents
  { name: 'Property Purchase Agreement', category: 'investment', description: 'Real estate purchase documents', isRequired: false },
  { name: 'Investment Confirmation', category: 'investment', description: 'Proof of investment commitment', isRequired: true },
  { name: 'Valuation Report', category: 'investment', description: 'Property or investment valuation', isRequired: false }
]

async function seedDatabase() {
  try {
    console.log('🌱 Seeding CRBI programs...')
    
    // Check if programs already exist to prevent duplicates
    const existingPrograms = await db.select({ 
      countryCode: crbiPrograms.countryCode,
      programName: crbiPrograms.programName 
    }).from(crbiPrograms)
    
    const existingKeys = new Set(existingPrograms.map(p => `${p.countryCode}-${p.programName}`))
    
    // Filter out programs that already exist
    const newPrograms = programs.filter(program => {
      const key = `${program.countryCode}-${program.programName}`
      return !existingKeys.has(key)
    })
    
    if (newPrograms.length > 0) {
      await db.insert(crbiPrograms).values(newPrograms)
      console.log(`✅ Inserted ${newPrograms.length} new CRBI programs`)
    } else {
      console.log('✅ All CRBI programs already exist, skipping insertion')
    }
    
    if (newPrograms.length < programs.length) {
      console.log(`ℹ️  Skipped ${programs.length - newPrograms.length} programs that already exist`)
    }
    
    // Check document types
    const existingDocTypes = await db.select({ name: documentTypes.name }).from(documentTypes)
    const existingDocNames = new Set(existingDocTypes.map(d => d.name))
    
    const newDocTypes = docTypes.filter(docType => !existingDocNames.has(docType.name))
    
    if (newDocTypes.length > 0) {
      await db.insert(documentTypes).values(newDocTypes)
      console.log(`✅ Inserted ${newDocTypes.length} new document types`)
    } else {
      console.log('✅ All document types already exist, skipping insertion')
    }
    
    if (newDocTypes.length < docTypes.length) {
      console.log(`ℹ️  Skipped ${docTypes.length - newDocTypes.length} document types that already exist`)
    }
    
    console.log('🎉 Database seeded successfully!')
    
  } catch (error) {
    console.error('❌ Error seeding database:', error)
    process.exit(1)
  }
}

// Run the seed function
seedDatabase()