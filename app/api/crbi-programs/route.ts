import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { crbiPrograms } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET() {
  try {
    const programs = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.isActive, true))
      .orderBy(desc(crbiPrograms.minInvestment))
    
    return NextResponse.json(programs)
  } catch (error) {
    console.error('Error fetching CRBI programs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CRBI programs' },
      { status: 500 }
    )
  }
}

// Optional: Add endpoint for getting a specific program
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { programId } = body
    
    const program = await db
      .select()
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, programId))
      .limit(1)
    
    if (program.length === 0) {
      return NextResponse.json(
        { error: 'Program not found' },
        { status: 404 }
      )
    }
    
    return NextResponse.json(program[0])
  } catch (error) {
    console.error('Error fetching CRBI program:', error)
    return NextResponse.json(
      { error: 'Failed to fetch CRBI program' },
      { status: 500 }
    )
  }
}