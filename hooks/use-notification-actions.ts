import { useCallback } from 'react'

interface UseNotificationActionsOptions {
  userType: 'advisor' | 'client'
}

interface UseNotificationActionsReturn {
  markAllMessagesAsRead: () => Promise<void>
  markConversationAsRead: (conversationId: string) => Promise<void>
}

export function useNotificationActions({
  userType
}: UseNotificationActionsOptions): UseNotificationActionsReturn {
  
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (userType === 'client') {
      const token = localStorage.getItem('clientToken')
      return token ? { 'Authorization': `Bearer ${token}` } : {}
    } else {
      // Advisor uses Better Auth cookies - no need for Authorization header
      return {}
    }
  }, [userType])

  const markAllMessagesAsRead = useCallback(async () => {
    try {
      // This would be a new API endpoint to mark all messages as read for a user
      const response = await fetch('/api/messages/read-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ userType }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark all messages as read')
      }
    } catch (error) {
      console.error('Error marking all messages as read:', error)
    }
  }, [userType, getAuthHeaders])

  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ 
          conversationId,
          userType 
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark conversation as read')
      }
    } catch (error) {
      console.error('Error marking conversation as read:', error)
    }
  }, [userType, getAuthHeaders])

  return {
    markAllMessagesAsRead,
    markConversationAsRead
  }
}