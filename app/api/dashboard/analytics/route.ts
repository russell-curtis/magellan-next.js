import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { clients, applications, users, crbiPrograms } from '@/db/schema'
import { eq, and, sql, count } from 'drizzle-orm'

export async function GET() {
  try {
    // Get current session and user
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's firm
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const firmId = currentUser.firmId

    // Get total clients count
    const [{ totalClients }] = await db
      .select({ totalClients: count() })
      .from(clients)
      .where(eq(clients.firmId, firmId))

    // Get client status distribution
    const clientStatusResults = await db
      .select({
        status: clients.status,
        count: count()
      })
      .from(clients)
      .where(eq(clients.firmId, firmId))
      .groupBy(clients.status)

    const clientsByStatus = {
      prospect: 0,
      active: 0,
      approved: 0,
      rejected: 0
    }

    clientStatusResults.forEach((result) => {
      const status = result.status as keyof typeof clientsByStatus
      if (status in clientsByStatus) {
        clientsByStatus[status] = result.count
      }
    })

    // Get applications in progress (submitted, under_review)
    const [{ activeApplications }] = await db
      .select({ activeApplications: count() })
      .from(applications)
      .where(and(
        eq(applications.firmId, firmId),
        sql`${applications.status} IN ('submitted', 'under_review')`
      ))

    // Get completed applications count
    const [{ completedApplications }] = await db
      .select({ completedApplications: count() })
      .from(applications)
      .where(and(
        eq(applications.firmId, firmId),
        sql`${applications.status} IN ('approved', 'rejected')`
      ))

    // Calculate success rate
    const successRate = completedApplications > 0 
      ? Math.round((clientsByStatus.approved / completedApplications) * 100)
      : 0

    // Get program distribution
    const programResults = await db
      .select({
        programId: applications.programId,
        count: count()
      })
      .from(applications)
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.firmId, firmId))
      .groupBy(applications.programId)

    // Get program names and calculate percentages
    const programDistribution = await Promise.all(
      programResults.map(async (result) => {
        const [program] = await db
          .select()
          .from(crbiPrograms)
          .where(eq(crbiPrograms.id, result.programId))
          .limit(1)

        const totalApplications = programResults.reduce((sum, p) => sum + p.count, 0)
        const percentage = totalApplications > 0 
          ? Math.round((result.count / totalApplications) * 100)
          : 0

        return {
          program: program ? `${program.countryName} ${program.programType}` : 'Unknown Program',
          count: result.count,
          percentage
        }
      })
    )

    // Mock monthly revenue calculation (you can enhance this based on your business logic)
    const monthlyRevenue = totalClients * 2500 + completedApplications * 5000

    // Mock average processing time (you can calculate this from actual application data)
    const averageProcessingTime = 45

    // Get recent activity (mock data for now - you can enhance with actual activity logging)
    const recentActivity = [
      {
        id: '1',
        type: 'client_added' as const,
        description: 'New client Emma Brown added to Portugal program',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '2', 
        type: 'application_submitted' as const,
        description: 'Cyprus application submitted for John Smith',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '3',
        type: 'status_changed' as const,
        description: 'Maria Garcia application approved for Malta residency',
        timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
      },
      {
        id: '4',
        type: 'document_uploaded' as const,
        description: 'Bank statements uploaded for David Chen',
        timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      }
    ]

    const metrics = {
      totalClients,
      activeApplications,
      completedApplications,
      monthlyRevenue,
      averageProcessingTime,
      successRate,
      clientsByStatus,
      programDistribution: programDistribution.slice(0, 5), // Top 5 programs
      recentActivity: recentActivity.slice(0, 10) // Latest 10 activities
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('Dashboard analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}