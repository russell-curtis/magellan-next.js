import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  clients,
  users
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { generateSignedUrl } from '@/lib/r2-storage'

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
    const { searchParams } = new URL(request.url)
    const download = searchParams.get('download') === 'true'
    const expiresIn = parseInt(searchParams.get('expiresIn') || '3600') // Default 1 hour

    // Get application and verify access
    const [application] = await db
      .select({
        id: applications.id,
        clientId: applications.clientId,
        firmId: clients.firmId
      })
      .from(applications)
      .innerJoin(clients, eq(applications.clientId, clients.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get current user to check access permissions
    const [currentUser] = await db
      .select({
        id: users.id,
        firmId: users.firmId,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check access permissions
    const hasAccess = 
      // User is from the same firm (advisor/admin access)
      currentUser.firmId === application.firmId ||
      // User is the client who owns this application
      (currentUser.role === 'client' && currentUser.id === application.clientId)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

    if (!document.filePath) {
      return NextResponse.json({ 
        error: 'Document is not available for download' 
      }, { status: 400 })
    }

    try {
      // Generate signed URL for secure access
      const signedUrl = await generateSignedUrl(document.filePath, {
        expiresIn,
        fileName: document.originalFilename || document.filename,
        contentDisposition: download ? 'attachment' : 'inline'
      })

      return NextResponse.json({
        downloadUrl: signedUrl,
        fileName: document.originalFilename || document.filename,
        fileSize: document.fileSize,
        fileType: document.contentType,
        expiresIn,
        expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString()
      })

    } catch (error) {
      console.error('Error generating signed URL:', error)
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('Error processing download request:', error)
    return NextResponse.json(
      { error: 'Failed to process download request' },
      { status: 500 }
    )
  }
}