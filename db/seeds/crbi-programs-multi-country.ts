// Multi-Country CRBI Programs Seed Data
// Based on 2024-2025 market research and digital integration capabilities

import { db } from '../drizzle'
import { crbiPrograms, investmentOptions } from '../schema'

// ============================================================================
// CRBI PROGRAMS DATA (2024-2025)
// ============================================================================

export const multiCountryCRBIPrograms = [
  // EUROPEAN GOLDEN VISA PROGRAMS
  {
    programName: 'Portugal Golden Visa',
    countryCode: 'PT',
    countryName: 'Portugal',
    programType: 'residency_by_investment',
    description: 'Portuguese residence permit through investment with path to citizenship in 5 years',
    minInvestment: 250000, // €250K for investment funds
    maxInvestment: 1500000, // €1.5M for business investment
    processingTimeMonths: 12, // 10-12 months average
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'full', // full, partial, none
    investmentOptions: [
      {
        optionType: 'Investment Fund',
        optionName: 'Qualified Investment Fund',
        description: 'Investment in Portuguese investment funds or venture capital funds',
        baseAmount: 250000,
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Real Estate Investment',
        description: 'Purchase of real estate property for residential rehabilitation',
        baseAmount: 400000,
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 2
      },
      {
        optionType: 'Business Investment',
        optionName: 'Business Creation/Job Creation',
        description: 'Creation of business activity with job creation (10+ jobs)',
        baseAmount: 500000,
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 3
      }
    ]
  },
  {
    programName: 'Greece Golden Visa',
    countryCode: 'GR',
    countryName: 'Greece',
    programType: 'residency_by_investment',
    description: 'Greek residence permit through real estate or other qualifying investments',
    minInvestment: 400000, // €400K in most areas
    maxInvestment: 800000, // €800K in Athens/Thessaloniki
    processingTimeMonths: 9, // 8-10 months average
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'full',
    investmentOptions: [
      {
        optionType: 'Real Estate',
        optionName: 'Real Estate Investment (General)',
        description: 'Purchase of real estate property outside Athens/Thessaloniki',
        baseAmount: 400000,
        holdingPeriod: 60, // 5 years minimum holding
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Real Estate Investment (Athens/Thessaloniki)',
        description: 'Purchase of real estate in Athens, Thessaloniki, or islands',
        baseAmount: 800000,
        holdingPeriod: 60, // 5 years minimum holding
        isActive: true,
        sortOrder: 2
      },
      {
        optionType: 'Government Bonds',
        optionName: 'Greek Government Bonds',
        description: 'Purchase of Greek government bonds or corporate bonds',
        baseAmount: 400000,
        holdingPeriod: 36, // 3 years
        isActive: true,
        sortOrder: 3
      }
    ]
  },
  
  // CARIBBEAN CBI PROGRAMS
  {
    programName: 'Grenada Citizenship by Investment',
    countryCode: 'GD',
    countryName: 'Grenada',
    programType: 'citizenship_by_investment',
    description: '#1 ranked CBI program with E-2 visa treaty access to USA',
    minInvestment: 150000, // $150K donation
    maxInvestment: 400000, // $400K real estate
    processingTimeMonths: 6, // 6 months average
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'full',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'National Transformation Fund',
        description: 'Non-refundable contribution to National Transformation Fund',
        baseAmount: 150000,
        familyPricing: {
          'spouse': 25000,
          'child_under_18': 25000,
          'child_18_30': 50000,
          'parent_over_65': 50000
        },
        holdingPeriod: 0, // No holding period for donations
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Approved Real Estate Investment',
        description: 'Investment in government-approved real estate project',
        baseAmount: 270000, // Minimum for real estate route
        holdingPeriod: 84, // 7 years holding period
        isActive: true,
        sortOrder: 2
      }
    ]
  },
  {
    programName: 'St. Lucia Citizenship by Investment',
    countryCode: 'LC',
    countryName: 'Saint Lucia',
    programType: 'citizenship_by_investment',
    description: '#2 ranked CBI program with strong family options and fast processing',
    minInvestment: 100000, // $100K donation for single applicant
    maxInvestment: 300000, // $300K real estate
    processingTimeMonths: 6, // 6 months average
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'partial',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'National Economic Fund',
        description: 'Non-refundable contribution to National Economic Fund',
        baseAmount: 100000,
        familyPricing: {
          'spouse': 25000,
          'child_under_18': 10000,
          'child_18_25': 25000,
          'parent_over_65': 25000
        },
        holdingPeriod: 0,
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Approved Real Estate',
        description: 'Investment in approved tourism or real estate project',
        baseAmount: 300000,
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 2
      }
    ]
  },
  {
    programName: 'Antigua & Barbuda Citizenship by Investment',
    countryCode: 'AG',
    countryName: 'Antigua and Barbuda',
    programType: 'citizenship_by_investment',
    description: 'Most affordable CBI program for families with multiple investment routes',
    minInvestment: 100000, // $100K donation
    maxInvestment: 400000, // $400K real estate
    processingTimeMonths: 6, // 6 months average
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'partial',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'National Development Fund',
        description: 'Non-refundable contribution to National Development Fund',
        baseAmount: 100000,
        familyPricing: {
          'family_of_4': 100000, // Special family rate
          'additional_dependent': 25000
        },
        holdingPeriod: 0,
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Approved Real Estate Investment',
        description: 'Investment in approved real estate development',
        baseAmount: 325000, // Increased from $200K in 2024
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 2
      },
      {
        optionType: 'Business Investment',
        optionName: 'Business Investment',
        description: 'Investment in approved business with job creation',
        baseAmount: 400000,
        holdingPeriod: 60, // 5 years
        isActive: true,
        sortOrder: 3
      }
    ]
  },
  {
    programName: 'Dominica Citizenship by Investment',
    countryCode: 'DM',
    countryName: 'Dominica',
    programType: 'citizenship_by_investment',
    description: 'Established CBI program with competitive pricing and nature-focused investment',
    minInvestment: 100000, // $100K donation
    maxInvestment: 200000, // $200K real estate
    processingTimeMonths: 8, // 6-9 months
    isActive: true,
    hasDigitalPortal: false,
    portalIntegrationLevel: 'none',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'Economic Diversification Fund',
        description: 'Contribution to Economic Diversification Fund',
        baseAmount: 100000,
        familyPricing: {
          'spouse': 25000,
          'child_under_18': 25000,
          'child_18_25': 50000
        },
        holdingPeriod: 0,
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Approved Real Estate',
        description: 'Investment in approved tourism or real estate project',
        baseAmount: 200000,
        holdingPeriod: 36, // 3 years
        isActive: true,
        sortOrder: 2
      }
    ]
  },
  {
    programName: 'St. Kitts & Nevis Citizenship by Investment',
    countryCode: 'KN',
    countryName: 'Saint Kitts and Nevis',
    programType: 'citizenship_by_investment',
    description: 'The original and fastest CBI program with excellent reputation',
    minInvestment: 250000, // $250K donation
    maxInvestment: 400000, // $400K real estate
    processingTimeMonths: 4, // 4 months - fastest processing
    isActive: true,
    hasDigitalPortal: true,
    portalIntegrationLevel: 'full',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'Sustainable Island State Contribution (SISC)',
        description: 'Non-refundable contribution to SISC fund',
        baseAmount: 250000,
        familyPricing: {
          'spouse': 25000,
          'child_under_18': 10000,
          'child_18_25': 25000
        },
        holdingPeriod: 0,
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Real Estate',
        optionName: 'Approved Real Estate Investment',
        description: 'Investment in approved real estate project',
        baseAmount: 400000,
        holdingPeriod: 84, // 7 years
        isActive: true,
        sortOrder: 2
      }
    ]
  },
  {
    programName: 'Vanuatu Citizenship by Investment',
    countryCode: 'VU',
    countryName: 'Vanuatu',
    programType: 'citizenship_by_investment',
    description: 'Fastest CBI program globally with 2-3 months processing time',
    minInvestment: 130000, // $130K contribution
    maxInvestment: 180000, // Family rates
    processingTimeMonths: 3, // 2-3 months - fastest globally
    isActive: true,
    hasDigitalPortal: false,
    portalIntegrationLevel: 'none',
    investmentOptions: [
      {
        optionType: 'Donation',
        optionName: 'Development Support Program',
        description: 'Contribution to Vanuatu Development Support Program',
        baseAmount: 130000,
        familyPricing: {
          'family_up_to_4': 130000, // Flat rate for families up to 4
          'additional_dependent': 25000
        },
        holdingPeriod: 0,
        isActive: true,
        sortOrder: 1
      }
    ]
  },

  // ADDITIONAL PROGRAMS
  {
    programName: 'Turkey Citizenship by Investment',
    countryCode: 'TR',
    countryName: 'Turkey',
    programType: 'citizenship_by_investment',
    description: 'European-positioned CBI program with real estate investment focus',
    minInvestment: 400000, // $400K real estate
    maxInvestment: 1000000, // Various investment routes
    processingTimeMonths: 8, // 6-10 months
    isActive: true,
    hasDigitalPortal: false,
    portalIntegrationLevel: 'none',
    investmentOptions: [
      {
        optionType: 'Real Estate',
        optionName: 'Real Estate Investment',
        description: 'Purchase of real estate with minimum value of $400,000',
        baseAmount: 400000,
        holdingPeriod: 36, // 3 years holding period
        isActive: true,
        sortOrder: 1
      },
      {
        optionType: 'Bank Deposit',
        optionName: 'Bank Deposit',
        description: 'Deposit in Turkish bank with 3-year commitment',
        baseAmount: 500000,
        holdingPeriod: 36, // 3 years
        isActive: true,
        sortOrder: 2
      }
    ]
  }
]

