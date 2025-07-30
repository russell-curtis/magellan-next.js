// Document Validation Report API
// Provides detailed validation reports for government submission readiness

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { documentCompilationService } from '@/lib/services/government-submission'

// ============================================================================
// GET - Get detailed validation report
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get application and verify access
    const application = await db
      .select({
        id: applications.id,
        status: applications.status,
        firmId: applications.firmId,
        assignedAdvisorId: applications.assignedAdvisorId
      })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const app = application[0]

    // Check permissions
    const hasPermission = 
      user[0].firmId === app.firmId && (
        user[0].role === 'admin' || 
        user[0].id === app.assignedAdvisorId
      )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Generate detailed validation report
    const validationReport = await documentCompilationService.getValidationReport(applicationId)

    return NextResponse.json({
      success: true,
      applicationId,
      currentStatus: app.status,
      ...validationReport,
      generatedAt: new Date().toISOString(),
      generatedBy: session.session.userId
    })

  } catch (error) {
    console.error('Error generating validation report:', error)
    return NextResponse.json(
      { error: 'Failed to generate validation report' },
      { status: 500 }
    )
  }
}