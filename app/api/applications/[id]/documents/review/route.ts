import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  documentReviews 
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('=== DOCUMENT REVIEW API CALLED ===')
  console.log('Application ID:', resolvedParams.id)
  
  try {
    // Require agent authentication
    const user = await requireAuth()
    console.log('Agent authenticated:', user.id)
    const applicationId = resolvedParams.id

    // Parse request body
    const body = await request.json()
    const { documentId, action, reason, comments } = body

    console.log('Review action:', { documentId, action, reason, comments })
    console.log('Searching for document with ID:', documentId)
    console.log('In application:', applicationId)

    // Validate required fields
    if (!documentId || !action) {
      return NextResponse.json({ 
        error: 'Missing required fields: documentId and action' 
      }, { status: 400 })
    }

    // Validate action
    if (!['approve', 'reject', 'request_clarification'].includes(action)) {
      return NextResponse.json({ 
        error: 'Invalid action. Must be: approve, reject, or request_clarification' 
      }, { status: 400 })
    }

    // Get application details (agents can review any application)
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get the document to review
    console.log('Querying applicationDocuments table...')
    const [document] = await db
      .select()
      .from(applicationDocuments)
      .where(and(
        eq(applicationDocuments.id, documentId),
        eq(applicationDocuments.applicationId, applicationId)
      ))
      .limit(1)

    console.log('Document query result:', document)

    if (!document) {
      // Let's also check what documents exist for this application
      const allDocs = await db
        .select()
        .from(applicationDocuments)
        .where(eq(applicationDocuments.applicationId, applicationId))
      
      console.log('All documents for this application:', allDocs.map(d => ({ id: d.id, filename: d.filename, requirementId: d.documentRequirementId })))
      
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Create review record
    const [reviewResult] = await db
      .insert(documentReviews)
      .values({
        documentId: documentId,
        reviewerId: user.id,
        reviewType: 'initial',
        reviewResult: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'needs_revision',
        reviewNotes: comments || null,
        rejectionReason: action === 'reject' ? reason : null,
        feedback: comments || null
      })
      .returning()

    // Update document status based on action
    let newStatus: string
    switch (action) {
      case 'approve':
        newStatus = 'approved'
        break
      case 'reject':
        newStatus = 'rejected'
        break
      case 'request_clarification':
        newStatus = 'clarification_requested'
        break
      default:
        newStatus = 'under_review'
    }

    // Update the document status
    await db
      .update(applicationDocuments)
      .set({ 
        status: newStatus,
        reviewedAt: new Date(),
        reviewedBy: user.id
      })
      .where(eq(applicationDocuments.id, documentId))

    console.log(`Document ${documentId} ${action}ed by ${user.email}`)

    return NextResponse.json({
      success: true,
      review: reviewResult,
      newStatus,
      message: `Document ${action}ed successfully`
    })

  } catch (error) {
    console.error('Error processing document review:', error)
    return NextResponse.json(
      { 
        error: 'Failed to process document review',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('=== GET DOCUMENT REVIEWS API CALLED ===')
  console.log('Application ID:', resolvedParams.id)
  
  try {
    // Require agent authentication
    const user = await requireAuth()
    const applicationId = resolvedParams.id

    // Get all reviews for this application
    const reviews = await db
      .select({
        id: documentReviews.id,
        documentId: documentReviews.applicationDocumentId,
        reviewerId: documentReviews.reviewerId,
        reviewerName: documentReviews.reviewerName,
        action: documentReviews.action,
        reason: documentReviews.reason,
        comments: documentReviews.comments,
        reviewedAt: documentReviews.reviewedAt,
        documentName: applicationDocuments.filename,
        requirementId: applicationDocuments.documentRequirementId
      })
      .from(documentReviews)
      .innerJoin(applicationDocuments, eq(documentReviews.applicationDocumentId, applicationDocuments.id))
      .where(eq(applicationDocuments.applicationId, applicationId))
      .orderBy(desc(documentReviews.reviewedAt))

    return NextResponse.json({
      applicationId,
      reviews
    })

  } catch (error) {
    console.error('Error fetching document reviews:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch document reviews',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}