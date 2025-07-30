// Government Document Upload API
// Handle uploading additional documents to government portals

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { applications, users, documents, activityLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { governmentPortalRegistry } from '@/lib/services/government-portal-integration'

// ============================================================================
// POST - Upload document to government portal
// ============================================================================

export async function POST(
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
        assignedAdvisorId: applications.assignedAdvisorId,
        programId: applications.programId
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

    // Check if application has been submitted to government
    if (!['submitted_to_government', 'under_review', 'requires_action'].includes(app.status)) {
      return NextResponse.json(
        { error: 'Application must be submitted to government before uploading additional documents' },
        { status: 400 }
      )
    }

    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const documentType = formData.get('documentType') as string
    const description = formData.get('description') as string | null
    const governmentReferenceNumber = formData.get('governmentReferenceNumber') as string

    if (!file) {
      return NextResponse.json(
        { error: 'File is required' },
        { status: 400 }
      )
    }

    if (!documentType) {
      return NextResponse.json(
        { error: 'Document type is required' },
        { status: 400 }
      )
    }

    if (!governmentReferenceNumber) {
      return NextResponse.json(
        { error: 'Government reference number is required' },
        { status: 400 }
      )
    }

    // Get file buffer
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Get program details to determine country code
    const { documentCompilationService } = await import('@/lib/services/government-submission')
    const applicationDetails = await documentCompilationService.getValidationReport(applicationId)
    
    if (!applicationDetails.applicationDetails) {
      return NextResponse.json(
        { error: 'Could not retrieve application details' },
        { status: 500 }
      )
    }

    const countryCode = applicationDetails.applicationDetails.program.countryCode

    // Try to upload to government portal
    try {
      const portalAdapter = governmentPortalRegistry.getPortalAdapter(countryCode)
      
      if (!portalAdapter) {
        return NextResponse.json(
          { error: `No government portal integration available for ${countryCode}` },
          { status: 400 }
        )
      }

      // Authenticate with government portal
      const authResult = await portalAdapter.authenticate()
      if (!authResult.success) {
        throw new Error(`Portal authentication failed: ${authResult.error}`)
      }

      // Upload document to government portal
      const uploadResult = await portalAdapter.uploadDocument(
        governmentReferenceNumber,
        {
          fileName: file.name,
          fileBuffer,
          documentType,
          description: description || undefined
        },
        authResult.accessToken!
      )

      if (!uploadResult.success) {
        throw new Error(`Document upload failed: ${uploadResult.errors?.join(', ')}`)
      }

      // Store document record in our database
      const documentRecord = await db.insert(documents).values({
        applicationId,
        filename: file.name,
        originalFilename: file.name,
        fileSize: fileBuffer.length,
        mimeType: file.type || 'application/octet-stream',
        fileUrl: uploadResult.uploadUrl || '', // Government portal URL
        category: documentType,
        documentType: documentType,
        status: 'uploaded_to_government',
        uploadedBy: session.session.userId,
        firmId: app.firmId
      }).returning()

      // Log successful upload activity
      await db.insert(activityLogs).values({
        firmId: app.firmId,
        userId: session.session.userId,
        applicationId,
        action: 'government_document_upload_completed',
        entityType: 'document',
        entityId: documentRecord[0].id,
        newValues: {
          fileName: file.name,
          documentType,
          description,
          governmentReferenceNumber,
          governmentDocumentId: uploadResult.documentId,
          uploadedToPortal: true,
          countryCode,
          uploadedAt: new Date().toISOString()
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Document successfully uploaded to government portal',
        documentId: documentRecord[0].id,
        governmentDocumentId: uploadResult.documentId,
        uploadUrl: uploadResult.uploadUrl,
        uploadedAt: new Date().toISOString()
      })

    } catch (portalError) {
      console.error('Government portal upload failed:', portalError)
      
      // Store document locally even if government upload fails
      try {
        const documentRecord = await db.insert(documents).values({
          applicationId,
          filename: file.name,
          originalFilename: file.name,
          fileSize: fileBuffer.length,
          mimeType: file.type || 'application/octet-stream',
          fileUrl: '', // No URL since upload failed
          category: documentType,
          documentType: documentType,
          status: 'upload_failed',
          uploadedBy: session.session.userId,
          firmId: app.firmId
        }).returning()

        // Log failed upload activity
        await db.insert(activityLogs).values({
          firmId: app.firmId,
          userId: session.session.userId,
          applicationId,
          action: 'government_document_upload_failed',
          entityType: 'document',
          entityId: documentRecord[0].id,
          newValues: {
            fileName: file.name,
            documentType,
            description,
            governmentReferenceNumber,
            uploadedToPortal: false,
            countryCode,
            error: portalError instanceof Error ? portalError.message : 'Unknown error',
            failedAt: new Date().toISOString()
          }
        })

        return NextResponse.json({
          success: false,
          error: 'Failed to upload document to government portal',
          details: portalError instanceof Error ? portalError.message : 'Unknown error',
          documentStoredLocally: true,
          localDocumentId: documentRecord[0].id
        }, { status: 500 })
      } catch (dbError) {
        console.error('Failed to store document locally:', dbError)
        return NextResponse.json({
          success: false,
          error: 'Failed to upload document and store locally',
          details: portalError instanceof Error ? portalError.message : 'Unknown error'
        }, { status: 500 })
      }
    }

  } catch (error) {
    console.error('Error uploading document to government:', error)
    return NextResponse.json(
      { error: 'Failed to upload document to government' },
      { status: 500 }
    )
  }
}