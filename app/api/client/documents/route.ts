import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/db/drizzle'
import { auth } from '@/lib/auth'
import { 
  applications, 
  clients, 
  documentRequirements, 
  applicationDocuments,
  crbiPrograms
} from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

// Validation schemas
const documentsQuerySchema = z.object({
  applicationId: z.string().optional(),
  category: z.enum(['investment', 'application', 'process', 'information', 'personal', 'financial']).optional(),
  status: z.enum(['pending', 'uploaded', 'under_review', 'approved', 'rejected']).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
})

export async function GET(request: NextRequest) {
  try {
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
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const query = documentsQuerySchema.safeParse({
      applicationId: searchParams.get('applicationId'),
      category: searchParams.get('category'),
      status: searchParams.get('status'),
      search: searchParams.get('search'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset')
    })

    if (!query.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters',
        details: query.error.issues 
      }, { status: 400 })
    }

    const { applicationId, category, status, search, limit, offset } = query.data

    // Build base query for client's documents
    let documentsQuery = db
      .select({
        // Document info
        documentId: applicationDocuments.id,
        fileName: applicationDocuments.filename,
        fileUrl: applicationDocuments.filePath,
        fileSize: applicationDocuments.fileSize,
        contentType: applicationDocuments.contentType,
        uploadedAt: applicationDocuments.uploadedAt,
        status: documentRequirements.status,
        
        // Requirement info
        requirementId: documentRequirements.id,
        documentName: documentRequirements.documentName,
        description: documentRequirements.description,
        category: documentRequirements.category,
        isRequired: documentRequirements.isRequired,
        
        // Application info
        applicationId: applications.id,
        applicationNumber: applications.applicationNumber,
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        
        // Additional metadata
        reviewedAt: documentRequirements.reviewedAt,
        reviewComments: documentRequirements.reviewComments
      })
      .from(documentRequirements)
      .innerJoin(applications, eq(documentRequirements.applicationId, applications.id))
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .leftJoin(applicationDocuments, eq(documentRequirements.id, applicationDocuments.documentRequirementId))
      .where(and(
        eq(applications.clientId, client.id),
        // Only include requirements that have uploaded documents or are from specific applications
        applicationId ? eq(applications.id, applicationId) : sql`1=1`
      ))

    // Apply filters
    if (category) {
      documentsQuery = documentsQuery.where(eq(documentRequirements.category, category))
    }

    if (status) {
      documentsQuery = documentsQuery.where(eq(documentRequirements.status, status))
    }

    if (search) {
      documentsQuery = documentsQuery.where(
        sql`(
          ${documentRequirements.documentName} ILIKE ${`%${search}%`} OR
          ${documentRequirements.description} ILIKE ${`%${search}%`} OR
          ${applicationDocuments.filename} ILIKE ${`%${search}%`}
        )`
      )
    }

    // Apply pagination and ordering
    const documents = await documentsQuery
      .orderBy(desc(applicationDocuments.uploadedAt), desc(documentRequirements.updatedAt))
      .limit(limit)
      .offset(offset)

    // Get document statistics for the client
    const statsQuery = await db
      .select({
        category: documentRequirements.category,
        status: documentRequirements.status,
        count: sql<number>`count(*)`
      })
      .from(documentRequirements)
      .innerJoin(applications, eq(documentRequirements.applicationId, applications.id))
      .leftJoin(applicationDocuments, eq(documentRequirements.id, applicationDocuments.documentRequirementId))
      .where(eq(applications.clientId, client.id))
      .groupBy(documentRequirements.category, documentRequirements.status)

    // Process statistics
    const stats = {
      byCategory: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
      total: 0
    }

    statsQuery.forEach(stat => {
      stats.byCategory[stat.category] = (stats.byCategory[stat.category] || 0) + stat.count
      stats.byStatus[stat.status] = (stats.byStatus[stat.status] || 0) + stat.count
      stats.total += stat.count
    })

    // Get recent activity (last 10 document updates)
    const recentActivity = await db
      .select({
        documentName: documentRequirements.documentName,
        status: documentRequirements.status,
        updatedAt: documentRequirements.updatedAt,
        applicationNumber: applications.applicationNumber,
        programName: crbiPrograms.programName
      })
      .from(documentRequirements)
      .innerJoin(applications, eq(documentRequirements.applicationId, applications.id))
      .innerJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.clientId, client.id))
      .orderBy(desc(documentRequirements.updatedAt))
      .limit(10)

    return NextResponse.json({
      documents,
      stats,
      recentActivity,
      pagination: {
        limit,
        offset,
        hasMore: documents.length === limit
      }
    })

  } catch (error) {
    console.error('Error fetching client documents:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get document requirements for a specific application (for upload purposes)
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    })

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    const { applicationId } = z.object({
      applicationId: z.string()
    }).parse(body)

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

    // Verify client owns this application
    const application = await db
      .select()
      .from(applications)  
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.id)
      ))
      .limit(1)

    if (!application.length) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get all document requirements for this application
    const requirements = await db
      .select({
        id: documentRequirements.id,
        documentName: documentRequirements.documentName,
        description: documentRequirements.description,
        category: documentRequirements.category,
        isRequired: documentRequirements.isRequired,
        status: documentRequirements.status,
        acceptedFormats: documentRequirements.acceptedFormats,
        maxFileSizeMB: documentRequirements.maxFileSizeMB,
        stageId: documentRequirements.stageId,
        
        // File info if uploaded
        fileName: applicationDocuments.filename,
        fileUrl: applicationDocuments.filePath,
        fileSize: applicationDocuments.fileSize,
        uploadedAt: applicationDocuments.uploadedAt
      })
      .from(documentRequirements)
      .leftJoin(applicationDocuments, eq(documentRequirements.id, applicationDocuments.documentRequirementId))
      .where(eq(documentRequirements.applicationId, applicationId))
      .orderBy(documentRequirements.sortOrder, documentRequirements.documentName)

    return NextResponse.json({
      applicationId,
      requirements
    })

  } catch (error) {
    console.error('Error fetching document requirements:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request data',
        details: error.issues 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}