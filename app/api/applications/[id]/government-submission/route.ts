// Government Submission API Endpoints
// Handles preparing and submitting applications to government portals

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { 
  governmentSubmissionService,
  documentCompilationService 
} from '@/lib/services/government-submission'

// ============================================================================
// GET - Get submission package and readiness status
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

    // Compile submission package to check readiness
    const submissionPackage = await documentCompilationService.compileSubmissionPackage(
      applicationId,
      session.session.userId
    )

    return NextResponse.json({
      applicationId,
      currentStatus: app.status,
      submissionPackage,
      canPrepareForSubmission: ['submitted'].includes(app.status),
      canSubmitToGovernment: app.status === 'ready_for_submission',
      isSubmitted: ['submitted_to_government', 'under_review', 'approved', 'rejected'].includes(app.status)
    })

  } catch (error) {
    console.error('Error getting submission status:', error)
    return NextResponse.json(
      { error: 'Failed to get submission status' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Prepare for submission or submit to government
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const body = await request.json()
    const { action } = body // 'prepare' or 'submit'
    
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

    // Handle different actions
    if (action === 'prepare') {
      // Prepare for submission
      if (app.status !== 'submitted') {
        return NextResponse.json(
          { error: 'Application must be in "submitted" status to prepare for government submission' },
          { status: 400 }
        )
      }

      const result = await governmentSubmissionService.prepareForSubmission(
        applicationId,
        session.session.userId
      )

      if (!result.success) {
        return NextResponse.json(
          { error: 'Failed to prepare for submission', details: result.errors },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Application prepared for government submission',
        newStatus: 'ready_for_submission',
        submissionPackage: result.package
      })

    } else if (action === 'submit') {
      // Submit to government
      if (app.status !== 'ready_for_submission') {
        return NextResponse.json(
          { error: 'Application must be in "ready_for_submission" status to submit to government' },
          { status: 400 }
        )
      }

      // First, get the submission package
      const submissionPackage = await documentCompilationService.compileSubmissionPackage(
        applicationId,
        session.session.userId
      )

      if (!submissionPackage.validation.isComplete) {
        return NextResponse.json(
          { error: 'Application package is incomplete', details: submissionPackage.validation.missingRequiredDocs },
          { status: 400 }
        )
      }

      // Submit to government
      const submissionResult = await governmentSubmissionService.submitToGovernment(
        applicationId,
        submissionPackage,
        session.session.userId
      )

      if (!submissionResult.success) {
        return NextResponse.json(
          { error: 'Failed to submit to government', details: submissionResult.errors },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Application successfully submitted to government',
        newStatus: 'submitted_to_government',
        submissionId: submissionResult.submissionId,
        governmentReferenceNumber: submissionResult.governmentReferenceNumber,
        submittedAt: submissionResult.submittedAt
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "prepare" or "submit"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing government submission:', error)
    return NextResponse.json(
      { error: 'Failed to process government submission' },
      { status: 500 }
    )
  }
}