import { useState, useEffect, useCallback, useRef } from 'react'

interface UseUnreadMessageCountReturn {
  unreadCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
  clearCount: () => void
}

interface UseUnreadMessageCountOptions {
  userType: 'advisor' | 'client'
  pollingInterval?: number // in milliseconds, default 10000 (10 seconds)
  enabled?: boolean // default true
}

export function useUnreadMessageCount({
  userType,
  pollingInterval = 10000,
  enabled = true
}: UseUnreadMessageCountOptions): UseUnreadMessageCountReturn {
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isActiveRef = useRef(true)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (userType === 'client') {
      const token = localStorage.getItem('clientToken')
      return token ? { 'Authorization': `Bearer ${token}` } : {}
    } else {
      // Advisor uses Better Auth cookies - no need for Authorization header
      return {}
    }
  }, [userType])

  const fetchUnreadCount = useCallback(async (isInitialLoad = false) => {
    if (!enabled) return

    if (isInitialLoad) {
      setIsLoading(true)
    }
    setError(null)

    try {
      const response = await fetch(`/api/messages/read?userType=${userType}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.unreadCount || 0)
      } else {
        throw new Error(`Failed to fetch unread count: ${response.status}`)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch unread count'
      setError(errorMessage)
      console.error('Error fetching unread message count:', err)
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
        fetchUnreadCount(false)
        // Restart polling
        pollingIntervalRef.current = setInterval(() => {
          if (isActiveRef.current) {
            fetchUnreadCount(false)
          }
        }, pollingInterval)
      }
    }
  }, [fetchUnreadCount, pollingInterval, enabled])

  // Initial fetch and setup polling
  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    fetchUnreadCount(true)

    // Set up polling
    pollingIntervalRef.current = setInterval(() => {
      if (isActiveRef.current) {
        fetchUnreadCount(false)
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
  }, [fetchUnreadCount, pollingInterval, enabled, handleVisibilityChange])

  // Manual refetch function
  const refetch = useCallback(() => {
    fetchUnreadCount(false)
  }, [fetchUnreadCount])

  // Clear count manually (useful when user visits messages page)
  const clearCount = useCallback(() => {
    setUnreadCount(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  return {
    unreadCount,
    isLoading,
    error,
    refetch,
    clearCount
  }
}