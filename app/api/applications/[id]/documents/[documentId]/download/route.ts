import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { requireClientAuth } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments 
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { readFileSync } from 'fs'
import { join } from 'path'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; documentId: string }> }
) {
  const resolvedParams = await params
  console.log('=== DOCUMENT DOWNLOAD API CALLED ===')
  console.log('Application ID:', resolvedParams.id)
  console.log('Document ID:', resolvedParams.documentId)
  
  try {
    const { searchParams } = new URL(request.url)
    const forceDownload = searchParams.get('download') === 'true'
    
    const applicationId = resolvedParams.id
    const documentId = resolvedParams.documentId

    // Try agent authentication first, then client authentication
    let isAgent = false
    let userId = null
    
    try {
      const user = await requireAuth()
      isAgent = true
      userId = user.id
      console.log('Agent authenticated:', userId)
    } catch {
      try {
        const client = await requireClientAuth()
        isAgent = false
        userId = client.id
        console.log('Client authenticated:', userId)
      } catch {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
    }

    // Get application details
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // If client, verify they own this application
    if (!isAgent && application.clientId !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get the document
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

    console.log('Found document:', {
      id: document.id,
      filename: document.filename,
      filePath: document.filePath,
      mimeType: document.mimeType,
      fileSize: document.fileSize
    })

    // For now, since we're using local file storage, read the file from disk
    // Later this will be replaced with R2 signed URLs
    try {
      let fileBuffer: Buffer
      let mimeType = document.mimeType || 'application/octet-stream'
      
      if (document.filePath && document.filePath.startsWith('/')) {
        // Absolute path - read directly
        fileBuffer = readFileSync(document.filePath)
      } else {
        // Relative path - construct from uploads directory
        const uploadsDir = process.env.UPLOADS_DIR || join(process.cwd(), 'uploads')
        const fullPath = join(uploadsDir, document.filePath || document.filename)
        console.log('Reading file from:', fullPath)
        fileBuffer = readFileSync(fullPath)
      }

      // Set appropriate headers
      const headers = new Headers()
      headers.set('Content-Type', mimeType)
      headers.set('Content-Length', fileBuffer.length.toString())
      
      if (forceDownload) {
        headers.set('Content-Disposition', `attachment; filename="${document.filename}"`)
      } else {
        headers.set('Content-Disposition', `inline; filename="${document.filename}"`)
      }

      // Add cache headers for security
      headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
      headers.set('Pragma', 'no-cache')
      headers.set('Expires', '0')

      console.log(`Serving document: ${document.filename} (${fileBuffer.length} bytes)`)

      return new NextResponse(fileBuffer, {
        status: 200,
        headers
      })

    } catch (fileError) {
      console.error('Error reading file:', fileError)
      return NextResponse.json({ 
        error: 'File not found on disk',
        details: fileError instanceof Error ? fileError.message : 'Unknown file error'
      }, { status: 404 })
    }

  } catch (error) {
    console.error('Error processing document download:', error)
    return NextResponse.json(
      { 
        error: 'Failed to download document',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}