// ============================================================================
// SEED FUNCTION
// ============================================================================

export async function seedMultiCountryCRBIPrograms() {
  console.log('🌍 Seeding multi-country CRBI programs...')

  try {
    for (const programData of multiCountryCRBIPrograms) {
      const { investmentOptions: optionsData, ...programInfo } = programData

      // Insert program
      const [program] = await db.insert(crbiPrograms).values({
        programName: programInfo.programName,
        countryCode: programInfo.countryCode,
        countryName: programInfo.countryName,
        programType: programInfo.programType,
        description: programInfo.description,
        minInvestment: programInfo.minInvestment,
        maxInvestment: programInfo.maxInvestment,
        processingTimeMonths: programInfo.processingTimeMonths,
        isActive: programInfo.isActive,
        // Additional metadata
        metadata: {
          hasDigitalPortal: programInfo.hasDigitalPortal,
          portalIntegrationLevel: programInfo.portalIntegrationLevel,
          lastUpdated: new Date().toISOString(),
          source: 'multi-country-seed-2025'
        }
      }).returning()

      // Insert investment options
      if (optionsData && optionsData.length > 0) {
        const investmentOptionsToInsert = optionsData.map(option => ({
          programId: program.id,
          optionType: option.optionType,
          optionName: option.optionName,
          description: option.description,
          baseAmount: option.baseAmount,
          familyPricing: option.familyPricing || null,
          holdingPeriod: option.holdingPeriod,
          isActive: option.isActive,
          sortOrder: option.sortOrder
        }))

        await db.insert(investmentOptions).values(investmentOptionsToInsert)
      }

      console.log(`✓ Added ${programInfo.programName} with ${optionsData?.length || 0} investment options`)
    }

    console.log(`🎉 Successfully seeded ${multiCountryCRBIPrograms.length} CRBI programs`)
    
    // Log summary
    const europeanPrograms = multiCountryCRBIPrograms.filter(p => ['PT', 'GR'].includes(p.countryCode))
    const caribbeanPrograms = multiCountryCRBIPrograms.filter(p => ['GD', 'LC', 'AG', 'DM', 'KN', 'VU'].includes(p.countryCode))
    const otherPrograms = multiCountryCRBIPrograms.filter(p => !['PT', 'GR', 'GD', 'LC', 'AG', 'DM', 'KN', 'VU'].includes(p.countryCode))
    
    console.log(`📊 Summary:`)
    console.log(`   European Programs: ${europeanPrograms.length}`)
    console.log(`   Caribbean Programs: ${caribbeanPrograms.length}`)
    console.log(`   Other Programs: ${otherPrograms.length}`)
    console.log(`   Digital Portal Integration: ${multiCountryCRBIPrograms.filter(p => p.hasDigitalPortal).length}/${multiCountryCRBIPrograms.length}`)

  } catch (error) {
    console.error('❌ Error seeding multi-country CRBI programs:', error)
    throw error
  }
}

// Execute seeding if run directly
if (require.main === module) {
  seedMultiCountryCRBIPrograms()
    .then(() => {
      console.log('✅ Multi-country CRBI programs seeding completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error)
      process.exit(1)
    })
}