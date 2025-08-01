import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, clients, crbiPrograms, users } from '@/db/schema'
import { requireClientAuth } from '@/lib/client-auth'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('🔍 Client application API called for ID:', params.id)
    const client = await requireClientAuth()
    console.log('✅ Client authenticated:', {
      clientId: client.id,
      authId: client.authId,
      email: client.email
    })
    const applicationId = params.id

    // Get application with related data
    console.log('🔍 Querying for application:', applicationId, 'belonging to client:', client.id)
    
    // Defensive check - ensure all parameters are valid
    if (!applicationId) {
      throw new Error('Application ID is missing')
    }
    if (!client?.id) {
      throw new Error('Client ID is missing from authenticated client')
    }
    
    // First get the application
    const [application] = await db
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.id) // Use client.id, not client.clientId
      ))
      .limit(1)

    console.log('📊 Database query result:', application ? 'Found' : 'Not found')
    
    if (!application) {
      console.log('❌ Application not found for client:', client.id)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get program details if programId exists
    let program = null
    if (application.programId) {
      const [programData] = await db
        .select()
        .from(crbiPrograms)
        .where(eq(crbiPrograms.id, application.programId))
        .limit(1)
      program = programData || null
    }

    // Get advisor details if assignedAdvisorId exists
    let assignedAdvisor = null
    if (application.assignedAdvisorId) {
      const [advisorData] = await db
        .select()
        .from(users)
        .where(eq(users.id, application.assignedAdvisorId))
        .limit(1)
      assignedAdvisor = advisorData || null
    }

    // Build response object
    const response = {
      id: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      investmentAmount: application.investmentAmount,
      investmentType: application.investmentType,
      decisionExpectedAt: application.decisionExpectedAt,
      notes: application.notes,
      program: program ? {
        id: program.id,
        countryName: program.countryName,
        programName: program.programName,
        programType: program.programType,
        minInvestment: program.minInvestment,
        processingTimeMonths: program.processingTimeMonths
      } : null,
      assignedAdvisor: assignedAdvisor ? {
        id: assignedAdvisor.id,
        name: assignedAdvisor.name,
        firstName: assignedAdvisor.firstName,
        lastName: assignedAdvisor.lastName,
        email: assignedAdvisor.email
      } : null
    }

    console.log('✅ Returning application data for:', application.applicationNumber)
    return NextResponse.json(response)

  } catch (error) {
    console.error('Error fetching client application:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    console.error('Error name:', error instanceof Error ? error.name : 'Unknown')
    return NextResponse.json(
      { 
        error: 'Failed to fetch application data',
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}