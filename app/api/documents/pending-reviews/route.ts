import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applicationDocuments,
  applications,
  clients,
  crbiPrograms,
  documentRequirements,
  customDocumentRequirements,
  documentReviews,
  users
} from '@/db/schema'
import { eq, and, isNull, or, desc, sql } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const priority = searchParams.get('priority')
    const status = searchParams.get('status') || 'pending'
    const offset = (page - 1) * limit

    // Get current user's firm
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const firmId = currentUser.firmId

    // Base query for documents that need review
    let baseQuery = db
      .select({
        documentId: applicationDocuments.id,
        fileName: applicationDocuments.fileName,
        fileSize: applicationDocuments.fileSize,
        fileType: applicationDocuments.fileType,
        uploadedAt: applicationDocuments.uploadedAt,
        uploaderName: sql<string>`uploader.name`,
        applicationId: applications.id,
        applicationStatus: applications.status,
        clientId: clients.id,
        clientName: clients.name,
        clientEmail: clients.email,
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        requirementName: sql<string>`COALESCE(${documentRequirements.documentName}, ${customDocumentRequirements.documentName})`,
        requirementCategory: sql<string>`COALESCE(${documentRequirements.category}, ${customDocumentRequirements.category})`,
        isRequired: sql<boolean>`COALESCE(${documentRequirements.isRequired}, ${customDocumentRequirements.isRequired})`,
        reviewStatus: documentReviews.status,
        reviewPriority: documentReviews.priority,
        lastReviewedAt: documentReviews.reviewedAt,
        reviewerName: sql<string>`reviewer.name`
      })
      .from(applicationDocuments)
      .innerJoin(applications, eq(applicationDocuments.applicationId, applications.id))
      .innerJoin(clients, eq(applications.clientId, clients.id))
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .leftJoin(users.as('uploader'), eq(applicationDocuments.uploadedBy, users.id))
      .leftJoin(documentRequirements, eq(applicationDocuments.requirementId, documentRequirements.id))
      .leftJoin(customDocumentRequirements, eq(applicationDocuments.customRequirementId, customDocumentRequirements.id))
      .leftJoin(
        documentReviews, 
        and(
          eq(documentReviews.documentId, applicationDocuments.id),
          eq(documentReviews.id, 
            sql`(SELECT MAX(id) FROM ${documentReviews} WHERE document_id = ${applicationDocuments.id})`
          )
        )
      )
      .leftJoin(users.as('reviewer'), eq(documentReviews.reviewedBy, users.id))
      .where(eq(clients.firmId, firmId))

    // Filter by status
    if (status === 'pending') {
      baseQuery = baseQuery.where(
        or(
          isNull(documentReviews.status),
          eq(documentReviews.status, 'needs_clarification')
        )
      )
    } else if (status !== 'all') {
      baseQuery = baseQuery.where(eq(documentReviews.status, status))
    }

    // Filter by priority if specified
    if (priority && priority !== 'all') {
      baseQuery = baseQuery.where(eq(documentReviews.priority, priority))
    }

    // Get total count for pagination
    const countQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(applicationDocuments)
      .innerJoin(applications, eq(applicationDocuments.applicationId, applications.id))
      .innerJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(
        documentReviews, 
        and(
          eq(documentReviews.documentId, applicationDocuments.id),
          eq(documentReviews.id, 
            sql`(SELECT MAX(id) FROM ${documentReviews} WHERE document_id = ${applicationDocuments.id})`
          )
        )
      )
      .where(eq(clients.firmId, firmId))

    if (status === 'pending') {
      countQuery.where(
        or(
          isNull(documentReviews.status),
          eq(documentReviews.status, 'needs_clarification')
        )
      )
    } else if (status !== 'all') {
      countQuery.where(eq(documentReviews.status, status))
    }

    if (priority && priority !== 'all') {
      countQuery.where(eq(documentReviews.priority, priority))
    }

    // Execute queries
    const [{ count: totalCount }] = await countQuery
    const documents = await baseQuery
      .orderBy(
        desc(sql`CASE 
          WHEN ${documentReviews.priority} = 'urgent' THEN 4
          WHEN ${documentReviews.priority} = 'high' THEN 3  
          WHEN ${documentReviews.priority} = 'medium' THEN 2
          ELSE 1
        END`),
        desc(applicationDocuments.uploadedAt)
      )
      .limit(limit)
      .offset(offset)

    // Format response
    const formattedDocuments = documents.map(doc => ({
      id: doc.documentId,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      fileType: doc.fileType,
      uploadedAt: doc.uploadedAt,
      uploadedBy: doc.uploaderName,
      application: {
        id: doc.applicationId,
        status: doc.applicationStatus,
        program: `${doc.countryName} - ${doc.programName}`
      },
      client: {
        id: doc.clientId,
        name: doc.clientName,
        email: doc.clientEmail
      },
      requirement: {
        name: doc.requirementName,
        category: doc.requirementCategory,
        isRequired: doc.isRequired
      },
      review: doc.reviewStatus ? {
        status: doc.reviewStatus,
        priority: doc.reviewPriority || 'medium',
        reviewedAt: doc.lastReviewedAt,
        reviewedBy: doc.reviewerName
      } : null,
      currentStatus: doc.reviewStatus || 'pending',
      priority: doc.reviewPriority || 'medium'
    }))

    // Calculate summary statistics
    const stats = {
      total: totalCount,
      pending: 0,
      approved: 0,
      rejected: 0,
      needsClarification: 0
    }

    // Get status counts
    const statusCounts = await db
      .select({
        status: documentReviews.status,
        count: sql<number>`count(*)`
      })
      .from(applicationDocuments)
      .innerJoin(applications, eq(applicationDocuments.applicationId, applications.id))
      .innerJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(
        documentReviews,
        and(
          eq(documentReviews.documentId, applicationDocuments.id),
          eq(documentReviews.id,
            sql`(SELECT MAX(id) FROM ${documentReviews} WHERE document_id = ${applicationDocuments.id})`
          )
        )
      )
      .where(eq(clients.firmId, firmId))
      .groupBy(documentReviews.status)

    // Update stats
    statusCounts.forEach(({ status, count }) => {
      switch (status) {
        case 'approved':
          stats.approved = count
          break
        case 'rejected':
          stats.rejected = count
          break
        case 'needs_clarification':
          stats.needsClarification = count
          break
        case null:
        default:
          stats.pending += count
          break
      }
    })

    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasNextPage: page * limit < totalCount,
        hasPreviousPage: page > 1
      },
      filters: {
        status,
        priority
      },
      stats
    })

  } catch (error) {
    console.error('Error fetching pending reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pending reviews' },
      { status: 500 }
    )
  }
}