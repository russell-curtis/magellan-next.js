import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { conversations, clients, users, messageParticipants, messages } from '@/db/schema'
import { eq, desc, and, or, ilike, inArray } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'
import { z } from 'zod'

const createConversationSchema = z.object({
  clientId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  title: z.string().min(1).max(255).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
})

// Get conversations (for both advisors and clients)
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('userType') // 'advisor' or 'client'
    const clientId = searchParams.get('clientId')
    const status = searchParams.get('status') || 'active'
    const priority = searchParams.get('priority')
    const search = searchParams.get('search') // New search parameter
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Build query conditions
    const conditions = []
    
    // Status filter
    if (status !== 'all') {
      conditions.push(eq(conversations.status, status))
    }
    
    // Priority filter
    if (priority && priority !== 'all') {
      conditions.push(eq(conversations.priority, priority))
    }
    
    if (isAdvisor) {
      // Advisor can see conversations for their firm
      const advisor = currentUser as AuthenticatedUser
      conditions.push(eq(conversations.firmId, advisor.firmId))
      if (clientId) {
        conditions.push(eq(conversations.clientId, clientId))
      }
    } else {
      // Client can only see their own conversations
      const client = currentUser as AuthenticatedClient
      conditions.push(eq(conversations.clientId, client.clientId))
    }

    let conversationIds: string[] | null = null

    // Handle search functionality
    if (search) {
      // First, find conversations that match in title or client name
      const titleMatches = await db
        .select({ id: conversations.id })
        .from(conversations)
        .leftJoin(clients, eq(conversations.clientId, clients.id))
        .where(
          and(
            ...conditions,
            or(
              ilike(conversations.title, `%${search}%`),
              ilike(clients.firstName, `%${search}%`),
              ilike(clients.lastName, `%${search}%`),
              ilike(clients.email, `%${search}%`)
            )
          )
        )

      // Then, find conversations that have matching message content
      const messageConditions = [...conditions]
      messageConditions.push(ilike(messages.content, `%${search}%`))
      
      const messageMatches = await db
        .selectDistinct({ id: conversations.id })
        .from(conversations)
        .innerJoin(messages, eq(messages.conversationId, conversations.id))
        .leftJoin(clients, eq(conversations.clientId, clients.id))
        .where(and(...messageConditions))

      // Combine both result sets
      const titleIds = titleMatches.map(m => m.id)
      const messageIds = messageMatches.map(m => m.id)
      conversationIds = [...new Set([...titleIds, ...messageIds])]

      // If no matches found, return empty result
      if (conversationIds.length === 0) {
        return NextResponse.json({
          conversations: [],
          total: 0,
          hasMore: false,
        })
      }
    }

    // Build final query
    const finalConditions = conversationIds 
      ? [...conditions, inArray(conversations.id, conversationIds)]
      : conditions

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
        // Count unread messages for current user
        lastMessage: conversations.lastMessageId,
      })
      .from(conversations)
      .leftJoin(clients, eq(conversations.clientId, clients.id))
      .leftJoin(users, eq(conversations.assignedAdvisorId, users.id))
      .where(and(...finalConditions))
      .orderBy(desc(conversations.lastMessageAt), desc(conversations.createdAt))
      .limit(limit)
      .offset(offset)

    return NextResponse.json({
      conversations: result,
      total: result.length,
      hasMore: result.length === limit,
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}

// Create new conversation (advisor only)
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth() // Only advisors can create conversations
    const body = await request.json()
    
    // Validate request body
    const validation = createConversationSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { clientId, applicationId, title, priority } = validation.data

    // Verify client belongs to advisor's firm
    const client = await db
      .select({ id: clients.id, firmId: clients.firmId, firstName: clients.firstName, lastName: clients.lastName })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (!client.length || client[0].firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Client not found or access denied' },
        { status: 404 }
      )
    }

    // Create conversation
    const [newConversation] = await db
      .insert(conversations)
      .values({
        firmId: user.firmId,
        clientId,
        applicationId: applicationId || null,
        title: title || `Conversation with ${client[0].firstName} ${client[0].lastName}`,
        priority,
        assignedAdvisorId: user.id,
        status: 'active',
      })
      .returning()

    // Create participants (advisor and client)
    await Promise.all([
      // Add advisor as participant
      db.insert(messageParticipants).values({
        conversationId: newConversation.id,
        participantType: 'advisor',
        advisorId: user.id,
        isActive: true,
      }),
      // Add client as participant
      db.insert(messageParticipants).values({
        conversationId: newConversation.id,
        participantType: 'client',
        clientId: clientId,
        isActive: true,
      }),
    ])

    // Fetch complete conversation data
    const conversationData = await db
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
      .where(eq(conversations.id, newConversation.id))
      .limit(1)

    return NextResponse.json(conversationData[0], { status: 201 })
  } catch (error) {
    console.error('Error creating conversation:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    )
  }
}