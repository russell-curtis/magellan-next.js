// scripts/seed-st-kitts-investment-options.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { crbiPrograms, investmentOptions } from '../db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function seedStKittsInvestmentOptions() {
  console.log('🇰🇳 Seeding St. Kitts & Nevis investment options...')

  try {
    // Find the St. Kitts and Nevis program
    const stKittsPrograms = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.countryCode, 'KN'))

    if (stKittsPrograms.length === 0) {
      console.log('❌ No St. Kitts & Nevis program found. Please ensure the program exists first.')
      return
    }

    const stKittsProgram = stKittsPrograms[0]
    console.log(`📋 Found program: ${stKittsProgram.programName}`)

    // Update the program with detailed information from the markdown
    await db
      .update(crbiPrograms)
      .set({
        programDetails: {
          overview: "The St. Kitts and Nevis CBI Program is one of the longest-running and most reputable in the world. Applicants can gain citizenship by making a qualifying economic contribution to the country through a government-approved investment.",
          applicationProcess: [
            "Engage an Authorized Agent - Applicants must use a government-authorized agent",
            "Select Investment Option - Choose from approved investment routes",
            "Prepare & Submit Documents - Complete forms C1-C4 and supporting documents",
            "Due Diligence & Interview - Multi-tiered background checks and mandatory interview",
            "Receive Approval-in-Principle - Conditional approval from CIU",
            "Complete Investment - Transfer funds or finalize real estate purchase",
            "Certificate & Passport - Receive citizenship certificate and passport",
            "Post-Citizenship Addition - Optional family member additions"
          ],
          timeline: {
            "Application & Diligence": "3-6 months",
            "Accelerated Option (AAP)": "~60 days", 
            "Investment Completion": "90 days max",
            "Certificate & Passport": "~2-3 weeks post-investment"
          },
          dueDiligenceFees: {
            mainApplicant: 10000,
            dependentOver16: 7500
          },
          processingFees: {
            passportFee: 350
          },
          postCitizenshipOptions: {
            spouse: 30000,
            childUnder3: 7500,
            otherDependents: "additional fees apply"
          },
          mandatoryRequirements: [
            "Government-authorized agent required",
            "Mandatory interview for applicants and dependents 16+",
            "Police clearance from all countries of residence (past 10 years)",
            "Medical certificates including HIV test",
            "Proof of source of funds"
          ]
        }
      })
      .where(eq(crbiPrograms.id, stKittsProgram.id))

    console.log('✅ Updated program details')

    // Define investment options based on the markdown documentation
    const investmentOptionsData = [
      {
        optionType: 'SISC',
        optionName: 'Sustainable Island State Contribution (SISC)',
        description: 'Non-refundable donation to the Sustainable Island State Contribution fund',
        baseAmount: '250000.00',
        familyPricing: {
          baseFamily: {
            amount: 250000,
            description: 'Single applicant or family of up to 4'
          },
          additionalChild: {
            amount: 25000,
            description: 'Each additional child'
          },
          additionalAdult: {
            amount: 50000,
            description: 'Each additional adult'
          }
        },
        holdingPeriod: null,
        conditions: {
          refundable: false,
          familyLimit: 4,
          additionalFees: 'Due diligence and processing fees apply'
        },
        eligibilityRequirements: {
          minimumAge: 18,
          characterRequirements: true,
          sourceOfFunds: true
        },
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Government-Approved Real Estate Investment',
        description: 'Investment in government-approved real estate development',
        baseAmount: '325000.00',
        familyPricing: {
          minimum: {
            amount: 325000,
            description: 'Minimum investment amount'
          }
        },
        holdingPeriod: 84, // 7 years in months
        conditions: {
          refundable: false,
          holdingPeriod: '7 years before resale',
          approvalRequired: 'Property must be government-approved',
          additionalFees: 'Due diligence and legal fees apply'
        },
        eligibilityRequirements: {
          minimumAge: 18,
          characterRequirements: true,
          sourceOfFunds: true,
          propertyApproval: true
        },
        sortOrder: 2
      },
      {
        optionType: 'Private Real Estate',
        optionName: 'Private Real Estate Investment',
        description: 'Investment in private real estate (condominium or single-family home)',
        baseAmount: '325000.00',
        familyPricing: {
          condominium: {
            amount: 325000,
            description: 'Minimum for condominium unit'
          },
          singleFamily: {
            amount: 600000,
            description: 'Minimum for single-family home'
          }
        },
        holdingPeriod: 84, // 7 years in months
        conditions: {
          refundable: false,
          holdingPeriod: '7 years title holding requirement',
          propertyTypes: ['condominium', 'single-family home'],
          additionalFees: 'Due diligence and legal fees apply'
        },
        eligibilityRequirements: {
          minimumAge: 18,
          characterRequirements: true,
          sourceOfFunds: true
        },
        sortOrder: 3
      },
      {
        optionType: 'Public Benefit',
        optionName: 'Public Benefit Option',
        description: 'Donation to a government-approved public benefit project',
        baseAmount: '250000.00',
        familyPricing: {
          donation: {
            amount: 250000,
            description: 'Fixed donation amount'
          }
        },
        holdingPeriod: null,
        conditions: {
          refundable: false,
          projectApproval: 'Must be government-approved project',
          additionalFees: 'Due diligence and processing fees apply'
        },
        eligibilityRequirements: {
          minimumAge: 18,
          characterRequirements: true,
          sourceOfFunds: true,
          projectApproval: true
        },
        sortOrder: 4
      }
    ]

    // Insert investment options
    for (const option of investmentOptionsData) {
      await db.insert(investmentOptions).values({
        programId: stKittsProgram.id,
        ...option
      })
      console.log(`✅ Added investment option: ${option.optionName}`)
    }

    console.log('🎉 Successfully seeded St. Kitts & Nevis investment options!')
    
  } catch (error) {
    console.error('❌ Error seeding investment options:', error)
    throw error
  }
}

// Run the seed function
if (require.main === module) {
  seedStKittsInvestmentOptions()
    .then(() => {
      console.log('✅ Seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}

export { seedStKittsInvestmentOptions }