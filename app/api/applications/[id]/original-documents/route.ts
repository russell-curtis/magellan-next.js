// Original Documents API Endpoints
// Handles CRUD operations for physical document tracking

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { originalDocumentService } from '@/lib/services/original-documents'
import { 
  requestOriginalDocumentSchema,
  bulkRequestOriginalDocumentsSchema,
  originalDocumentFiltersSchema
} from '@/lib/validations/original-documents'

// ============================================================================
// GET - Get original documents for an application
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
    console.log('🎯 API: Session user ID:', session.session.userId)
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    console.log('🎯 API: User query results:', user)

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

    // Get original documents
    const originalDocuments = await originalDocumentService.getOriginalDocumentsByApplication(applicationId)

    // Get statistics
    const stats = await originalDocumentService.getOriginalDocumentStats(user[0].firmId)

    return NextResponse.json({
      applicationId,
      originalDocuments,
      stats,
      totalCount: originalDocuments.length
    })

  } catch (error) {
    console.error('Error fetching original documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch original documents' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Request original documents or bulk request  
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    const body = await request.json()
    const { action, ...data } = body
    
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details
    console.log('🎯 API: Session user ID:', session.session.userId)
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    console.log('🎯 API: User query results:', user)

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
    if (action === 'request_single') {
      console.log('🎯 API: Processing single original document request...')
      console.log('🎯 API: Request data:', { action, applicationId, data })
      
      // Request single original document
      const validation = requestOriginalDocumentSchema.safeParse({
        ...data,
        applicationId
      })
      
      if (!validation.success) {
        console.log('❌ API: Validation failed:', validation.error.issues)
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.issues },
          { status: 400 }
        )
      }

      console.log('✅ API: Validation successful, calling service...')
      console.log('🎯 API: Service call parameters:', {
        validationData: validation.data,
        userId: session.session.userId,
        firmId: user[0].firmId
      })

      const result = await originalDocumentService.requestOriginalDocument(
        validation.data,
        session.session.userId,
        user[0].firmId
      )

      console.log('🎯 API: Service result:', result)

      if (!result.success) {
        console.log('🎯 API: Returning error response:', { error: result.error })
        const errorResponse = { error: result.error }
        console.log('🎯 API: Error response object:', JSON.stringify(errorResponse))
        return NextResponse.json(
          errorResponse,
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Original document requested successfully',
        originalDocument: result.originalDocument
      })

    } else if (action === 'request_bulk') {
      console.log('🎯 API: Processing bulk original document request...')
      console.log('🎯 API: Bulk request data:', { action, applicationId, data })
      
      // Bulk request original documents
      const validation = bulkRequestOriginalDocumentsSchema.safeParse({
        ...data,
        applicationId
      })
      
      if (!validation.success) {
        console.log('❌ API: Bulk validation failed:', validation.error.issues)
        return NextResponse.json(
          { error: 'Invalid request data', details: validation.error.issues },
          { status: 400 }
        )
      }

      console.log('✅ API: Bulk validation successful')
      console.log('🎯 API: Processing', validation.data.documentRequirementIds.length, 'document requirements')

      const results = []
      const errors = []

      // Process each document requirement
      for (const documentRequirementId of validation.data.documentRequirementIds) {
        console.log('🎯 API: Processing document requirement:', documentRequirementId)
        
        const result = await originalDocumentService.requestOriginalDocument(
          {
            applicationId: validation.data.applicationId,
            documentRequirementId,
            clientInstructions: validation.data.clientInstructions,
            deadline: validation.data.deadline,
            isUrgent: validation.data.isUrgent,
            shippingAddress: validation.data.shippingAddress,
            internalNotes: validation.data.internalNotes
          },
          session.session.userId,
          user[0].firmId
        )

        console.log('🎯 API: Document requirement result:', { documentRequirementId, success: result.success })

        if (result.success) {
          results.push(result.originalDocument)
        } else {
          errors.push({
            documentRequirementId,
            error: result.error
          })
        }
      }

      return NextResponse.json({
        success: true,
        message: `Requested ${results.length} original documents successfully`,
        results,
        errors: errors.length > 0 ? errors : undefined,
        totalRequested: results.length,
        totalErrors: errors.length
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "request_single" or "request_bulk"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error processing original document request:', error)
    return NextResponse.json(
      { error: 'Failed to process original document request' },
      { status: 500 }
    )
  }
}