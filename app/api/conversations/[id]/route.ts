import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { conversations, clients, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'
import { z } from 'zod'

const updateConversationSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  status: z.enum(['active', 'archived', 'closed']).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
})

// Get single conversation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('userType') // 'advisor' or 'client'

    let currentUser: AuthenticatedUser | AuthenticatedClient | null = null
    let isAdvisor = false

    // Determine user type and authenticate accordingly
    if (userType === 'client') {
      currentUser = await requireClientAuth()
      isAdvisor = false
    } else {
      currentUser = await requireAuth()
      isAdvisor = true
    }

    // Fetch conversation with access control
    const result = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        firmId: conversations.firmId,
        clientId: conversations.clientId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .leftJoin(users, eq(conversations.assignedAdvisorId, users.id))
      .where(eq(conversations.id, id))
      .limit(1)

    if (!result.length) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = result[0]

    // Check access permissions
    if (isAdvisor) {
      // Advisor must be from same firm
      const advisor = currentUser as AuthenticatedUser
      if (conversation.firmId !== advisor.firmId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    } else {
      // Client can only access their own conversations
      const client = currentUser as AuthenticatedClient
      if (conversation.clientId !== client.clientId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json(conversation)
  } catch (error) {
    console.error('Error fetching conversation:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    )
  }
}

// Update conversation (advisor only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth() // Only advisors can update conversations
    const body = await request.json()
    
    // Validate request body
    const validation = updateConversationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    // Check if conversation exists and advisor has access
    const existing = await db
      .select({ firmId: conversations.firmId })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)

    if (!existing.length) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (existing[0].firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Update conversation
    const updateData: {
      updatedAt: Date
      title?: string
      status?: string
      priority?: string
    } = { updatedAt: new Date() }
    if (validation.data.title) updateData.title = validation.data.title
    if (validation.data.status) updateData.status = validation.data.status
    if (validation.data.priority) updateData.priority = validation.data.priority

    const [updated] = await db
      .update(conversations)
      .set(updateData)
      .where(eq(conversations.id, id))
      .returning()

    if (!updated) {
      return NextResponse.json(
        { error: 'Failed to update conversation' },
        { status: 500 }
      )
    }

    // Fetch complete updated conversation data
    const result = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .leftJoin(users, eq(conversations.assignedAdvisorId, users.id))
      .where(eq(conversations.id, id))
      .limit(1)

    return NextResponse.json(result[0])
  } catch (error) {
    console.error('Error updating conversation:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update conversation' },
      { status: 500 }
    )
  }
}

// Delete conversation (advisor only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await requireAuth() // Only advisors can delete conversations

    // Check if conversation exists and advisor has access
    const existing = await db
      .select({ firmId: conversations.firmId })
      .from(conversations)
      .where(eq(conversations.id, id))
      .limit(1)

    if (!existing.length) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    if (existing[0].firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Delete conversation (cascade will handle messages and participants)
    const [deleted] = await db
      .delete(conversations)
      .where(eq(conversations.id, id))
      .returning()

    if (!deleted) {
      return NextResponse.json(
        { error: 'Failed to delete conversation' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting conversation:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    )
  }
}