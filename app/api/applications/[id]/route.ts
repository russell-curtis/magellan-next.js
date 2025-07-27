import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { 
  applications, 
  clients,
  crbiPrograms
} from '@/db/schema'
import { eq } from 'drizzle-orm'

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
        createdAt: applications.createdAt,
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
          programType: crbiPrograms.programType
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
      createdAt: application.createdAt,
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