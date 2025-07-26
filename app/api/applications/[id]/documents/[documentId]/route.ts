import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  documentReviews,
  documentRequirements,
  customDocumentRequirements,
  users
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { deleteFromR2 } from '@/lib/r2-storage'

// Get detailed document information
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const documentId = params.documentId

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get document with uploader info
    const [document] = await db
      .select({
        id: applicationDocuments.id,
        filename: applicationDocuments.filename,
        originalFilename: applicationDocuments.originalFilename,
        fileSize: applicationDocuments.fileSize,
        contentType: applicationDocuments.contentType,
        filePath: applicationDocuments.filePath,
        uploadedAt: applicationDocuments.uploadedAt,
        documentRequirementId: applicationDocuments.documentRequirementId,
        customRequirementId: applicationDocuments.customRequirementId,
        uploadedById: applicationDocuments.uploadedById,
        uploaderName: users.name,
        uploaderEmail: users.email
      })
      .from(applicationDocuments)
      .leftJoin(users, eq(applicationDocuments.uploadedById, users.id))
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId)
      ))
      .limit(1)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Get requirement details
    let requirement = null
    if (document.documentRequirementId) {
      const [req] = await db
        .select()
        .from(documentRequirements)
        .where(eq(documentRequirements.id, document.documentRequirementId))
        .limit(1)
      requirement = req
    } else if (document.customRequirementId) {
      const [req] = await db
        .select()
        .from(customDocumentRequirements)
        .where(eq(customDocumentRequirements.id, document.customRequirementId))
        .limit(1)
      requirement = req
    }

    // Get latest review
    const [latestReview] = await db
      .select({
        id: documentReviews.id,
        status: documentReviews.status,
        comments: documentReviews.comments,
        rejectionReason: documentReviews.rejectionReason,
        priority: documentReviews.priority,
        reviewedAt: documentReviews.reviewedAt,
        reviewerName: users.name,
        reviewerEmail: users.email
      })
      .from(documentReviews)
      .leftJoin(users, eq(documentReviews.reviewedBy, users.id))
      .where(eq(documentReviews.documentId, documentId))
      .orderBy(desc(documentReviews.reviewedAt))
      .limit(1)

    // Calculate expiration date if applicable
    let expiresAt = null
    if (requirement?.expirationMonths && document.uploadedAt) {
      const expirationDate = new Date(document.uploadedAt)
      expirationDate.setMonth(expirationDate.getMonth() + requirement.expirationMonths)
      expiresAt = expirationDate.toISOString()
    }

    return NextResponse.json({
      id: document.id,
      fileName: document.filename,
      originalName: document.originalFilename,
      fileSize: document.fileSize,
      fileType: document.contentType,
      filePath: document.filePath,
      uploadedAt: document.uploadedAt,
      expiresAt,
      uploadedBy: {
        id: document.uploadedById,
        name: document.uploaderName,
        email: document.uploaderEmail
      },
      requirement: requirement ? {
        id: requirement.id,
        documentName: requirement.documentName,
        description: requirement.description,
        category: requirement.category,
        isRequired: requirement.isRequired,
        isClientUploadable: requirement.isClientUploadable,
        acceptedFormats: requirement.acceptedFormats,
        maxFileSizeMB: requirement.maxFileSizeMB,
        expirationMonths: requirement.expirationMonths,
        displayGroup: requirement.displayGroup,
        helpText: requirement.helpText
      } : null,
      latestReview: latestReview ? {
        id: latestReview.id,
        status: latestReview.status,
        comments: latestReview.comments,
        rejectionReason: latestReview.rejectionReason,
        priority: latestReview.priority,
        reviewedAt: latestReview.reviewedAt,
        reviewedBy: {
          name: latestReview.reviewerName,
          email: latestReview.reviewerEmail
        }
      } : null,
      currentStatus: latestReview?.status || 'pending'
    })

  } catch (error) {
    console.error('Error fetching document details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document details' },
      { status: 500 }
    )
  }
}

// Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const documentId = params.documentId

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get document and verify it belongs to this application
    const [document] = await db
      .select()
      .from(applicationDocuments)
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId)
      ))
      .limit(1)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // TODO: Check if user has permission to delete this document
    // Only allow deletion by uploader or admin/advisor

    // Delete related reviews first
    await db
      .delete(documentReviews)
      .where(eq(documentReviews.documentId, documentId))

    // Delete file from R2 if it exists
    if (document.filePath) {
      try {
        await deleteFromR2(document.filePath)
        
        // TODO: Also delete thumbnail if it exists
        // This would require additional schema changes to track thumbnail paths
      } catch (error) {
        console.warn('Failed to delete file from R2:', error)
        // Continue with database deletion even if file cleanup fails
      }
    }

    // Delete the document record
    await db
      .delete(applicationDocuments)
      .where(eq(applicationDocuments.id, documentId))

    return NextResponse.json({ 
      success: true, 
      message: 'Document deleted successfully' 
    })

  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}

// Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; documentId: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const documentId = params.documentId
    const body = await request.json()

    const { fileName, notes } = body

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get document and verify it belongs to this application
    const [document] = await db
      .select()
      .from(applicationDocuments)
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId)
      ))
      .limit(1)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // TODO: Check if user has permission to update this document

    // Update document
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    if (fileName) {
      updateData.filename = fileName
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    const [updatedDocument] = await db
      .update(applicationDocuments)
      .set(updateData)
      .where(eq(applicationDocuments.id, documentId))
      .returning()

    return NextResponse.json({
      id: updatedDocument.id,
      fileName: updatedDocument.filename,
      notes: updatedDocument.notes,
      updatedAt: updatedDocument.updatedAt
    })

  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}