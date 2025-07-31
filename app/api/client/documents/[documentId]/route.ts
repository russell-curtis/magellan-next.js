import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { auth } from '@/lib/auth'
import { 
  applications, 
  clients, 
  documentRequirements, 
  applicationDocuments 
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateSignedUrl } from '@/lib/r2-storage'

interface RouteParams {
  params: {
    documentId: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = params
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'

    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client record
    const clientRecord = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, session.user.id))
      .limit(1)

    if (!clientRecord.length) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientRecord[0]

    // Get document and verify client access
    const documentQuery = await db
      .select({
        // Document info
        id: applicationDocuments.id,
        fileName: applicationDocuments.filename,
        fileUrl: applicationDocuments.filePath,
        fileSize: applicationDocuments.fileSize,
        contentType: applicationDocuments.contentType,
        r2Key: applicationDocuments.filePath,
        uploadedAt: applicationDocuments.uploadedAt,
        
        // Requirement info
        requirementId: documentRequirements.id,
        documentName: documentRequirements.documentName,
        description: documentRequirements.description,
        status: applicationDocuments.status,
        
        // Application info
        applicationId: applications.id,
        applicationNumber: applications.applicationNumber
      })
      .from(applicationDocuments)
      .innerJoin(documentRequirements, eq(applicationDocuments.documentRequirementId, documentRequirements.id))
      .innerJoin(applications, eq(documentRequirements.applicationId, applications.id))
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applications.clientId, client.id)
      ))
      .limit(1)

    if (!documentQuery.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = documentQuery[0]

    // If this is a download request, redirect to signed URL
    if (download && document.r2Key) {
      try {
        const signedUrl = await generateSignedUrl(document.r2Key, 3600) // 1 hour expiry
        
        // Return redirect to signed URL for download
        return NextResponse.redirect(signedUrl)
      } catch (error) {
        console.error('Error generating signed URL:', error)
        return NextResponse.json({ error: 'Failed to generate download link' }, { status: 500 })
      }
    }

    // For preview/view requests, return document metadata and signed URL
    let signedUrl = document.fileUrl
    if (document.r2Key) {
      try {
        signedUrl = await generateSignedUrl(document.r2Key, 3600) // 1 hour expiry
      } catch (error) {
        console.error('Error generating signed URL for preview:', error)
        // Fall back to original URL if signing fails
      }
    }

    return NextResponse.json({
      id: document.id,
      filename: document.fileName,
      fileUrl: signedUrl,
      contentType: document.contentType,
      fileSize: document.fileSize,
      status: document.status,
      description: document.description,
      documentName: document.documentName,
      requirementId: document.requirementId,
      uploadedAt: document.uploadedAt,
      applicationId: document.applicationId,
      applicationNumber: document.applicationNumber
    })

  } catch (error) {
    console.error('Error fetching client document:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete a document (client can delete their own uploaded documents)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { documentId } = params

    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get client record
    const clientRecord = await db
      .select()
      .from(clients)
      .where(eq(clients.userId, session.user.id))
      .limit(1)

    if (!clientRecord.length) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const client = clientRecord[0]

    // Verify document exists and client owns it
    const documentQuery = await db
      .select({
        documentId: applicationDocuments.id,
        requirementId: documentRequirements.id,
        status: applicationDocuments.status,
        r2Key: applicationDocuments.filePath
      })
      .from(applicationDocuments)
      .innerJoin(documentRequirements, eq(applicationDocuments.documentRequirementId, documentRequirements.id))
      .innerJoin(applications, eq(documentRequirements.applicationId, applications.id))
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applications.clientId, client.id)
      ))
      .limit(1)

    if (!documentQuery.length) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const document = documentQuery[0]

    // Only allow deletion if document is not yet approved
    if (document.status === 'approved') {
      return NextResponse.json({ 
        error: 'Cannot delete approved documents' 
      }, { status: 403 })
    }

    // Delete the document record and reset requirement status
    await db.transaction(async (tx) => {
      // Delete the uploaded document
      await tx
        .delete(applicationDocuments)
        .where(eq(applicationDocuments.id, documentId))

      // Reset the requirement status
      await tx
        .update(documentRequirements)
        .set({
          status: 'pending',
          updatedAt: new Date().toISOString()
        })
        .where(eq(documentRequirements.id, document.requirementId))
    })

    // TODO: Also delete from R2 storage if needed
    // This would require implementing deleteFromR2Storage function

    return NextResponse.json({ 
      message: 'Document deleted successfully',
      requirementId: document.requirementId
    })

  } catch (error) {
    console.error('Error deleting client document:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}