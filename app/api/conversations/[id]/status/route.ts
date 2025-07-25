import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { conversations, clients, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'
import { z } from 'zod'

const updateStatusSchema = z.object({
  status: z.enum(['active', 'archived', 'closed']),
  userType: z.enum(['advisor', 'client']),
})

// Update conversation status (archive/unarchive/close)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const body = await request.json()
    
    // Validate request body
    const validation = updateStatusSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { status, userType } = validation.data

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

    // Verify conversation exists and user has access
    const conversationCheck = await db
      .select({
        id: conversations.id,
        firmId: conversations.firmId,
        clientId: conversations.clientId,
        currentStatus: conversations.status,
        title: conversations.title,
      })
      .from(conversations)
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversationCheck.length) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = conversationCheck[0]

    // Check access permissions
    if (isAdvisor) {
      const advisor = currentUser as AuthenticatedUser
      if (conversation.firmId !== advisor.firmId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    } else {
      const client = currentUser as AuthenticatedClient
      if (conversation.clientId !== client.clientId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    // Only advisors can close conversations, clients can only archive/unarchive
    if (!isAdvisor && status === 'closed') {
      return NextResponse.json(
        { error: 'Only advisors can close conversations' },
        { status: 403 }
      )
    }

    // Update conversation status
    await db
      .update(conversations)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))

    // Fetch complete conversation data with relations
    const completeConversation = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
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
      .where(eq(conversations.id, conversationId))
      .limit(1)

    return NextResponse.json({
      success: true,
      message: `Conversation ${status === 'archived' ? 'archived' : status === 'active' ? 'restored' : 'closed'} successfully`,
      conversation: completeConversation[0],
      previousStatus: conversation.currentStatus,
      newStatus: status,
    })
  } catch (error) {
    console.error('Error updating conversation status:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to update conversation status' },
      { status: 500 }
    )
  }
}

// Get conversation status and metadata
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: conversationId } = await params
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('userType') // 'advisor' or 'client'

    if (!userType) {
      return NextResponse.json(
        { error: 'userType parameter is required' },
        { status: 400 }
      )
    }

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

    // Fetch conversation with access check
    const conversationQuery = await db
      .select({
        id: conversations.id,
        title: conversations.title,
        status: conversations.status,
        priority: conversations.priority,
        lastMessageAt: conversations.lastMessageAt,
        createdAt: conversations.createdAt,
        updatedAt: conversations.updatedAt,
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
      .where(eq(conversations.id, conversationId))
      .limit(1)

    if (!conversationQuery.length) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      )
    }

    const conversation = conversationQuery[0]

    // Check access permissions
    if (isAdvisor) {
      const advisor = currentUser as AuthenticatedUser
      if (conversation.firmId !== advisor.firmId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    } else {
      const client = currentUser as AuthenticatedClient
      if (conversation.clientId !== client.clientId) {
        return NextResponse.json(
          { error: 'Access denied' },
          { status: 403 }
        )
      }
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        title: conversation.title,
        status: conversation.status,
        priority: conversation.priority,
        lastMessageAt: conversation.lastMessageAt,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        client: conversation.client,
        assignedAdvisor: conversation.assignedAdvisor,
      },
    })
  } catch (error) {
    console.error('Error fetching conversation status:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch conversation status' },
      { status: 500 }
    )
  }
}