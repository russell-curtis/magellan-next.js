// CRBI Programs Management API
// Admin endpoints for managing multi-country CRBI programs and portal integrations

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { users, crbiPrograms, investmentOptions } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { governmentPortalRegistry } from '@/lib/services/government-portal-integration'

// ============================================================================
// GET - List all CRBI programs with portal status
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can access program management
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const includeOptions = searchParams.get('include_options') === 'true'
    const programType = searchParams.get('type') // filter by program type
    const countryCode = searchParams.get('country') // filter by country
    const portalIntegration = searchParams.get('portal') // filter by portal availability

    // Build query conditions
    const conditions = []
    if (programType) {
      conditions.push(eq(crbiPrograms.programType, programType))
    }
    if (countryCode) {
      conditions.push(eq(crbiPrograms.countryCode, countryCode.toUpperCase()))
    }

    // Get programs
    const programs = await db
      .select({
        id: crbiPrograms.id,
        programName: crbiPrograms.programName,
        countryCode: crbiPrograms.countryCode,
        countryName: crbiPrograms.countryName,
        programType: crbiPrograms.programType,
        description: crbiPrograms.description,
        minInvestment: crbiPrograms.minInvestment,
        maxInvestment: crbiPrograms.maxInvestment,
        processingTimeMonths: crbiPrograms.processingTimeMonths,
        isActive: crbiPrograms.isActive,
        metadata: crbiPrograms.metadata,
        createdAt: crbiPrograms.createdAt
      })
      .from(crbiPrograms)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(crbiPrograms.createdAt))

    // Get investment options if requested
    let programsWithOptions = programs
    if (includeOptions) {
      programsWithOptions = await Promise.all(
        programs.map(async (program) => {
          const options = await db
            .select({
              id: investmentOptions.id,
              optionType: investmentOptions.optionType,
              optionName: investmentOptions.optionName,
              description: investmentOptions.description,
              baseAmount: investmentOptions.baseAmount,
              familyPricing: investmentOptions.familyPricing,
              holdingPeriod: investmentOptions.holdingPeriod,
              isActive: investmentOptions.isActive,
              sortOrder: investmentOptions.sortOrder
            })
            .from(investmentOptions)
            .where(eq(investmentOptions.programId, program.id))
            .orderBy(investmentOptions.sortOrder)

          return {
            ...program,
            investmentOptions: options
          }
        })
      )
    }

    // Get portal integration status
    const registeredPortals = governmentPortalRegistry.getRegisteredPortals()
    const portalMap = new Map(registeredPortals.map(p => [p.countryCode, p]))

    // Enhance programs with portal status
    const enhancedPrograms = programsWithOptions.map(program => {
      const portal = portalMap.get(program.countryCode)
      const hasDigitalPortal = program.metadata?.hasDigitalPortal === true
      const portalIntegrationLevel = program.metadata?.portalIntegrationLevel || 'none'
      
      return {
        ...program,
        portalStatus: {
          hasDigitalPortal,
          portalIntegrationLevel,
          isPortalRegistered: !!portal,
          portalName: portal?.portalName || null,
          portalStatus: portal?.status || 'not_available'
        }
      }
    })

    // Apply portal integration filter if specified
    const filteredPrograms = portalIntegration 
      ? enhancedPrograms.filter(p => {
          switch (portalIntegration) {
            case 'available':
              return p.portalStatus.hasDigitalPortal
            case 'integrated':
              return p.portalStatus.isPortalRegistered
            case 'none':
              return !p.portalStatus.hasDigitalPortal
            default:
              return true
          }
        })
      : enhancedPrograms

    // Generate statistics
    const stats = {
      totalPrograms: filteredPrograms.length,
      byType: {
        citizenship: filteredPrograms.filter(p => p.programType === 'citizenship_by_investment').length,
        residency: filteredPrograms.filter(p => p.programType === 'residency_by_investment').length
      },
      byRegion: {
        europe: filteredPrograms.filter(p => ['PT', 'GR', 'MT', 'TR'].includes(p.countryCode)).length,
        caribbean: filteredPrograms.filter(p => ['GD', 'LC', 'AG', 'DM', 'KN', 'VU'].includes(p.countryCode)).length,
        other: filteredPrograms.filter(p => !['PT', 'GR', 'MT', 'TR', 'GD', 'LC', 'AG', 'DM', 'KN', 'VU'].includes(p.countryCode)).length
      },
      portalIntegration: {
        withPortals: filteredPrograms.filter(p => p.portalStatus.hasDigitalPortal).length,
        integrated: filteredPrograms.filter(p => p.portalStatus.isPortalRegistered).length,
        noPortals: filteredPrograms.filter(p => !p.portalStatus.hasDigitalPortal).length
      },
      investmentRanges: {
        under_200k: filteredPrograms.filter(p => p.minInvestment < 200000).length,
        '200k_500k': filteredPrograms.filter(p => p.minInvestment >= 200000 && p.minInvestment < 500000).length,
        over_500k: filteredPrograms.filter(p => p.minInvestment >= 500000).length
      }
    }

    return NextResponse.json({
      success: true,
      programs: filteredPrograms,
      statistics: stats,
      registeredPortals: registeredPortals.length,
      filters: {
        programType,
        countryCode,
        portalIntegration,
        includeOptions
      },
      retrievedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error retrieving CRBI programs:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve CRBI programs' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Create new CRBI program or test portal integration
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can manage programs
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { action, ...data } = body

    switch (action) {
      case 'create_program':
        return await createCRBIProgram(data, session.session.userId)
      
      case 'test_portal_integration':
        return await testPortalIntegration(data.countryCode)
      
      case 'sync_programs':
        return await syncProgramsFromPortals()
      
      default:
        return NextResponse.json(
          { error: 'Invalid action. Supported actions: create_program, test_portal_integration, sync_programs' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Error processing CRBI program request:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function createCRBIProgram(data: any, createdBy: string) {
  try {
    const {
      programName,
      countryCode,
      countryName,
      programType,
      description,
      minInvestment,
      maxInvestment,
      processingTimeMonths,
      hasDigitalPortal = false,
      portalIntegrationLevel = 'none',
      investmentOptions = []
    } = data

    // Validate required fields
    if (!programName || !countryCode || !countryName || !programType) {
      return NextResponse.json(
        { error: 'Missing required fields: programName, countryCode, countryName, programType' },
        { status: 400 }
      )
    }

    // Check if program already exists
    const existingProgram = await db
      .select({ id: crbiPrograms.id })
      .from(crbiPrograms)
      .where(and(
        eq(crbiPrograms.countryCode, countryCode.toUpperCase()),
        eq(crbiPrograms.programName, programName)
      ))
      .limit(1)

    if (existingProgram.length > 0) {
      return NextResponse.json(
        { error: 'Program already exists for this country with the same name' },
        { status: 400 }
      )
    }

    // Create program
    const [program] = await db.insert(crbiPrograms).values({
      programName,
      countryCode: countryCode.toUpperCase(),
      countryName,
      programType,
      description,
      minInvestment: minInvestment || 0,
      maxInvestment: maxInvestment || null,
      processingTimeMonths: processingTimeMonths || null,
      isActive: true,
      metadata: {
        hasDigitalPortal,
        portalIntegrationLevel,
        createdBy,
        createdAt: new Date().toISOString(),
        source: 'admin_panel'
      }
    }).returning()

    // Create investment options if provided
    let createdOptions = []
    if (investmentOptions.length > 0) {
      const optionsToInsert = investmentOptions.map((option: any, index: number) => ({
        programId: program.id,
        optionType: option.optionType,
        optionName: option.optionName,
        description: option.description,
        baseAmount: option.baseAmount,
        familyPricing: option.familyPricing || null,
        holdingPeriod: option.holdingPeriod || null,
        isActive: option.isActive !== false,
        sortOrder: option.sortOrder || index + 1
      }))

      createdOptions = await db.insert(investmentOptions).values(optionsToInsert).returning()
    }

    return NextResponse.json({
      success: true,
      message: 'CRBI program created successfully',
      program: {
        ...program,
        investmentOptions: createdOptions
      }
    })

  } catch (error) {
    console.error('Error creating CRBI program:', error)
    return NextResponse.json(
      { error: 'Failed to create CRBI program' },
      { status: 500 }
    )
  }
}

async function testPortalIntegration(countryCode: string) {
  try {
    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      )
    }

    const portalAdapter = governmentPortalRegistry.getPortalAdapter(countryCode.toUpperCase())
    if (!portalAdapter) {
      return NextResponse.json(
        { error: `No portal integration available for country: ${countryCode}` },
        { status: 404 }
      )
    }

    // Test portal connection
    const testResult = await governmentPortalRegistry.testPortalConnection(countryCode.toUpperCase())

    return NextResponse.json({
      success: true,
      countryCode: countryCode.toUpperCase(),
      testResult,
      testedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error testing portal integration:', error)
    return NextResponse.json(
      { error: 'Failed to test portal integration' },
      { status: 500 }
    )
  }
}

async function syncProgramsFromPortals() {
  try {
    const registeredPortals = governmentPortalRegistry.getRegisteredPortals()
    const syncResults = []

    for (const portal of registeredPortals) {
      try {
        // Check if we have a program for this country
        const existingProgram = await db
          .select({ id: crbiPrograms.id, programName: crbiPrograms.programName })
          .from(crbiPrograms)
          .where(eq(crbiPrograms.countryCode, portal.countryCode))
          .limit(1)

        if (existingProgram.length > 0) {
          syncResults.push({
            countryCode: portal.countryCode,
            portalName: portal.portalName,
            status: 'existing',
            programName: existingProgram[0].programName
          })
        } else {
          syncResults.push({
            countryCode: portal.countryCode,
            portalName: portal.portalName,
            status: 'no_program',
            message: 'Portal available but no program configured'
          })
        }
      } catch (error) {
        syncResults.push({
          countryCode: portal.countryCode,
          portalName: portal.portalName,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Portal sync completed',
      results: syncResults,
      totalPortals: registeredPortals.length,
      syncedAt: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error syncing programs from portals:', error)
    return NextResponse.json(
      { error: 'Failed to sync programs from portals' },
      { status: 500 }
    )
  }
}