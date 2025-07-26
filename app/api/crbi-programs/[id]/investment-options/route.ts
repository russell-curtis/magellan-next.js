import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { investmentOptions, crbiPrograms } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: programId } = await params
    
    // Validate that the program exists
    const program = await db
      .select({ 
        id: crbiPrograms.id,
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        programDetails: crbiPrograms.programDetails
      })
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, programId))
      .limit(1)
    
    if (program.length === 0) {
      return NextResponse.json(
        { error: 'CRBI program not found' },
        { status: 404 }
      )
    }

    // Fetch investment options for this program
    const options = await db
      .select({
        id: investmentOptions.id,
        optionType: investmentOptions.optionType,
        optionName: investmentOptions.optionName,
        description: investmentOptions.description,
        baseAmount: investmentOptions.baseAmount,
        familyPricing: investmentOptions.familyPricing,
        holdingPeriod: investmentOptions.holdingPeriod,
        conditions: investmentOptions.conditions,
        eligibilityRequirements: investmentOptions.eligibilityRequirements,
        sortOrder: investmentOptions.sortOrder,
        isActive: investmentOptions.isActive
      })
      .from(investmentOptions)
      .where(eq(investmentOptions.programId, programId))
      .orderBy(investmentOptions.sortOrder)
    
    // Filter only active options
    const activeOptions = options.filter(option => option.isActive)
    
    return NextResponse.json({
      program: program[0],
      investmentOptions: activeOptions,
      count: activeOptions.length
    })
    
  } catch (error) {
    console.error('Error fetching investment options:', error)
    return NextResponse.json(
      { error: 'Failed to fetch investment options' },
      { status: 500 }
    )
  }
}