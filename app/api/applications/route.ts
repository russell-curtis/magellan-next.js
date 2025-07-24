import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, clients, crbiPrograms } from '@/db/schema'
import { createApplicationSchema } from '@/lib/validations/applications'
import { requireAuth } from '@/lib/auth-utils'
import { eq, and } from 'drizzle-orm'

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
    
    const whereConditions = [eq(applications.firmId, user.firmId)]
    
    if (clientId) {
      whereConditions.push(eq(applications.clientId, clientId))
    }
    
    const results = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        priority: applications.priority,
        investmentAmount: applications.investmentAmount,
        investmentType: applications.investmentType,
        submittedAt: applications.submittedAt,
        decisionExpectedAt: applications.decisionExpectedAt,
        decidedAt: applications.decidedAt,
        notes: applications.notes,
        internalNotes: applications.internalNotes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName,
          programType: crbiPrograms.programType,
          minInvestment: crbiPrograms.minInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(and(...whereConditions))
    
    return NextResponse.json({ applications: results })

  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}