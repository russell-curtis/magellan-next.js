import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  applicationDocuments,
  documentReviews,
  users
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// Submit a document review (approve, reject, or request clarification)
export async function POST(
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

    const { 
      status, 
      comments, 
      rejectionReason, 
      priority = 'medium' 
    } = body

    // Validate input
    if (!status || !['approved', 'rejected', 'needs_clarification'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (approved, rejected, needs_clarification)' },
        { status: 400 }
      )
    }

    if (status === 'rejected' && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a document' },
        { status: 400 }
      )
    }

    if (status === 'needs_clarification' && !comments) {
      return NextResponse.json(
        { error: 'Comments are required when requesting clarification' },
        { status: 400 }
      )
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

    // TODO: Check if user has permission to review documents

    // Check if there's already a review for this document
    // const [existingReview] = await db
    //   .select()
    //   .from(documentReviews)
    //   .where(eq(documentReviews.documentId, documentId))
    //   .orderBy(desc(documentReviews.reviewedAt))
    //   .limit(1)

    // Create new review record
    const [review] = await db
      .insert(documentReviews)
      .values({
        documentId,
        applicationId,
        requirementId: document.requirementId,
        customRequirementId: document.customRequirementId,
        status,
        reviewedBy: session.session.userId,
        comments,
        rejectionReason,
        priority,
        reviewedAt: new Date()
      })
      .returning()

    // Get reviewer info
    const [reviewer] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email
      })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    return NextResponse.json({
      id: review.id,
      documentId: review.documentId,
      applicationId: review.applicationId,
      status: review.status,
      comments: review.comments,
      rejectionReason: review.rejectionReason,
      priority: review.priority,
      reviewedAt: review.reviewedAt,
      reviewedBy: {
        id: reviewer?.id,
        name: reviewer?.name,
        email: reviewer?.email
      }
    }, { status: 201 })

  } catch (error) {
    console.error('Error submitting document review:', error)
    return NextResponse.json(
      { error: 'Failed to submit review' },
      { status: 500 }
    )
  }
}

// Get review history for a document
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

    // Get all reviews for this document with reviewer info
    const reviews = await db
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

    // Get current status (most recent review)
    const currentStatus = reviews.length > 0 ? reviews[0].status : 'pending'

    return NextResponse.json({
      documentId,
      currentStatus,
      reviewCount: reviews.length,
      reviews: reviews.map(review => ({
        id: review.id,
        status: review.status,
        comments: review.comments,
        rejectionReason: review.rejectionReason,
        priority: review.priority,
        reviewedAt: review.reviewedAt,
        reviewedBy: {
          name: review.reviewerName,
          email: review.reviewerEmail
        }
      }))
    })

  } catch (error) {
    console.error('Error fetching document reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}