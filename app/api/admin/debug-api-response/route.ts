import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, clients, crbiPrograms } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'
import { eq, and, ne } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  try {
    console.log('🔍 Debugging API response...')
    
    const user = await requireAuth()
    console.log('Current user:', user)
    
    const whereConditions = [eq(applications.firmId, user.firmId)]
    whereConditions.push(ne(applications.status, 'archived'))
    
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
        assignedAdvisorId: applications.assignedAdvisorId, // This is the key field!
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
    
    console.log('API Query results:', results.map(r => ({
      id: r.id,
      applicationNumber: r.applicationNumber,
      status: r.status,
      assignedAdvisorId: r.assignedAdvisorId
    })))
    
    return NextResponse.json({ 
      applications: results,
      currentUser: user,
      debug: 'This shows the exact API response the frontend receives'
    })

  } catch (error) {
    console.error('Error in debug API:', error)
    return NextResponse.json(
      { error: 'Failed to debug API' },
      { status: 500 }
    )
  }
}