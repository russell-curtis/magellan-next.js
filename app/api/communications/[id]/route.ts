import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { communications, clients, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-utils'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

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
      .where(eq(communications.id, id))
      .limit(1)

    if (!result.length) {
      return NextResponse.json(
        { error: 'Communication not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error fetching communication:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch communication' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const body = await request.json()
    const { subject, content } = body

    const [updated] = await db
      .update(communications)
      .set({
        subject: subject || null,
        content,
      })
      .where(eq(communications.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: 'Communication not found' },
        { status: 404 }
      )
    }

    // Fetch the complete updated communication with relations
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
      .where(eq(communications.id, id))
      .limit(1)

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating communication:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update communication' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()
    const { id } = await params

    const [deleted] = await db
      .delete(communications)
      .where(eq(communications.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: 'Communication not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting communication:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to delete communication' },
      { status: 500 }
    )
  }
}