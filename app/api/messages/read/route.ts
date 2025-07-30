import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { messageNotifications, messageParticipants, conversations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'
import { z } from 'zod'

const markReadSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(), // If not provided, mark all as read
})

// Mark messages as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const userType = body.userType // 'advisor' or 'client'
    
    // Validate request body
    const validation = markReadSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { conversationId, messageId } = validation.data

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

    const recipientType = isAdvisor ? 'advisor' : 'client'
    const recipientId = isAdvisor ? (currentUser as AuthenticatedUser).id : (currentUser as AuthenticatedClient).clientId

    // Mark notifications as read
    const notificationConditions = [
      eq(messageNotifications.recipientType, recipientType),
      eq(messageNotifications.isRead, false),
    ]

    if (isAdvisor) {
      notificationConditions.push(eq(messageNotifications.recipientAdvisorId, recipientId))
    } else {
      notificationConditions.push(eq(messageNotifications.recipientClientId, recipientId))
    }

    // If specific messageId provided, only mark that message as read
    if (messageId) {
      notificationConditions.push(eq(messageNotifications.messageId, messageId))
    }
    // If no messageId provided, mark all unread notifications for this user in this conversation

    await db
      .update(messageNotifications)
      .set({
        isRead: true,
        readAt: new Date(),
      })
      .where(and(...notificationConditions))

    // Update participant's last read timestamp
    const participantConditions = [
      eq(messageParticipants.conversationId, conversationId),
      eq(messageParticipants.participantType, recipientType),
    ]

    if (isAdvisor) {
      participantConditions.push(eq(messageParticipants.advisorId, recipientId))
    } else {
      participantConditions.push(eq(messageParticipants.clientId, recipientId))
    }

    const updateData: {
      lastReadAt: Date
      lastReadMessageId?: string
    } = { lastReadAt: new Date() }
    if (messageId) {
      updateData.lastReadMessageId = messageId
    }

    await db
      .update(messageParticipants)
      .set(updateData)
      .where(and(...participantConditions))

    return NextResponse.json({
      success: true,
      message: messageId ? 'Message marked as read' : 'All messages marked as read',
    })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}

// Get unread message count
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('userType') // 'advisor' or 'client'
    const conversationId = searchParams.get('conversationId') // Optional - for specific conversation

    let currentUser: AuthenticatedUser | AuthenticatedClient | null = null
    let isAdvisor = false

    // Determine user type and authenticate accordingly
    if (userType === 'client') {
      try {
        currentUser = await requireClientAuth()
        isAdvisor = false
      } catch (error) {
        // Return 0 unread count for unauthenticated clients
        return NextResponse.json({
          unreadCount: 0,
          conversationId: conversationId || null,
        })
      }
    } else {
      try {
        currentUser = await requireAuth()
        isAdvisor = true
      } catch (error) {
        console.log('Auth failed for advisor, returning 0 unread count:', error)
        // Return 0 unread count for unauthenticated advisors (like magic link users)
        return NextResponse.json({
          unreadCount: 0,
          conversationId: conversationId || null,
        })
      }
    }

    const recipientType = isAdvisor ? 'advisor' : 'client'
    const recipientId = isAdvisor ? (currentUser as AuthenticatedUser).id : (currentUser as AuthenticatedClient).clientId

    // Build conditions for unread notifications
    const conditions = [
      eq(messageNotifications.recipientType, recipientType),
      eq(messageNotifications.isRead, false),
    ]

    if (isAdvisor) {
      conditions.push(eq(messageNotifications.recipientAdvisorId, recipientId))
    } else {
      conditions.push(eq(messageNotifications.recipientClientId, recipientId))
    }

    // If conversationId is provided, we need to join with messages to filter by conversation
    // For now, we'll return total count or implement a simpler approach
    
    const unreadCount = await db
      .select({
        count: messageNotifications.id,
      })
      .from(messageNotifications)
      .where(and(...conditions))

    return NextResponse.json({
      unreadCount: unreadCount.length,
      conversationId: conversationId || null,
    })
  } catch (error) {
    console.error('Error getting unread count:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to get unread count' },
      { status: 500 }
    )
  }
}