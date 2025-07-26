import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  documentRequirements,
  customDocumentRequirements
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { 
  uploadToR2, 
  generateFileKey, 
  validateFile, 
  generateThumbnail,
  deleteFromR2 
} from '@/lib/r2-storage'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const formData = await request.formData()
    
    const file = formData.get('file') as File
    const requirementId = formData.get('requirementId') as string
    const customRequirementId = formData.get('customRequirementId') as string
    const replaceExisting = formData.get('replaceExisting') === 'true'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!requirementId && !customRequirementId) {
      return NextResponse.json({ 
        error: 'Either requirementId or customRequirementId is required' 
      }, { status: 400 })
    }

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Verify requirement exists and get validation rules
    let requirement: {
      acceptedFormats: string[]
      maxFileSizeMB: number
      [key: string]: any
    } | null = null
    
    if (requirementId) {
      const [req] = await db
        .select()
        .from(documentRequirements)
        .where(eq(documentRequirements.id, requirementId))
        .limit(1)
      requirement = req
    } else if (customRequirementId) {
      const [req] = await db
        .select()
        .from(customDocumentRequirements)
        .where(and(
          eq(customDocumentRequirements.id, customRequirementId),
          eq(customDocumentRequirements.applicationId, applicationId)
        ))
        .limit(1)
      requirement = req
    }

    if (!requirement) {
      return NextResponse.json({ error: 'Document requirement not found' }, { status: 404 })
    }

    // Validate file against requirements
    const validation = validateFile(file, {
      maxSizeMB: requirement.maxFileSizeMB,
      allowedTypes: requirement.acceptedFormats
    })

    if (!validation.valid) {
      return NextResponse.json({ 
        error: validation.error 
      }, { status: 400 })
    }

    // Check if document already exists and get existing file key for cleanup
    let existingFileKey: string | null = null
    if (!replaceExisting) {
      const existingDoc = await db
        .select()
        .from(applicationDocuments)
        .where(and(
          eq(applicationDocuments.applicationId, applicationId),
          requirementId ? eq(applicationDocuments.documentRequirementId, requirementId) : 
                         eq(applicationDocuments.customRequirementId, customRequirementId!)
        ))
        .limit(1)

      if (existingDoc.length > 0) {
        return NextResponse.json({ 
          error: 'Document already exists for this requirement. Set replaceExisting=true to replace.' 
        }, { status: 409 })
      }
    } else {
      // Get existing file key for cleanup when replacing
      const [existingDoc] = await db
        .select()
        .from(applicationDocuments)
        .where(and(
          eq(applicationDocuments.applicationId, applicationId),
          requirementId ? eq(applicationDocuments.documentRequirementId, requirementId) : 
                         eq(applicationDocuments.customRequirementId, customRequirementId!)
        ))
        .limit(1)

      if (existingDoc) {
        existingFileKey = existingDoc.filePath
      }
    }

    // Generate file key and upload to R2
    const fileKey = generateFileKey(applicationId, file.name, 'documents')
    
    try {
      const uploadResult = await uploadToR2(file, fileKey, {
        contentType: file.type,
        metadata: {
          'application-id': applicationId,
          'requirement-id': requirementId || customRequirementId || '',
          'uploaded-by': session.session.userId,
          'original-name': file.name,
        }
      })

      // Generate thumbnail if it's an image or PDF  
      // const thumbnailKey = await generateThumbnail(fileKey, file.type)
      // TODO: Implement thumbnail generation

      // Create document record
      const documentData = {
        applicationId,
        filename: file.name,
        originalFilename: file.name,
        fileSize: file.size,
        contentType: file.type,
        filePath: fileKey, // This is our R2 key
        uploadedByType: 'client', // TODO: Determine based on user role
        uploadedById: session.session.userId,
        ...(requirementId ? { documentRequirementId: requirementId } : { customRequirementId })
      }

      // If replacing, delete existing document and cleanup old file
      if (replaceExisting) {
        await db
          .delete(applicationDocuments)
          .where(and(
            eq(applicationDocuments.applicationId, applicationId),
            requirementId ? eq(applicationDocuments.requirementId, requirementId) : 
                           eq(applicationDocuments.customRequirementId, customRequirementId!)
          ))

        // Clean up old file from R2
        if (existingFileKey) {
          try {
            await deleteFromR2(existingFileKey)
          } catch (error) {
            console.warn('Failed to delete old file from R2:', error)
            // Don't fail the upload if old file cleanup fails
          }
        }
      }

      const [uploadedDocument] = await db
        .insert(applicationDocuments)
        .values(documentData)
        .returning()

      return NextResponse.json({
        id: uploadedDocument.id,
        fileName: uploadedDocument.filename,
        originalName: uploadedDocument.originalFilename,
        fileSize: uploadedDocument.fileSize,
        fileType: uploadedDocument.contentType,
        fileUrl: uploadResult.url,
        uploadedAt: uploadedDocument.uploadedAt,
        uploadedBy: uploadedDocument.uploadedById,
        r2Key: uploadedDocument.filePath,
        status: 'uploaded'
      }, { status: 201 })

    } catch (uploadError) {
      console.error('Error uploading to R2:', uploadError)
      
      // Clean up the uploaded file if database insert fails
      try {
        await deleteFromR2(fileKey)
      } catch (cleanupError) {
        console.warn('Failed to cleanup file after upload error:', cleanupError)
      }
      
      return NextResponse.json(
        { error: 'Failed to upload document to storage' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error uploading document:', error)
    return NextResponse.json(
      { error: 'Failed to upload document' },
      { status: 500 }
    )
  }
}

// Get uploaded documents for an application
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const { searchParams } = new URL(request.url)
    const requirementId = searchParams.get('requirementId')

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Build query
    let query = db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))

    if (requirementId) {
      query = query.where(
        and(
          eq(applicationDocuments.applicationId, applicationId),
          eq(applicationDocuments.requirementId, requirementId)
        )
      )
    }

    const documents = await query

    return NextResponse.json({
      applicationId,
      documents: documents.map(doc => ({
        id: doc.id,
        fileName: doc.filename,
        originalName: doc.originalFilename,
        fileSize: doc.fileSize,
        fileType: doc.contentType,
        uploadedAt: doc.uploadedAt,
        uploadedBy: doc.uploadedById,
        requirementId: doc.documentRequirementId,
        customRequirementId: doc.customRequirementId,
        r2Key: doc.filePath
      }))
    })

  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}