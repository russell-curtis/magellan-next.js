import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { messageNotifications, messages, conversations } from '@/db/schema'
import { eq, and, sql, inArray } from 'drizzle-orm'
import { requireAuth, AuthenticatedUser } from '@/lib/auth-utils'
import { requireClientAuth, AuthenticatedClient } from '@/lib/client-auth'

// Get unread message counts per conversation
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userType = searchParams.get('userType') // 'advisor' or 'client'
    const conversationIds = searchParams.get('conversationIds') // Optional comma-separated list

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

    const recipientType = isAdvisor ? 'advisor' : 'client'
    const recipientId = isAdvisor ? (currentUser as AuthenticatedUser).id : (currentUser as AuthenticatedClient).clientId

    // Build base conditions for unread notifications
    const baseConditions = [
      eq(messageNotifications.recipientType, recipientType),
      eq(messageNotifications.isRead, false),
    ]

    if (isAdvisor) {
      baseConditions.push(eq(messageNotifications.recipientAdvisorId, recipientId))
    } else {
      baseConditions.push(eq(messageNotifications.recipientClientId, recipientId))
    }

    // If specific conversation IDs are provided, filter by them
    let conversationFilter: string[] | null = null
    if (conversationIds) {
      conversationFilter = conversationIds.split(',').filter(id => id.trim().length > 0)
    }

    // Query to get unread counts per conversation
    let query = db
      .select({
        conversationId: messages.conversationId,
        unreadCount: sql<number>`count(*)::int`,
      })
      .from(messageNotifications)
      .innerJoin(messages, eq(messageNotifications.messageId, messages.id))
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(and(...baseConditions))

    // Add conversation access control
    if (isAdvisor) {
      const advisor = currentUser as AuthenticatedUser
      query = query.where(and(...baseConditions, eq(conversations.firmId, advisor.firmId)))
    } else {
      const client = currentUser as AuthenticatedClient
      query = query.where(and(...baseConditions, eq(conversations.clientId, client.clientId)))
    }

    // Add conversation ID filter if provided
    if (conversationFilter && conversationFilter.length > 0) {
      query = query.where(and(...baseConditions, inArray(messages.conversationId, conversationFilter)))
    }

    const unreadCounts = await query
      .groupBy(messages.conversationId)
      .orderBy(messages.conversationId)

    // Convert to object format for easier frontend consumption
    const unreadCountsMap: Record<string, number> = {}
    unreadCounts.forEach(({ conversationId, unreadCount }) => {
      unreadCountsMap[conversationId] = unreadCount
    })

    // Calculate total unread count
    const totalUnreadCount = Object.values(unreadCountsMap).reduce((sum, count) => sum + count, 0)

    return NextResponse.json({
      unreadCounts: unreadCountsMap,
      totalUnreadCount,
      conversationIds: conversationFilter,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error fetching unread counts per conversation:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to fetch unread counts' },
      { status: 500 }
    )
  }
}

// Mark all messages in specific conversations as read
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { conversationIds, userType } = body

    if (!userType || !conversationIds || !Array.isArray(conversationIds)) {
      return NextResponse.json(
        { error: 'userType and conversationIds array are required' },
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

    const recipientType = isAdvisor ? 'advisor' : 'client'
    const recipientId = isAdvisor ? (currentUser as AuthenticatedUser).id : (currentUser as AuthenticatedClient).clientId

    // Verify user has access to all specified conversations
    const accessConditions = [inArray(conversations.id, conversationIds)]
    
    if (isAdvisor) {
      const advisor = currentUser as AuthenticatedUser
      accessConditions.push(eq(conversations.firmId, advisor.firmId))
    } else {
      const client = currentUser as AuthenticatedClient  
      accessConditions.push(eq(conversations.clientId, client.clientId))
    }

    const accessCheck = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(...accessConditions))

    const accessibleConversationIds = accessCheck.map(c => c.id)
    
    if (accessibleConversationIds.length !== conversationIds.length) {
      return NextResponse.json(
        { error: 'Access denied to one or more conversations' },
        { status: 403 }
      )
    }

    // Mark all unread notifications in these conversations as read
    const notificationConditions = [
      eq(messageNotifications.recipientType, recipientType),
      eq(messageNotifications.isRead, false),
    ]

    if (isAdvisor) {
      notificationConditions.push(eq(messageNotifications.recipientAdvisorId, recipientId))
    } else {
      notificationConditions.push(eq(messageNotifications.recipientClientId, recipientId))
    }

    // Get message IDs for the specified conversations
    const messageIds = await db
      .select({ id: messages.id })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))

    if (messageIds.length > 0) {
      const messageIdArray = messageIds.map(m => m.id)
      
      notificationConditions.push(inArray(messageNotifications.messageId, messageIdArray))

      const updateResult = await db
        .update(messageNotifications)
        .set({
          isRead: true,
          readAt: new Date(),
        })
        .where(and(...notificationConditions))
        .returning()

      return NextResponse.json({
        success: true,
        message: `Marked ${updateResult.length} notifications as read`,
        conversationIds: conversationIds,
        markedCount: updateResult.length,
      })
    }

    return NextResponse.json({
      success: true,
      message: 'No unread notifications found',
      conversationIds: conversationIds,
      markedCount: 0,
    })
  } catch (error) {
    console.error('Error marking conversation messages as read:', error)
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to mark messages as read' },
      { status: 500 }
    )
  }
}