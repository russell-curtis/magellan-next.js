// Individual Original Document API Endpoints
// Handles operations on specific original documents

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { originalDocuments, applications, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { originalDocumentService } from '@/lib/services/original-documents'
import { 
  updateShippingInfoSchema,
  confirmReceiptSchema,
  completeVerificationSchema,
  updateOriginalDocumentStatusSchema
} from '@/lib/validations/original-documents'

// ============================================================================
// GET - Get specific original document details
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalDocumentId } = await params
    
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

    // Get original document with application details
    const originalDoc = await db
      .select({
        originalDocument: originalDocuments,
        application: {
          id: applications.id,
          firmId: applications.firmId,
          assignedAdvisorId: applications.assignedAdvisorId
        }
      })
      .from(originalDocuments)
      .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
      .where(eq(originalDocuments.id, originalDocumentId))
      .limit(1)

    if (!originalDoc.length) {
      return NextResponse.json(
        { error: 'Original document not found' },
        { status: 404 }
      )
    }

    const { originalDocument, application } = originalDoc[0]

    // Check permissions
    const hasPermission = 
      user[0].firmId === application?.firmId && (
        user[0].role === 'admin' || 
        user[0].id === application?.assignedAdvisorId
      )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      originalDocument,
      application
    })

  } catch (error) {
    console.error('Error fetching original document:', error)
    return NextResponse.json(
      { error: 'Failed to fetch original document' },
      { status: 500 }
    )
  }
}

// ============================================================================
// PATCH - Update original document (shipping, receipt, verification)
// ============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalDocumentId } = await params
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

    // Get original document with application details
    const originalDoc = await db
      .select({
        originalDocument: originalDocuments,
        application: {
          id: applications.id,
          firmId: applications.firmId,
          assignedAdvisorId: applications.assignedAdvisorId
        }
      })
      .from(originalDocuments)
      .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
      .where(eq(originalDocuments.id, originalDocumentId))
      .limit(1)

    if (!originalDoc.length) {
      return NextResponse.json(
        { error: 'Original document not found' },
        { status: 404 }
      )
    }

    const { application } = originalDoc[0]

    // Check permissions
    const hasPermission = 
      user[0].firmId === application?.firmId && (
        user[0].role === 'admin' || 
        user[0].id === application?.assignedAdvisorId
      )

    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Handle different actions
    if (action === 'update_shipping') {
      // Update shipping information
      const validation = updateShippingInfoSchema.safeParse(data)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid shipping data', details: validation.error.issues },
          { status: 400 }
        )
      }

      const result = await originalDocumentService.updateShippingInfo(
        originalDocumentId,
        validation.data,
        session.session.userId,
        user[0].firmId
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Shipping information updated successfully'
      })

    } else if (action === 'confirm_receipt') {
      // Confirm receipt of original documents
      const validation = confirmReceiptSchema.safeParse(data)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid receipt data', details: validation.error.issues },
          { status: 400 }
        )
      }

      const result = await originalDocumentService.confirmReceipt(
        originalDocumentId,
        validation.data,
        session.session.userId,
        user[0].firmId
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Document receipt confirmed successfully'
      })

    } else if (action === 'complete_verification') {
      // Complete document verification
      const validation = completeVerificationSchema.safeParse(data)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid verification data', details: validation.error.issues },
          { status: 400 }
        )
      }

      const result = await originalDocumentService.completeVerification(
        originalDocumentId,
        validation.data,
        session.session.userId,
        user[0].firmId
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error },
          { status: 400 }
        )
      }

      return NextResponse.json({
        success: true,
        message: 'Document verification completed successfully'
      })

    } else if (action === 'update_status') {
      // Generic status update
      const validation = updateOriginalDocumentStatusSchema.safeParse(data)
      
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid status data', details: validation.error.issues },
          { status: 400 }
        )
      }

      // This would require a generic status update method in the service
      // For now, return success as specific actions handle status updates
      return NextResponse.json({
        success: true,
        message: 'Status update requested - use specific action endpoints'
      })

    } else {
      return NextResponse.json(
        { error: 'Invalid action. Must be "update_shipping", "confirm_receipt", "complete_verification", or "update_status"' },
        { status: 400 }
      )
    }

  } catch (error) {
    console.error('Error updating original document:', error)
    return NextResponse.json(
      { error: 'Failed to update original document' },
      { status: 500 }
    )
  }
}

// ============================================================================
// DELETE - Cancel/remove original document tracking
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalDocumentId } = await params
    
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

    // Only admins can delete original document tracking
    if (user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Only administrators can delete original document tracking' },
        { status: 403 }
      )
    }

    // Get original document with application details
    const originalDoc = await db
      .select({
        originalDocument: originalDocuments,
        application: {
          id: applications.id,
          firmId: applications.firmId
        }
      })
      .from(originalDocuments)
      .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
      .where(eq(originalDocuments.id, originalDocumentId))
      .limit(1)

    if (!originalDoc.length) {
      return NextResponse.json(
        { error: 'Original document not found' },
        { status: 404 }
      )
    }

    const { application } = originalDoc[0]

    // Check firm access
    if (user[0].firmId !== application?.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete the original document tracking
    await db
      .delete(originalDocuments)
      .where(eq(originalDocuments.id, originalDocumentId))

    return NextResponse.json({
      success: true,
      message: 'Original document tracking removed successfully'
    })

  } catch (error) {
    console.error('Error deleting original document:', error)
    return NextResponse.json(
      { error: 'Failed to delete original document tracking' },
      { status: 500 }
    )
  }
}