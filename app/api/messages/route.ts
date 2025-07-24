import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { messages, conversations, clients, users, messageNotifications, messageParticipants } from '@/db/schema'
import { eq, desc, and } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'
import { z } from 'zod'

const sendMessageSchema = z.object({
  conversationId: z.string().uuid(),
  content: z.string().min(1).max(10000),
  messageType: z.enum(['text', 'file']).default('text'),
  fileUrl: z.string().url().optional(),
  fileName: z.string().min(1).max(255).optional(),
  fileSize: z.number().int().positive().optional(),
  contentType: z.string().optional(),
})

// Get messages for a conversation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const conversationId = searchParams.get('conversationId')
    const userType = searchParams.get('userType') // 'advisor' or 'client'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversationId is required' },
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

    // First, verify user has access to this conversation
    const conversationCheck = await db
      .select({
        id: conversations.id,
        firmId: conversations.firmId,
        clientId: conversations.clientId,
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

    // Fetch messages
    const result = await db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        senderType: messages.senderType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        contentType: messages.contentType,
        isEdited: messages.isEdited,
        editedAt: messages.editedAt,
        createdAt: messages.createdAt,
        senderAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        senderClient: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderAdvisorId, users.id))
      .leftJoin(clients, eq(messages.senderClientId, clients.id))
      .where(and(
        eq(messages.conversationId, conversationId),
        eq(messages.isDeleted, false)
      ))
      .orderBy(desc(messages.createdAt))
      .limit(limit)
      .offset(offset)

    // Mark messages as read for current user
    if (result.length > 0) {
      const participantType = isAdvisor ? 'advisor' : 'client'
      const participantId = isAdvisor ? (currentUser as AuthenticatedUser).id : (currentUser as AuthenticatedClient).clientId

      // Update last read timestamp
      await db
        .update(messageParticipants)
        .set({
          lastReadAt: new Date(),
          lastReadMessageId: result[0].id, // Most recent message
        })
        .where(and(
          eq(messageParticipants.conversationId, conversationId),
          eq(messageParticipants.participantType, participantType),
          isAdvisor 
            ? eq(messageParticipants.advisorId, participantId)
            : eq(messageParticipants.clientId, participantId)
        ))
    }

    return NextResponse.json({
      messages: result.reverse(), // Return in chronological order (oldest first)
      total: result.length,
      hasMore: result.length === limit,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

// Send a new message
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userType = body.userType // 'advisor' or 'client'
    
    // Validate request body
    const validation = sendMessageSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { conversationId, content, messageType, fileUrl, fileName, fileSize, contentType } = validation.data

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

    // Verify user has access to this conversation
    const conversationCheck = await db
      .select({
        id: conversations.id,
        firmId: conversations.firmId,
        clientId: conversations.clientId,
        status: conversations.status,
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

    // Check if conversation is active
    if (conversation.status !== 'active') {
      return NextResponse.json(
        { error: 'Cannot send messages to inactive conversation' },
        { status: 400 }
      )
    }

    // Create message
    const messageData: {
      conversationId: string
      content: string
      messageType: string
      senderType: 'advisor' | 'client'
      senderAdvisorId?: string
      senderClientId?: string  
      fileUrl?: string
      fileName?: string
      fileSize?: number
      contentType?: string
    } = {
      conversationId,
      content,
      messageType,
      senderType: isAdvisor ? 'advisor' : 'client',
    }

    if (isAdvisor) {
      messageData.senderAdvisorId = currentUser.id
    } else {
      messageData.senderClientId = (currentUser as AuthenticatedClient).clientId
    }

    if (messageType === 'file' && fileUrl) {
      messageData.fileUrl = fileUrl
      messageData.fileName = fileName
      messageData.fileSize = fileSize
      messageData.contentType = contentType
    }

    const [newMessage] = await db
      .insert(messages)
      .values(messageData)
      .returning()

    // Update conversation last message info
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessageId: newMessage.id,
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId))

    // Create notifications for other participants
    const participants = await db
      .select({
        participantType: messageParticipants.participantType,
        advisorId: messageParticipants.advisorId,
        clientId: messageParticipants.clientId,
      })
      .from(messageParticipants)
      .where(and(
        eq(messageParticipants.conversationId, conversationId),
        eq(messageParticipants.isActive, true)
      ))

    // Create notifications for recipients (not the sender)
    const notificationPromises = participants
      .filter(participant => {
        if (isAdvisor) {
          // If advisor sent, notify client participants
          return participant.participantType === 'client'
        } else {
          // If client sent, notify advisor participants
          return participant.participantType === 'advisor'
        }
      })
      .map(participant => 
        db.insert(messageNotifications).values({
          messageId: newMessage.id,
          recipientType: participant.participantType,
          recipientAdvisorId: participant.advisorId,
          recipientClientId: participant.clientId,
          isDelivered: true,
          deliveredAt: new Date(),
        })
      )

    await Promise.all(notificationPromises)

    // Fetch complete message data for response
    const messageResult = await db
      .select({
        id: messages.id,
        content: messages.content,
        messageType: messages.messageType,
        senderType: messages.senderType,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        contentType: messages.contentType,
        createdAt: messages.createdAt,
        senderAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        senderClient: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email,
        },
      })
      .from(messages)
      .leftJoin(users, eq(messages.senderAdvisorId, users.id))
      .leftJoin(clients, eq(messages.senderClientId, clients.id))
      .where(eq(messages.id, newMessage.id))
      .limit(1)

    return NextResponse.json(messageResult[0], { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}