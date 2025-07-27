import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { 
  applications, 
  clients,
  crbiPrograms,
  crbiInvestmentOptions
} from '@/db/schema'
import { eq } from 'drizzle-orm'
import { createApplicationSchema } from '@/lib/validations/applications'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('=== AGENT APPLICATION API CALLED ===')
  console.log('Application ID:', resolvedParams.id)
  
  try {
    // Require agent authentication
    const user = await requireAuth()
    console.log('Agent authenticated:', user.id)
    const applicationId = resolvedParams.id

    // Get application with client and program details (agents can access any application)
    const [application] = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        priority: applications.priority,
        investmentAmount: applications.investmentAmount,
        investmentType: applications.investmentType,
        selectedInvestmentOptionId: applications.selectedInvestmentOptionId,
        decisionExpectedAt: applications.decisionExpectedAt,
        notes: applications.notes,
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        programId: applications.programId,
        clientId: applications.clientId,
        assignedAdvisorId: applications.assignedAdvisorId,
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
      .innerJoin(clients, eq(applications.clientId, clients.id))
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      console.log('Application not found for ID:', applicationId)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    console.log('Found application:', {
      id: application.id,
      applicationNumber: application.applicationNumber,
      clientName: `${application.client.firstName} ${application.client.lastName}`,
      programName: application.program.programName
    })

    return NextResponse.json({
      id: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      priority: application.priority,
      investmentAmount: application.investmentAmount,
      investmentType: application.investmentType,
      selectedInvestmentOptionId: application.selectedInvestmentOptionId,
      decisionExpectedAt: application.decisionExpectedAt,
      notes: application.notes,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      programId: application.programId,
      clientId: application.clientId,
      client: application.client,
      program: application.program,
      assignedAdvisor: application.assignedAdvisorId ? {
        id: application.assignedAdvisorId,
        name: 'Assigned Advisor', // Would need to join with users table for real name
        email: 'advisor@example.com'
      } : null
    })

  } catch (error) {
    console.error('Error fetching agent application:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('=== PATCH APPLICATION API CALLED ===')
  console.log('Application ID:', resolvedParams.id)

  try {
    // Require agent authentication
    const user = await requireAuth()
    console.log('Agent authenticated:', user.id)
    const applicationId = resolvedParams.id

    // Parse and validate request body
    const body = await request.json()
    console.log('Request body:', body)

    // Validate using the same schema as creation, but make fields optional for updates
    const updateSchema = createApplicationSchema.partial()
    const validatedData = updateSchema.parse(body)

    // Check if application exists and is in draft status
    const [existingApplication] = await db
      .select({
        id: applications.id,
        status: applications.status,
        assignedAdvisorId: applications.assignedAdvisorId,
        firmId: applications.firmId
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!existingApplication) {
      console.log('Application not found for update:', applicationId)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if application belongs to user's firm
    if (existingApplication.firmId !== user.firmId) {
      console.log('Access denied - application belongs to different firm')
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Only allow editing of draft applications
    if (existingApplication.status !== 'draft') {
      console.log('Cannot edit non-draft application:', existingApplication.status)
      return NextResponse.json({ 
        error: 'Only draft applications can be edited',
        currentStatus: existingApplication.status
      }, { status: 400 })
    }

    // Check permissions - only admin or assigned advisor can edit
    const canEdit = user.role === 'admin' || existingApplication.assignedAdvisorId === user.id
    if (!canEdit) {
      console.log('Access denied - user cannot edit this application')
      return NextResponse.json({ error: 'Access denied - insufficient permissions' }, { status: 403 })
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    if (validatedData.programId !== undefined) {
      updateData.programId = validatedData.programId
    }
    if (validatedData.selectedInvestmentOptionId !== undefined) {
      updateData.selectedInvestmentOptionId = validatedData.selectedInvestmentOptionId
    }
    if (validatedData.investmentAmount !== undefined) {
      updateData.investmentAmount = validatedData.investmentAmount.toString()
    }
    if (validatedData.investmentType !== undefined) {
      updateData.investmentType = validatedData.investmentType
    }
    if (validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority
    }
    if (validatedData.decisionExpectedAt !== undefined) {
      updateData.decisionExpectedAt = validatedData.decisionExpectedAt ? new Date(validatedData.decisionExpectedAt) : null
    }
    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    console.log('Update data:', updateData)

    // Update the application
    const [updatedApplication] = await db
      .update(applications)
      .set(updateData)
      .where(eq(applications.id, applicationId))
      .returning()

    if (!updatedApplication) {
      console.log('Failed to update application')
      return NextResponse.json({ error: 'Failed to update application' }, { status: 500 })
    }

    console.log('Application updated successfully:', updatedApplication.id)

    return NextResponse.json({
      application: updatedApplication,
      message: 'Application updated successfully'
    })

  } catch (error) {
    console.error('Error updating application:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Failed to update application',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}