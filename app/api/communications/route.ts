import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { communications, clients, users } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()

    const searchParams = request.nextUrl.searchParams
    const clientId = searchParams.get('clientId')
    const applicationId = searchParams.get('applicationId')
    const type = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Apply filters
    const conditions = []
    if (clientId) {
      conditions.push(eq(communications.clientId, clientId))
    }
    if (applicationId) {
      conditions.push(eq(communications.applicationId, applicationId))
    }
    if (type) {
      conditions.push(eq(communications.type, type))
    }

    const baseQuery = db
      .select({
        id: communications.id,
        type: communications.type,
        subject: communications.subject,
        content: communications.content,
        direction: communications.direction,
        occurredAt: communications.occurredAt,
        createdAt: communications.createdAt,
        clientId: communications.clientId,
        applicationId: communications.applicationId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(communications)
      .leftJoin(clients, eq(communications.clientId, clients.id))
      .leftJoin(users, eq(communications.userId, users.id))

    let result
    if (conditions.length > 0) {
      result = await baseQuery
        .where(and(...conditions))
        .orderBy(desc(communications.occurredAt))
        .limit(limit)
        .offset(offset)
    } else {
      result = await baseQuery
        .orderBy(desc(communications.occurredAt))
        .limit(limit)
        .offset(offset)
    }

    return NextResponse.json({
      communications: result,
      total: result.length,
      hasMore: result.length === limit,
    })
  } catch (error) {
    console.error('Error fetching communications:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch communications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const { clientId, applicationId, type, subject, content, direction } = body

    if (!clientId || !type || !content || !direction) {
      return NextResponse.json(
        { error: 'Missing required fields: clientId, type, content, direction' },
        { status: 400 }
      )
    }

    const [newCommunication] = await db
      .insert(communications)
      .values({
        firmId: user.firmId,
        clientId,
        applicationId: applicationId || null,
        userId: user.id,
        type,
        subject: subject || null,
        content,
        direction,
        occurredAt: new Date(),
      })
      .returning()

    // Fetch the complete communication with relations
    const result = await db
      .select({
        id: communications.id,
        type: communications.type,
        subject: communications.subject,
        content: communications.content,
        direction: communications.direction,
        occurredAt: communications.occurredAt,
        createdAt: communications.createdAt,
        clientId: communications.clientId,
        applicationId: communications.applicationId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
        user: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(communications)
      .leftJoin(clients, eq(communications.clientId, clients.id))
      .leftJoin(users, eq(communications.userId, users.id))
      .where(eq(communications.id, newCommunication.id))
      .limit(1)

    return NextResponse.json(result[0], { status: 201 })
  } catch (error) {
    console.error('Error creating communication:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to create communication' },
      { status: 500 }
    )
  }
}