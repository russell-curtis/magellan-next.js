'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, Plus, User, Clock, Search, Lightbulb, AlertTriangle } from 'lucide-react'
import { MessagingInterface } from '@/components/messaging/messaging-interface'

interface Client {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface Conversation {
  id: string
  title: string
  status: string
  priority: string
  lastMessageAt: string | null
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false)
  
  // New conversation form
  const [selectedClient, setSelectedClient] = useState('')
  const [conversationTitle, setConversationTitle] = useState('')
  const [priority, setPriority] = useState('normal')
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [existingConversations, setExistingConversations] = useState<Conversation[]>([])
  const [showOverFragmentationWarning, setShowOverFragmentationWarning] = useState(false)

  const fetchConversations = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/conversations?userType=advisor')

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
      setIsLoading(false)
    }
  }, [selectedConversation])

  useEffect(() => {
    fetchConversations()
    fetchClients()
  }, [fetchConversations])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')

      if (response.ok) {
        const data = await response.json()
        setClients(data.clients || [])
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  // Generate smart title suggestions based on common patterns
  const generateTitleSuggestions = (clientId: string) => {
    const client = clients.find(c => c.id === clientId)
    if (!client) return []

    const clientName = `${client.firstName} ${client.lastName}`
    
    const suggestions = [
      `Initial Consultation - ${clientName}`,
      `Application Status - ${clientName}`,
      `Document Review - ${clientName}`,
      `Investment Planning - ${clientName}`,
      `Due Diligence - ${clientName}`,
      `Family Application - ${clientName}`,
      `Urgent Matter - ${clientName}`,
      `Follow-up - ${clientName}`,
    ]

    return suggestions
  }

  // Check existing conversations for the selected client
  const checkExistingConversations = useCallback(async (clientId: string) => {
    if (!clientId) {
      setExistingConversations([])
      setShowOverFragmentationWarning(false)
      return
    }

    try {
      const response = await fetch(`/api/conversations?userType=advisor&clientId=${clientId}&status=active`)
      
      if (response.ok) {
        const data = await response.json()
        const clientConversations = data.conversations || []
        setExistingConversations(clientConversations)
        
        // Show warning if client already has 3+ active conversations
        setShowOverFragmentationWarning(clientConversations.length >= 3)
      }
    } catch (error) {
      console.error('Error fetching client conversations:', error)
    }
  }, [])

  // Handle client selection with smart suggestions
  const handleClientChange = (clientId: string) => {
    setSelectedClient(clientId)
    setConversationTitle('') // Reset title when client changes
    
    if (clientId) {
      setTitleSuggestions(generateTitleSuggestions(clientId))
      checkExistingConversations(clientId)
    } else {
      setTitleSuggestions([])
      setExistingConversations([])
      setShowOverFragmentationWarning(false)
    }
  }

  const createConversation = async () => {
    if (!selectedClient || !conversationTitle.trim()) return

    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: selectedClient,
          title: conversationTitle.trim(),
          priority,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setShowNewConversationDialog(false)
        
        // Reset form state
        setSelectedClient('')
        setConversationTitle('')
        setPriority('normal')
        setTitleSuggestions([])
        setExistingConversations([])
        setShowOverFragmentationWarning(false)
        
        // Refresh conversations and select the new one
        await fetchConversations()
        setSelectedConversation(data.id)
      } else {
        const error = await response.json()
        console.error('Error creating conversation:', error)
      }
    } catch (error) {
      console.error('Error creating conversation:', error)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${conv.client.firstName} ${conv.client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-80 bg-white border-r flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            
            <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Conversation</DialogTitle>
                  <DialogDescription>
                    Create a new conversation with a client
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Select Client</Label>
                    <Select value={selectedClient} onValueChange={handleClientChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.firstName} {client.lastName} ({client.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Over-fragmentation warning */}
                  {showOverFragmentationWarning && (
                    <Alert>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        This client already has {existingConversations.length} active conversations. 
                        Consider using an existing conversation to keep communication organized.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Existing conversations list for reference */}
                  {existingConversations.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Existing Active Conversations:</Label>
                      <div className="max-h-32 overflow-y-auto space-y-1">
                        {existingConversations.map((conv) => (
                          <div key={conv.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <span className="truncate flex-1">{conv.title}</span>
                            <Badge variant="outline" className="ml-2 text-xs">
                              {conv.priority}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="title">Conversation Title</Label>
                    <Input
                      id="title"
                      value={conversationTitle}
                      onChange={(e) => setConversationTitle(e.target.value)}
                      placeholder="Enter conversation title"
                    />
                    
                    {/* Title suggestions */}
                    {titleSuggestions.length > 0 && !conversationTitle && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Lightbulb className="h-3 w-3" />
                          <span>Suggested titles:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {titleSuggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              className="h-auto px-2 py-1 text-xs"
                              onClick={() => setConversationTitle(suggestion)}
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNewConversationDialog(false)
                        // Reset form state
                        setSelectedClient('')
                        setConversationTitle('')
                        setPriority('normal')
                        setTitleSuggestions([])
                        setExistingConversations([])
                        setShowOverFragmentationWarning(false)
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={createConversation}
                      disabled={!selectedClient || !conversationTitle.trim()}
                      variant={showOverFragmentationWarning ? "outline" : "default"}
                    >
                      {showOverFragmentationWarning ? "Create Anyway" : "Create Conversation"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations..."
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">
                {searchTerm ? 'No conversations found' : 'No conversations yet'}
              </p>
              {!searchTerm && (
                <p className="text-xs text-gray-400 mt-1">
                  Create a new conversation to get started
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {filteredConversations.map((conversation, index) => (
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
                          <AvatarInitials name={`${conversation.client.firstName} ${conversation.client.lastName}`} />
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-medium text-gray-900 truncate">
                              {conversation.title}
                            </h4>
                            <p className="text-xs text-gray-600 mt-1 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {conversation.client.firstName} {conversation.client.lastName}
                            </p>
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
                  {index < filteredConversations.length - 1 && <Separator />}
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
              userType="advisor"
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
                  ? "Start by creating a new conversation with a client."
                  : "Select a conversation from the sidebar to start messaging."
                }
              </p>
              {conversations.length === 0 && (
                <Button onClick={() => setShowNewConversationDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Conversation
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}