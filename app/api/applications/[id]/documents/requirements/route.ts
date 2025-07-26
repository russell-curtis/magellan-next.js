import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  documentRequirements,
  workflowStages,
  applicationDocuments,
  documentReviews,
  customDocumentRequirements
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

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
    const stageId = searchParams.get('stageId')

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Build query for document requirements
    let requirementsQuery = db
      .select({
        id: documentRequirements.id,
        documentName: documentRequirements.documentName,
        description: documentRequirements.description,
        category: documentRequirements.category,
        isRequired: documentRequirements.isRequired,
        isClientUploadable: documentRequirements.isClientUploadable,
        acceptedFormats: documentRequirements.acceptedFormats,
        maxFileSizeMB: documentRequirements.maxFileSizeMB,
        expirationMonths: documentRequirements.expirationMonths,
        displayGroup: documentRequirements.displayGroup,
        helpText: documentRequirements.helpText,
        sortOrder: documentRequirements.sortOrder,
        stageId: documentRequirements.stageId,
        stageName: workflowStages.stageName,
        stageOrder: workflowStages.stageOrder
      })
      .from(documentRequirements)
      .leftJoin(workflowStages, eq(documentRequirements.stageId, workflowStages.id))
      .where(eq(documentRequirements.programId, application.programId))

    if (stageId) {
      requirementsQuery = requirementsQuery.where(
        and(
          eq(documentRequirements.programId, application.programId),
          eq(documentRequirements.stageId, stageId)
        )
      )
    }

    const requirements = await requirementsQuery

    // Get custom document requirements for this application
    const customRequirements = await db
      .select()
      .from(customDocumentRequirements)
      .where(eq(customDocumentRequirements.applicationId, applicationId))

    // Get uploaded documents for this application
    const uploadedDocs = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))

    // Get document reviews
    const docReviews = await db
      .select()
      .from(documentReviews)
      .where(eq(documentReviews.applicationId, applicationId))

    // Combine standard and custom requirements with their status
    const enrichedRequirements = requirements.map(req => {
      const uploadedDoc = uploadedDocs.find(doc => doc.requirementId === req.id)
      const review = uploadedDoc ? docReviews.find(rev => rev.documentId === uploadedDoc.id) : null

      let status: 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired' = 'pending'
      
      if (uploadedDoc) {
        if (review) {
          status = review.status as 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired'
        } else {
          status = 'under_review'
        }
      }

      // Check for expiration
      if (uploadedDoc && req.expirationMonths && uploadedDoc.uploadedAt) {
        const expirationDate = new Date(uploadedDoc.uploadedAt)
        expirationDate.setMonth(expirationDate.getMonth() + req.expirationMonths)
        if (expirationDate < new Date()) {
          status = 'expired'
        }
      }

      return {
        id: req.id,
        documentName: req.documentName,
        description: req.description,
        category: req.category,
        isRequired: req.isRequired,
        isClientUploadable: req.isClientUploadable,
        acceptedFormats: req.acceptedFormats,
        maxFileSizeMB: req.maxFileSizeMB,
        expirationMonths: req.expirationMonths,
        displayGroup: req.displayGroup,
        helpText: req.helpText,
        sortOrder: req.sortOrder,
        stageId: req.stageId,
        stageName: req.stageName,
        stageOrder: req.stageOrder,
        status,
        uploadedAt: uploadedDoc?.uploadedAt,
        reviewedAt: review?.reviewedAt,
        rejectionReason: review?.rejectionReason,
        fileName: uploadedDoc?.fileName,
        fileSize: uploadedDoc?.fileSize,
        expiresAt: uploadedDoc && req.expirationMonths ? 
          new Date(new Date(uploadedDoc.uploadedAt).getTime() + (req.expirationMonths * 30 * 24 * 60 * 60 * 1000)).toISOString() : 
          null
      }
    })

    // Add custom requirements
    const enrichedCustomRequirements = customRequirements.map(req => {
      const uploadedDoc = uploadedDocs.find(doc => doc.customRequirementId === req.id)
      const review = uploadedDoc ? docReviews.find(rev => rev.documentId === uploadedDoc.id) : null

      let status: 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired' = 'pending'
      
      if (uploadedDoc) {
        if (review) {
          status = review.status as 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired'
        } else {
          status = 'under_review'
        }
      }

      return {
        id: req.id,
        documentName: req.documentName,
        description: req.description,
        category: req.category || 'other',
        isRequired: req.isRequired,
        isClientUploadable: req.isClientUploadable,
        acceptedFormats: req.acceptedFormats,
        maxFileSizeMB: req.maxFileSizeMB,
        expirationMonths: req.expirationMonths,
        displayGroup: req.displayGroup || 'Custom Requirements',
        helpText: req.helpText,
        sortOrder: req.sortOrder,
        stageId: null,
        stageName: null,
        stageOrder: null,
        status,
        uploadedAt: uploadedDoc?.uploadedAt,
        reviewedAt: review?.reviewedAt,
        rejectionReason: review?.rejectionReason,
        fileName: uploadedDoc?.fileName,
        fileSize: uploadedDoc?.fileSize,
        isCustom: true,
        customRequirementId: req.id
      }
    })

    const allRequirements = [...enrichedRequirements, ...enrichedCustomRequirements]

    // Group by stage if not filtering by specific stage
    if (!stageId) {
      const groupedByStage = allRequirements.reduce((groups, req) => {
        const stageKey = req.stageId || 'custom'
        const stageName = req.stageName || 'Custom Requirements'
        const stageOrder = req.stageOrder ?? 999

        if (!groups[stageKey]) {
          groups[stageKey] = {
            stageId: req.stageId,
            stageName,
            stageOrder,
            requirements: []
          }
        }
        groups[stageKey].requirements.push(req)
        return groups
      }, {} as Record<string, {
        stageId: string | null
        stageName: string
        stageOrder: number
        requirements: Array<Record<string, any>>
      }>)

      // Sort stages by order and requirements by sortOrder
      Object.values(groupedByStage).forEach((stage) => {
        stage.requirements.sort((a, b) => a.sortOrder - b.sortOrder)
      })

      const sortedStages = Object.values(groupedByStage).sort((a, b) => a.stageOrder - b.stageOrder)

      return NextResponse.json({
        applicationId,
        stageId,
        stages: sortedStages,
        totalRequirements: allRequirements.length,
        completedRequirements: allRequirements.filter(r => r.status === 'approved').length,
        pendingRequirements: allRequirements.filter(r => r.status === 'pending').length,
        underReviewRequirements: allRequirements.filter(r => r.status === 'under_review').length,
        rejectedRequirements: allRequirements.filter(r => r.status === 'rejected').length
      })
    } else {
      // Return requirements for specific stage
      const sortedRequirements = allRequirements.sort((a, b) => a.sortOrder - b.sortOrder)
      
      return NextResponse.json({
        applicationId,
        stageId,
        requirements: sortedRequirements,
        totalRequirements: sortedRequirements.length,
        completedRequirements: sortedRequirements.filter(r => r.status === 'approved').length,
        pendingRequirements: sortedRequirements.filter(r => r.status === 'pending').length,
        underReviewRequirements: sortedRequirements.filter(r => r.status === 'under_review').length,
        rejectedRequirements: sortedRequirements.filter(r => r.status === 'rejected').length
      })
    }

  } catch (error) {
    console.error('Error fetching document requirements:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document requirements' },
      { status: 500 }
    )
  }
}

// Add custom document requirement
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
    const body = await request.json()

    const {
      documentName,
      description,
      category = 'other',
      isRequired = true,
      isClientUploadable = true,
      acceptedFormats = ['pdf'],
      maxFileSizeMB = 10,
      expirationMonths,
      displayGroup = 'Custom Requirements',
      helpText,
      sortOrder = 1
    } = body

    // Validate required fields
    if (!documentName || !description) {
      return NextResponse.json(
        { error: 'documentName and description are required' },
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

    // TODO: Check if user has permission to add custom requirements

    // Create custom requirement
    const [customRequirement] = await db
      .insert(customDocumentRequirements)
      .values({
        applicationId,
        documentName,
        description,
        category,
        isRequired,
        isClientUploadable,
        acceptedFormats,
        maxFileSizeMB,
        expirationMonths,
        displayGroup,
        helpText,
        sortOrder,
        addedBy: session.session.userId
      })
      .returning()

    return NextResponse.json(customRequirement, { status: 201 })

  } catch (error) {
    console.error('Error adding custom document requirement:', error)
    return NextResponse.json(
      { error: 'Failed to add custom requirement' },
      { status: 500 }
    )
  }
}