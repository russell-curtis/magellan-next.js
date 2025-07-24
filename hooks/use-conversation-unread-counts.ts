import { useState, useEffect, useCallback, useRef } from 'react'

interface UseConversationUnreadCountsReturn {
  unreadCounts: Record<string, number>
  totalUnreadCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
  markConversationAsRead: (conversationId: string) => Promise<void>
  markMultipleConversationsAsRead: (conversationIds: string[]) => Promise<void>
}

interface UseConversationUnreadCountsOptions {
  userType: 'advisor' | 'client'
  conversationIds?: string[] // Optional - if provided, only fetch counts for these conversations
  pollingInterval?: number // in milliseconds, default 10000 (10 seconds)
  enabled?: boolean // default true
}

export function useConversationUnreadCounts({
  userType,
  conversationIds,
  pollingInterval = 10000,
  enabled = true
}: UseConversationUnreadCountsOptions): UseConversationUnreadCountsReturn {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [totalUnreadCount, setTotalUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)
  const conversationIdsRef = useRef<string[]>()

  // Update conversation IDs ref when they change
  useEffect(() => {
    conversationIdsRef.current = conversationIds
  }, [conversationIds])

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (userType === 'client') {
      const token = localStorage.getItem('clientToken')
      return token ? { 'Authorization': `Bearer ${token}` } : {}
    } else {
      // Advisor uses Better Auth cookies - no need for Authorization header
      return {}
    }
  }, [userType])

  const fetchUnreadCounts = useCallback(async (isInitialLoad = false) => {
    if (!enabled) return

    if (isInitialLoad) {
      setIsLoading(true)
    }
    setError(null)

    try {
      // Build query parameters
      const params = new URLSearchParams({
        userType,
      })

      // Add conversation IDs filter if provided
      if (conversationIdsRef.current && conversationIdsRef.current.length > 0) {
        params.append('conversationIds', conversationIdsRef.current.join(','))
      }

      const response = await fetch(`/api/conversations/unread-counts?${params.toString()}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCounts(data.unreadCounts || {})
        setTotalUnreadCount(data.totalUnreadCount || 0)
      } else {
        throw new Error(`Failed to fetch unread counts: ${response.status}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread counts'
      setError(errorMessage)
      console.error('Error fetching conversation unread counts:', err)
    } finally {
      if (isInitialLoad) {
        setIsLoading(false)
      }
    }
  }, [userType, getAuthHeaders, enabled])

  // Handle visibility change to pause/resume polling when tab is inactive
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      isActiveRef.current = false
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    } else {
      isActiveRef.current = true
      if (enabled) {
        // Immediately fetch when becoming visible again
        fetchUnreadCounts(false)
        // Restart polling
        pollingIntervalRef.current = setInterval(() => {
          if (isActiveRef.current) {
            fetchUnreadCounts(false)
          }
        }, pollingInterval)
      }
    }
  }, [fetchUnreadCounts, pollingInterval, enabled])

  // Initial fetch and setup polling
  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchUnreadCounts(true)

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchUnreadCounts(false)
      }
    }, pollingInterval)

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchUnreadCounts, pollingInterval, enabled, handleVisibilityChange])

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchUnreadCounts(false)
  }, [fetchUnreadCounts])

  // Mark single conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch('/api/conversations/unread-counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationIds: [conversationId],
          userType,
        }),
      })

      if (response.ok) {
        // Optimistic update - remove unread count for this conversation
        setUnreadCounts(prev => {
          const updated = { ...prev }
          const previousCount = updated[conversationId] || 0
          delete updated[conversationId]
          
          // Update total count
          setTotalUnreadCount(prevTotal => Math.max(0, prevTotal - previousCount))
          
          return updated
        })
      } else {
        throw new Error('Failed to mark conversation as read')
      }
    } catch (err) {
      console.error('Error marking conversation as read:', err)
      // Refetch to ensure consistency
      fetchUnreadCounts(false)
    }
  }, [userType, getAuthHeaders, fetchUnreadCounts])

  // Mark multiple conversations as read
  const markMultipleConversationsAsRead = useCallback(async (conversationIds: string[]) => {
    try {
      const response = await fetch('/api/conversations/unread-counts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationIds,
          userType,
        }),
      })

      if (response.ok) {
        // Optimistic update - remove unread counts for these conversations
        setUnreadCounts(prev => {
          const updated = { ...prev }
          let totalReduction = 0
          
          conversationIds.forEach(id => {
            totalReduction += updated[id] || 0
            delete updated[id]
          })
          
          // Update total count
          setTotalUnreadCount(prevTotal => Math.max(0, prevTotal - totalReduction))
          
          return updated
        })
      } else {
        throw new Error('Failed to mark conversations as read')
      }
    } catch (err) {
      console.error('Error marking conversations as read:', err)
      // Refetch to ensure consistency
      fetchUnreadCounts(false)
    }
  }, [userType, getAuthHeaders, fetchUnreadCounts])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return {
    unreadCounts,
    totalUnreadCount,
    isLoading,
    error,
    refetch,
    markConversationAsRead,
    markMultipleConversationsAsRead,
  }
}