import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { documents, clients, applications, users } from '@/db/schema'
import { eq, desc, and, or, ilike, sql } from 'drizzle-orm'
import { z } from 'zod'

const documentFilterSchema = z.object({
  clientId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  documentType: z.string().optional(),
  status: z.string().optional(),
  complianceStatus: z.string().optional(),
  search: z.string().optional(),
  limit: z.preprocess(
    (val) => val ? parseInt(String(val)) : 50,
    z.number().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    (val) => val ? parseInt(String(val)) : 0,
    z.number().min(0).default(0)
  )
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(request.url)
    
    const filters = documentFilterSchema.parse(Object.fromEntries(searchParams))

    // Build dynamic query conditions
    const conditions = [eq(documents.firmId, user.firmId)]
    
    if (filters.clientId) {
      conditions.push(eq(documents.clientId, filters.clientId))
    }
    
    if (filters.applicationId) {
      conditions.push(eq(documents.applicationId, filters.applicationId))
    }
    
    if (filters.documentType) {
      conditions.push(eq(documents.documentType, filters.documentType))
    }
    
    if (filters.status) {
      conditions.push(eq(documents.status, filters.status))
    }
    
    if (filters.complianceStatus) {
      conditions.push(eq(documents.complianceStatus, filters.complianceStatus))
    }
    
    if (filters.search) {
      conditions.push(
        or(
          ilike(documents.filename, `%${filters.search}%`),
          ilike(documents.originalFilename, `%${filters.search}%`),
          ilike(documents.documentType, `%${filters.search}%`)
        )!
      )
    }

    // Fetch documents with related data
    const documentsWithRelations = await db
      .select({
        document: documents,
        client: {
          id: clients.id,
          name: sql<string>`concat(${clients.firstName}, ' ', ${clients.lastName})`.as('name'),
          firstName: clients.firstName,
          lastName: clients.lastName
        },
        application: {
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          status: applications.status
        },
        uploadedBy: {
          id: users.id,
          name: users.name,
          email: users.email
        }
      })
      .from(documents)
      .leftJoin(clients, eq(documents.clientId, clients.id))
      .leftJoin(applications, eq(documents.applicationId, applications.id))
      .leftJoin(users, eq(documents.uploadedById, users.id))
      .where(and(...conditions))
      .orderBy(desc(documents.createdAt))
      .limit(filters.limit)
      .offset(filters.offset)

    // Transform the results
    const formattedDocuments = documentsWithRelations.map((row) => ({
      id: row.document.id,
      filename: row.document.filename,
      originalFilename: row.document.originalFilename,
      fileUrl: row.document.fileUrl,
      fileSize: row.document.fileSize,
      contentType: row.document.contentType,
      documentType: row.document.documentType,
      category: row.document.category,
      description: row.document.description,
      status: row.document.status,
      complianceStatus: row.document.complianceStatus,
      complianceNotes: row.document.complianceNotes,
      version: row.document.version,
      isLatestVersion: row.document.isLatestVersion,
      expiresAt: row.document.expiresAt?.toISOString() || null,
      createdAt: row.document.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: row.document.updatedAt?.toISOString() || new Date().toISOString(),
      client: row.client?.id ? {
        id: row.client.id,
        name: row.client.name,
        firstName: row.client.firstName,
        lastName: row.client.lastName
      } : null,
      application: row.application?.id ? {
        id: row.application.id,
        applicationNumber: row.application.applicationNumber,
        status: row.application.status
      } : null,
      uploadedBy: row.uploadedBy?.id ? {
        id: row.uploadedBy.id,
        name: row.uploadedBy.name,
        email: row.uploadedBy.email
      } : null
    }))

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: sql<number>`count(*)`.as('count') })
      .from(documents)
      .leftJoin(clients, eq(documents.clientId, clients.id))
      .leftJoin(applications, eq(documents.applicationId, applications.id))
      .where(and(...conditions))

    const totalCount = totalCountResult[0]?.count || 0

    return NextResponse.json({
      documents: formattedDocuments,
      pagination: {
        total: totalCount,
        limit: filters.limit,
        offset: filters.offset,
        hasMore: filters.offset + filters.limit < totalCount
      }
    })

  } catch (error) {
    console.error('Documents fetch error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid filters', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to fetch documents' },
      { status: 500 }
    )
  }
}