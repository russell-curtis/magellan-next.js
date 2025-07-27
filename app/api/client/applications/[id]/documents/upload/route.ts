import { NextRequest, NextResponse } from 'next/server'
import { requireClientAuth } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  documentRequirements
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { DocumentQualityValidator, DocumentQualityResult } from '@/lib/document-validation'
// Simple file validation function
function validateFile(
  file: File,
  options: { maxSizeMB: number; allowedTypes: string[] }
): { valid: boolean; error?: string } {
  // Check if file object is valid
  if (!file || typeof file !== 'object') {
    return {
      valid: false,
      error: 'Invalid file object'
    }
  }

  // Check if file has required properties
  if (typeof file.size !== 'number') {
    return {
      valid: false,
      error: 'File size is not available'
    }
  }

  if (!file.name || typeof file.name !== 'string') {
    return {
      valid: false,
      error: 'File name is not available'
    }
  }

  // Check file size
  const fileSizeMB = file.size / (1024 * 1024)
  if (fileSizeMB > options.maxSizeMB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size of ${options.maxSizeMB}MB`
    }
  }

  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase()
  if (!fileExtension || !options.allowedTypes.includes(fileExtension)) {
    return {
      valid: false,
      error: `File format .${fileExtension || 'unknown'} is not supported. Accepted formats: ${options.allowedTypes.join(', ')}`
    }
  }

  return { valid: true }
}

import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== CLIENT UPLOAD API ENDPOINT HIT ===')
  console.log('Application ID:', params.id)
  console.log('Request method:', request.method)
  console.log('Content-Type:', request.headers.get('content-type'))
  console.log('Request headers:', Object.fromEntries(request.headers.entries()))
  
  // Check if it's actually multipart/form-data
  const contentType = request.headers.get('content-type')
  if (!contentType?.includes('multipart/form-data')) {
    console.error('Not multipart/form-data request:', contentType)
    return NextResponse.json({ 
      error: 'Invalid content type. Expected multipart/form-data.',
      received: contentType 
    }, { status: 400 })
  }
  
  try {
    
    let client
    try {
      client = await requireClientAuth()
      console.log('Client authenticated:', client.id)
    } catch (authError) {
      console.error('Client authentication failed:', authError)
      return NextResponse.json({ 
        error: 'Client authentication required',
        details: authError instanceof Error ? authError.message : 'Authentication failed'
      }, { status: 401 })
    }

    const applicationId = params.id
    
    let formData
    try {
      formData = await request.formData()
      console.log('FormData successfully parsed')
    } catch (error) {
      console.error('Error parsing FormData:', error)
      return NextResponse.json({ error: 'Failed to parse form data' }, { status: 400 })
    }
    
    console.log('FormData entries:')
    const entries = Array.from(formData.entries())
    console.log('Total entries:', entries.length)
    
    for (const [key, value] of entries) {
      console.log(`- ${key}:`, {
        type: typeof value,
        constructor: value?.constructor?.name,
        isFile: value instanceof File,
        isBlob: value instanceof Blob,
        size: value?.size,
        name: value?.name
      })
    }
    
    const file = formData.get('file')
    const requirementId = formData.get('requirementId') as string
    const replaceExisting = formData.get('replaceExisting') === 'true'

    console.log('Extracted values:', {
      hasFile: !!file,
      fileDetails: file ? {
        type: typeof file,
        constructor: file.constructor?.name,
        isFile: file instanceof File,
        isBlob: file instanceof Blob,
        size: file.size,
        name: file.name
      } : null,
      requirementId,
      replaceExisting,
      replaceExistingRaw: formData.get('replaceExisting'),
      replaceExistingType: typeof formData.get('replaceExisting')
    })

    // More flexible file check - accept both File and Blob
    if (!file || (!(file instanceof File) && !(file instanceof Blob))) {
      console.error('No valid file received. File:', file)
      return NextResponse.json({ 
        error: 'No valid file uploaded. Expected File or Blob object.',
        received: file ? file.constructor?.name : 'null'
      }, { status: 400 })
    }

    // Convert to File if it's a Blob but not a File
    let actualFile: File
    if (file instanceof File) {
      actualFile = file
    } else if (file instanceof Blob) {
      // Create a File from Blob with a default name
      actualFile = new File([file], 'uploaded-file', { type: file.type })
      console.log('Converted Blob to File:', actualFile.name)
    } else {
      console.error('File is neither File nor Blob:', file)
      return NextResponse.json({ error: 'Invalid file type received' }, { status: 400 })
    }

    if (!requirementId) {
      console.error('No requirementId provided')
      return NextResponse.json({ 
        error: 'requirementId is required' 
      }, { status: 400 })
    }

    // Get application and verify it belongs to this client
    console.log('Looking up application:', applicationId, 'for client:', client.id)
    const [application] = await db
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.id) // This is already correct
      ))
      .limit(1)

    if (!application) {
      console.error('Application not found or access denied:', { applicationId, clientId: client.id })
      return NextResponse.json({ error: 'Application not found or access denied' }, { status: 404 })
    }
    
    console.log('Application found:', application.id)

    // Verify requirement exists and get validation rules  
    console.log('Looking up document requirement:', requirementId)
    
    // Check if requirementId is a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    let requirement = null
    
    if (uuidRegex.test(requirementId)) {
      const [dbRequirement] = await db
        .select()
        .from(documentRequirements)
        .where(eq(documentRequirements.id, requirementId))
        .limit(1)
      requirement = dbRequirement
    }
    
    // If no requirement found in DB (or it's a mock ID), create default validation rules
    if (!requirement) {
      console.log('Using default validation rules for requirement:', requirementId)
      requirement = {
        id: requirementId,
        acceptedFormats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'],
        maxFileSizeMB: 10,
        documentName: 'Generic Document',
        isRequired: true
      }
    }
    
    console.log('Using requirement:', requirement.documentName, 'with formats:', requirement.acceptedFormats)

    // Validate file against requirements
    const validation = validateFile(actualFile, {
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
          eq(applicationDocuments.documentRequirementId, requirementId)
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
          eq(applicationDocuments.documentRequirementId, requirementId)
        ))
        .limit(1)

      if (existingDoc) {
        existingFileKey = existingDoc.filePath
      }
    }

    // Generate file key and store locally (temporary solution)
    const timestamp = Date.now()
    const randomId = Math.random().toString(36).substring(7)
    const fileKey = `documents/${applicationId}/${timestamp}-${randomId}-${actualFile.name}`
    
    try {
      // Store file locally for testing
      const uploadsDir = join(process.cwd(), 'uploads', 'documents', applicationId)
      if (!existsSync(uploadsDir)) {
        await mkdir(uploadsDir, { recursive: true })
      }
      
      const arrayBuffer = await actualFile.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      const filePath = join(uploadsDir, `${timestamp}-${randomId}-${actualFile.name}`)
      
      await writeFile(filePath, buffer)
      
      const uploadResult = {
        key: fileKey,
        url: `/uploads/${fileKey}`,
        size: actualFile.size,
        contentType: actualFile.type,
        etag: 'local-' + randomId
      }

      // Perform quality validation
      console.log('Performing quality validation...')
      let qualityResult: DocumentQualityResult | null = null
      
      try {
        const fileBuffer = Buffer.from(await actualFile.arrayBuffer())
        const documentType = requirement?.documentName || 'Document'
        
        qualityResult = await DocumentQualityValidator.validateDocument(
          fileBuffer,
          actualFile.name,
          documentType
        )
        
        console.log('Quality validation result:', {
          isValid: qualityResult.isValid,
          quality: qualityResult.quality,
          issueCount: qualityResult.issues.length
        })
      } catch (validationError) {
        console.error('Quality validation failed:', validationError)
        // Continue with upload even if validation fails
        qualityResult = {
          isValid: false,
          quality: 'poor',
          issues: [{
            type: 'readability',
            severity: 'warning',
            message: 'Quality validation could not be performed',
            suggestion: 'Manual review recommended'
          }],
          recommendations: ['Manual review recommended'],
          metadata: {
            fileSize: actualFile.size,
            format: actualFile.name.split('.').pop()?.toLowerCase() || 'unknown'
          }
        }
      }

      // Create document record with quality validation results
      const documentData = {
        applicationId,
        // Only include documentRequirementId if it's a valid UUID
        ...(uuidRegex.test(requirementId) ? { documentRequirementId: requirementId } : {}),
        filename: actualFile.name,
        originalFilename: actualFile.name,
        fileSize: actualFile.size,
        contentType: actualFile.type,
        filePath: fileKey, // This is our R2 key
        uploadedByType: 'client' as const,
        uploadedById: client.id,
        // Quality validation data
        qualityValidated: true,
        qualityScore: qualityResult.quality,
        qualityIssues: qualityResult.issues,
        qualityMetadata: qualityResult.metadata,
      }
      
      console.log('Creating document record:', { 
        hasRequirementId: !!documentData.documentRequirementId,
        filename: documentData.filename 
      })

      // If replacing, delete existing document and cleanup old file
      if (replaceExisting) {
        await db
          .delete(applicationDocuments)
          .where(and(
            eq(applicationDocuments.applicationId, applicationId),
            eq(applicationDocuments.documentRequirementId, requirementId)
          ))

        // Clean up old file (local storage)
        if (existingFileKey) {
          try {
            // For local storage, we'll skip cleanup for now
            console.log('Would delete old file:', existingFileKey)
          } catch (error) {
            console.warn('Failed to delete old file:', error)
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
        status: 'uploaded',
        // Include quality validation results
        qualityValidation: {
          validated: uploadedDocument.qualityValidated,
          score: uploadedDocument.qualityScore,
          issues: uploadedDocument.qualityIssues,
          metadata: uploadedDocument.qualityMetadata
        }
      }, { status: 201 })

    } catch (uploadError) {
      console.error('Error uploading file:', uploadError)
      
      return NextResponse.json(
        { error: 'Failed to upload document to storage' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error uploading document:', error)
    
    // Provide more specific error messages
    let errorMessage = 'Failed to upload document'
    if (error instanceof Error) {
      errorMessage = error.message
      console.error('Error details:', error.stack)
    }
    
    return NextResponse.json(
      { error: errorMessage, details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}