import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, crbiPrograms, users } from '@/db/schema'
import { requireClientAuth } from '@/lib/client-auth'
import { eq, and, ne } from 'drizzle-orm'

export async function GET() {
  try {
    const client = await requireClientAuth()
    
    // Fetch all applications for this client
    const clientApplications = await db
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
        createdAt: applications.createdAt,
        updatedAt: applications.updatedAt,
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName,
          programType: crbiPrograms.programType,
          minInvestment: crbiPrograms.minInvestment,
          processingTimeMonths: crbiPrograms.processingTimeMonths
        },
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(applications)
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .leftJoin(users, eq(applications.assignedAdvisorId, users.id))
      .where(and(
        eq(applications.clientId, client.clientId),
        ne(applications.status, 'draft'),
        ne(applications.status, 'archived')
      ))
      .orderBy(applications.createdAt)
    
    return NextResponse.json({ 
      applications: clientApplications,
      client: {
        id: client.clientId,
        name: `${client.client.firstName} ${client.client.lastName}`
      }
    })

  } catch (error) {
    console.error('Error fetching client applications:', error)
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}