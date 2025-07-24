'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { MessageSquare, User, Clock } from 'lucide-react'
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
      const response = await fetch('/api/conversations?userType=client', {
        headers: token ? {
          'Authorization': `Bearer ${token}`,
        } : {},
      })

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // Auto-select first conversation if available and none selected
        if (data.conversations?.length > 0 && !selectedConversation) {
          setSelectedConversation(data.conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }, [client, selectedConversation])

  useEffect(() => {
    if (client) {
      fetchConversations()
    }
  }, [client, fetchConversations])

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
    <div className="flex h-full bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-[400px] bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Messages</h2>
          <p className="text-sm text-gray-600 mt-1">
            Conversations with your advisory team
          </p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loadingConversations ? (
            <div className="p-4 text-center text-gray-500">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Your advisor will start a conversation with you
              </p>
            </div>
          ) : (
            <div className="space-y-0">
              {conversations.map((conversation, index) => (
                <div key={conversation.id}>
                  <button
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <Avatar>
                        <AvatarFallback>
                          <AvatarInitials 
                            name={conversation.assignedAdvisor ? conversation.assignedAdvisor.name : 'A'} 
                          />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </h4>
                            {conversation.assignedAdvisor && (
                              <p className="text-xs text-gray-600 mt-1 flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {conversation.assignedAdvisor.name}
                              </p>
                            )}
                            {conversation.lastMessageAt && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(conversation.lastMessageAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end space-y-1 ml-2">
                            <Badge
                              variant={conversation.status === 'active' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {conversation.status}
                            </Badge>
                            {conversation.priority !== 'normal' && (
                              <Badge
                                variant={conversation.priority === 'urgent' ? 'destructive' : 'outline'}
                                className="text-xs"
                              >
                                {conversation.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                  {index < conversations.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Messaging Interface */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <div className="p-6">
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