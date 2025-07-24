'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Send, Paperclip, MoreVertical, Pause, Play, Wifi, WifiOff } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'

interface Message {
  id: string
  content: string
  messageType: 'text' | 'file'
  senderType: 'advisor' | 'client'
  senderAdvisorId?: string
  senderClientId?: string
  createdAt: string
  fileUrl?: string
  fileName?: string
  sender?: {
    name: string
    email: string
  }
}

interface Conversation {
  id: string
  title: string
  status: string
  priority: string
  client: {
    firstName: string
    lastName: string
    email: string
  }
  assignedAdvisor?: {
    name: string
    email: string
  }
}

interface MessagingInterfaceProps {
  conversationId: string
  userType: 'advisor' | 'client'
  onConversationUpdate?: () => void
}

export function MessagingInterface({ 
  conversationId, 
  userType, 
  onConversationUpdate 
}: MessagingInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [lastMessageCount, setLastMessageCount] = useState(0)
  const [isPolling, setIsPolling] = useState(true)
  const [isPollingActive, setIsPollingActive] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitialLoadRef = useRef(true)

  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (userType === 'client') {
      const token = localStorage.getItem('clientToken')
      return token ? { 'Authorization': `Bearer ${token}` } : {}
    } else {
      // Advisor uses Better Auth cookies - no need for Authorization header
      return {}
    }
  }, [userType])

  const fetchConversation = useCallback(async () => {
    try {
      const response = await fetch(`/api/conversations/${conversationId}?userType=${userType}`, {
        headers: getAuthHeaders(),
      })

      if (response.ok) {
        const data = await response.json()
        setConversation(data)
      }
    } catch (error) {
      console.error('Error fetching conversation:', error)
    }
  }, [conversationId, userType, getAuthHeaders])

  const markMessagesAsRead = useCallback(async () => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationId,
          userType,
        }),
      })
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }, [conversationId, userType, getAuthHeaders])

  // Store conversation in ref to avoid dependency issues
  const conversationRef = useRef<Conversation | null>(null)
  
  useEffect(() => {
    conversationRef.current = conversation
  }, [conversation])

  const fetchMessages = useCallback(async () => {
    const isInitialLoad = isInitialLoadRef.current
    
    // Only show loading spinner on very first load
    if (isInitialLoad) {
      setIsLoading(true)
    } else {
      setIsPollingActive(true)
    }
    
    try {
      const response = await fetch(
        `/api/messages?conversationId=${conversationId}&userType=${userType}`,
        {
          headers: getAuthHeaders(),
        }
      )

      if (response.ok) {
        const data = await response.json()
        const newMessages = data.messages || []
        
        // Only update state if there are new messages or this is initial load
        setMessages(currentMessages => {
          if (isInitialLoad || newMessages.length !== currentMessages.length) {
            // Check for notifications only if this is a polling update with new messages
            if (!isInitialLoad && currentMessages.length > 0 && newMessages.length > currentMessages.length) {
              const latestMessage = newMessages[newMessages.length - 1]
              const isFromOtherParty = latestMessage.senderType !== userType
              
              if (isFromOtherParty && conversationRef.current) {
                const senderName = latestMessage.senderType === 'advisor' 
                  ? (conversationRef.current.assignedAdvisor?.name || 'Advisor')
                  : `${conversationRef.current.client.firstName} ${conversationRef.current.client.lastName}` || 'Client'
                
                toast.success(`New message from ${senderName}`, {
                  description: latestMessage.content.length > 50 
                    ? `${latestMessage.content.substring(0, 50)}...`
                    : latestMessage.content,
                  duration: 4000,
                })
              }
            }
            
            return newMessages
          }
          return currentMessages
        })
        
        // Mark messages as read only on initial load or if user is actively viewing
        if (isInitialLoad || document.hasFocus()) {
          markMessagesAsRead()
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      if (isInitialLoad) {
        setIsLoading(false)
        isInitialLoadRef.current = false
      } else {
        setTimeout(() => setIsPollingActive(false), 200)
      }
    }
  }, [conversationId, userType, getAuthHeaders, markMessagesAsRead])

  useEffect(() => {
    if (conversationId) {
      // Reset initial load flag when conversation changes
      isInitialLoadRef.current = true
      setIsLoading(true)
      fetchConversation()
      fetchMessages() // Initial load
    }
  }, [conversationId, fetchConversation, fetchMessages])

  // Set up polling for real-time updates
  useEffect(() => {
    if (conversationId && isPolling && !isInitialLoadRef.current) {
      pollingIntervalRef.current = setInterval(() => {
        fetchMessages() // Polling updates
      }, 3000) // Poll every 3 seconds

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current)
        }
      }
    }
  }, [conversationId, isPolling, fetchMessages])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          conversationId,
          content: newMessage.trim(),
          messageType: 'text',
          userType,
        }),
      })

      if (response.ok) {
        setNewMessage('')
        await fetchMessages() // Immediately refresh messages
        onConversationUpdate?.() // Update conversation list
        
        // Show success feedback
        toast.success('Message sent', {
          duration: 2000,
        })
      } else {
        const error = await response.json()
        console.error('Error sending message:', error)
        toast.error('Failed to send message', {
          description: error.error || 'Please try again',
          duration: 4000,
        })
      }
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Network error', {
        description: 'Could not send message. Please check your connection.',
        duration: 4000,
      })
    } finally {
      setIsSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } else {
      return date.toLocaleDateString([], { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit', 
        minute: '2-digit' 
      })
    }
  }

  const getSenderName = (message: Message) => {
    if (message.senderType === 'advisor') {
      return conversation?.assignedAdvisor?.name || 'Advisor'
    } else {
      return `${conversation?.client.firstName} ${conversation?.client.lastName}` || 'Client'
    }
  }

  const isOwnMessage = (message: Message) => {
    return message.senderType === userType
  }

  if (!conversation) {
    return (
      <Card className="h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading conversation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                <AvatarInitials 
                  name={userType === 'client' 
                    ? (conversation.assignedAdvisor?.name || 'A')
                    : `${conversation.client.firstName} ${conversation.client.lastName}`
                  } 
                />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{conversation.title}</CardTitle>
              <p className="text-sm text-gray-600">
                {userType === 'client' 
                  ? `with ${conversation.assignedAdvisor?.name || 'Advisor'}`
                  : `${conversation.client.firstName} ${conversation.client.lastName}`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
              {conversation.status}
            </Badge>
            {conversation.priority !== 'normal' && (
              <Badge variant={conversation.priority === 'urgent' ? 'destructive' : 'outline'}>
                {conversation.priority}
              </Badge>
            )}
            
            {/* Real-time status indicator */}
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsPolling(!isPolling)}
                className="text-xs"
                title={isPolling ? 'Pause real-time updates' : 'Resume real-time updates'}
              >
                {isPolling ? (
                  <>
                    <Wifi className="h-3 w-3 text-green-500" />
                    <span className="ml-1 text-green-600">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3 text-gray-400" />
                    <span className="ml-1 text-gray-500">Paused</span>
                  </>
                )}
              </Button>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>View details</DropdownMenuItem>
                <DropdownMenuItem>Archive conversation</DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setIsPolling(!isPolling)}
                >
                  {isPolling ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Live Updates
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Resume Live Updates
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <Separator />

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <p className="text-sm">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-center text-gray-500">
              <p className="text-sm">No messages yet</p>
              <p className="text-xs text-gray-400 mt-1">Start the conversation!</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    isOwnMessage(message)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium opacity-75">
                      {getSenderName(message)}
                    </span>
                    <span className="text-xs opacity-60 ml-2">
                      {formatMessageTime(message.createdAt)}
                    </span>
                  </div>
                  
                  {message.messageType === 'file' ? (
                    <div className="flex items-center space-x-2">
                      <Paperclip className="h-4 w-4" />
                      <a
                        href={message.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:no-underline"
                      >
                        {message.fileName}
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>

      <Separator />

      {/* Message Input */}
      <div className="p-4 flex-shrink-0">
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" disabled>
            <Paperclip className="h-4 w-4" />
          </Button>
          
          <div className="flex-1 flex space-x-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              disabled={isSending}
            />
            
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || isSending}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}