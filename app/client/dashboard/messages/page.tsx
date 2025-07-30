'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
// import { Badge } from '@/components/ui/badge' // Removed - badges no longer used
import { Separator } from '@/components/ui/separator'
import { OnlineStatusAvatar } from '@/components/ui/status-indicator'
// import { PriorityBadge } from '@/components/ui/priority-badge' // Removed - badges no longer used
import { ConversationItemWrapper } from '@/components/ui/conversation-notification-badge' // ConversationNotificationBadge removed
import { formatConversationDate, isRecent } from '@/lib/date-utils'
import { useConversationUnreadCounts } from '@/hooks/use-conversation-unread-counts'
import { MessageSquare, User, Clock, Search, X, Archive, ArchiveRestore } from 'lucide-react'
import { MessagingInterface } from '@/components/messaging/messaging-interface'

interface Conversation {
  id: string
  title: string
  status: string
  priority: string
  lastMessageAt: string | null
  assignedAdvisor: {
    id: string
    name: string
    email: string
  } | null
}

export default function ClientMessagesPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [loadingConversations, setLoadingConversations] = useState(false)
  
  // Enhanced filtering state
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')

  // Get conversation IDs for unread count tracking
  const conversationIds = conversations.map(conv => conv.id)
  
  // Individual conversation unread counts
  const {
    unreadCounts,
    markConversationAsRead,
  } = useConversationUnreadCounts({
    userType: 'client',
    conversationIds,
    pollingInterval: 5000, // Poll every 5 seconds for conversation-level updates
  })

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  const fetchConversations = useCallback(async () => {
    if (!client) return

    setLoadingConversations(true)
    try {
      const token = localStorage.getItem('clientToken')
      
      // Build query parameters
      const params = new URLSearchParams({
        userType: 'client'
      })
      
      if (statusFilter !== 'all') {
        params.append('status', statusFilter)
      }
      
      if (priorityFilter !== 'all') {
        params.append('priority', priorityFilter)
      }
      
      if (searchTerm.trim()) {
        params.append('search', searchTerm.trim())
      }

      const response = await fetch(`/api/conversations?${params.toString()}`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // Auto-select first conversation if available and none selected
        if (data.conversations?.length > 0) {
          setSelectedConversation(prev => prev || data.conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }, [client, statusFilter, priorityFilter, searchTerm])

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConversations()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter, priorityFilter, fetchConversations])

  useEffect(() => {
    if (client) {
      fetchConversations()
    }
  }, [client, fetchConversations])

  // Archive/Unarchive conversation (clients can only archive/restore, not close)
  const handleArchiveConversation = useCallback(async (conversationId: string, newStatus: 'active' | 'archived') => {
    try {
      const token = localStorage.getItem('clientToken')
      const response = await fetch(`/api/conversations/${conversationId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          status: newStatus,
          userType: 'client',
        }),
      })

      if (response.ok) {
        // Refresh conversations to reflect the change
        await fetchConversations()
        
        // Show success message
        console.log(`Conversation ${newStatus === 'archived' ? 'archived' : 'restored'} successfully`)
      } else {
        const errorData = await response.json()
        console.error('Error updating conversation status:', errorData)
      }
    } catch (error) {
      console.error('Error updating conversation status:', error)
    }
  }, [fetchConversations])

  // Handle conversation selection with read marking
  const handleConversationSelect = useCallback(async (conversationId: string) => {
    setSelectedConversation(conversationId)
    
    // Mark conversation as read if it has unread messages
    if (unreadCounts[conversationId] > 0) {
      await markConversationAsRead(conversationId)
    }
  }, [unreadCounts, markConversationAsRead])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-[400px] bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages & Communication</h2>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Conversations with your advisory team
          </p>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations and messages..."
              className="pl-10 pr-10"
            />
            {searchTerm && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-gray-100"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 min-w-0 text-gray-900 font-medium">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="flex-1 min-w-0 text-gray-900 font-medium">
                <SelectValue placeholder="All Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Results Header */}
        {searchTerm && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <p className="text-xs text-blue-700">
              {loadingConversations ? 'Searching...' : `${conversations.length} result${conversations.length !== 1 ? 's' : ''} for "${searchTerm}"`}
            </p>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Searching conversations and messages...' : 'Loading conversations...'}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' 
                  ? 'No conversations match your search or filters' 
                  : 'No conversations yet'
                }
              </p>
              {searchTerm && (
                <p className="text-xs text-gray-400 mt-1">
                  Try different keywords or check spelling
                </p>
              )}
              {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                <p className="text-xs text-gray-400 mt-1">
                  Your advisor will start a conversation with you
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {conversations.map((conversation, index) => {
                const conversationUnreadCount = unreadCounts[conversation.id] || 0
                const hasUnread = conversationUnreadCount > 0
                const isConversationSelected = selectedConversation === conversation.id
                
                return (
                  <div key={conversation.id} className="relative">
                    <ConversationItemWrapper
                      hasUnread={hasUnread}
                      isSelected={isConversationSelected}
                      className="relative group"
                    >
                      <div className="flex items-center">
                        <button
                          onClick={() => handleConversationSelect(conversation.id)}
                          className={`flex-1 p-4 text-left hover:bg-gray-50 transition-colors min-w-0 ${
                            isConversationSelected 
                              ? 'bg-blue-50' 
                              : hasUnread ? 'bg-blue-50/30' : ''
                          }`}
                        >
                          <div className="flex items-start space-x-3 min-w-0">
                            <OnlineStatusAvatar status="offline">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200">
                                  <AvatarInitials 
                                    name={conversation.assignedAdvisor ? conversation.assignedAdvisor.name : 'A'}
                                    className="text-blue-700 font-semibold"
                                  />
                                </AvatarFallback>
                              </Avatar>
                            </OnlineStatusAvatar>
                            
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between min-w-0">
                                <div className="flex-1 min-w-0 pr-2">
                                  <div className="flex items-center mb-1 min-w-0">
                                    <h4 className={`text-sm truncate ${
                                      hasUnread ? 'font-semibold text-gray-900' : 'font-semibold text-gray-900'
                                    }`}>
                                      {conversation.title}
                                    </h4>
                                    {conversation.lastMessageAt && isRecent(conversation.lastMessageAt) && (
                                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse ml-2 flex-shrink-0" />
                                    )}
                                  </div>
                                  {conversation.assignedAdvisor && (
                                    <p className="text-xs text-gray-600 mb-1 flex items-center">
                                      <User className="h-3 w-3 mr-1" />
                                      {conversation.assignedAdvisor.name}
                                    </p>
                                  )}
                                  {conversation.lastMessageAt && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatConversationDate(conversation.lastMessageAt)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end space-y-1 flex-shrink-0">
                                  <div className="flex items-center space-x-1">
                                    {/* Status and notification badges removed */}
                                  </div>
                                  {/* Priority badge removed */}
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                        
                        {/* Archive/Unarchive Button */}
                        <div className="p-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleArchiveConversation(
                                conversation.id, 
                                conversation.status === 'archived' ? 'active' : 'archived'
                              )
                            }}
                            title={conversation.status === 'archived' ? 'Restore conversation' : 'Archive conversation'}
                          >
                            {conversation.status === 'archived' ? (
                              <ArchiveRestore className="h-4 w-4" />
                            ) : (
                              <Archive className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </ConversationItemWrapper>
                    {index < conversations.length - 1 && <Separator />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Messaging Interface */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <div className="p-6 h-full">
            <MessagingInterface
              conversationId={selectedConversation}
              userType="client"
              onConversationUpdate={fetchConversations}
            />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <div className="text-center text-gray-500">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Welcome to Messages</h3>
              <p className="text-sm mb-4">
                {conversations.length === 0 
                  ? "Your advisor will start a conversation with you soon."
                  : "Select a conversation from the sidebar to start messaging."
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}