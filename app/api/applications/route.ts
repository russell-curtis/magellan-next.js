import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications } from '@/db/schema'
import { createApplicationSchema } from '@/lib/validations/applications'
import { requireAuth } from '@/lib/auth-utils'
import { eq } from 'drizzle-orm'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    
    const body = await req.json()
    const validatedData = createApplicationSchema.parse(body)
    
    const applicationNumber = `APP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    
    const newApplication = await db.insert(applications).values({
      id: crypto.randomUUID(),
      firmId: user.firmId,
      clientId: validatedData.clientId,
      programId: validatedData.programId,
      assignedAdvisorId: user.id,
      applicationNumber,
      status: 'draft',
      priority: validatedData.priority,
      investmentAmount: validatedData.investmentAmount?.toString() || null,
      investmentType: validatedData.investmentType || null,
      decisionExpectedAt: validatedData.decisionExpectedAt ? new Date(validatedData.decisionExpectedAt) : null,
      notes: validatedData.notes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning()

    return NextResponse.json({
      application: newApplication[0],
      message: 'Application created successfully'
    })

  } catch (error) {
    console.error('Error creating application:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create application' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const url = new URL(req.url)
    const clientId = url.searchParams.get('clientId')
    
    let query = db.select().from(applications).where(eq(applications.firmId, user.firmId))
    
    if (clientId) {
      query = query.where(eq(applications.clientId, clientId))
    }
    
    const results = await query
    
    return NextResponse.json({ applications: results })

  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}