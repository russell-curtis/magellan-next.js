'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { OnlineStatusAvatar } from '@/components/ui/status-indicator'
import { PriorityBadge, PriorityIndicator } from '@/components/ui/priority-badge'
import { formatConversationDate, isRecent } from '@/lib/date-utils'
import { MessageSquare, Plus, User, Clock, Search, Lightbulb, AlertTriangle, ChevronDown, ChevronRight, Filter, X } from 'lucide-react'
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
  
  // Enhanced filtering and grouping state
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [groupByClient, setGroupByClient] = useState(true)
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set())
  
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
      // Build query parameters
      const params = new URLSearchParams({
        userType: 'advisor'
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

      const response = await fetch(`/api/conversations?${params.toString()}`)

      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
        
        // Only auto-select if no conversation is currently selected
        if (data.conversations?.length > 0) {
          setSelectedConversation(prev => prev || data.conversations[0].id)
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, priorityFilter, searchTerm]) // Removed selectedConversation dependency

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchConversations()
    }, 300) // 300ms debounce

    return () => clearTimeout(timeoutId)
  }, [searchTerm, statusFilter, priorityFilter, fetchConversations])

  // Initial fetch
  useEffect(() => {
    fetchClients()
  }, [])

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

  // Since filtering is now done server-side, use conversations directly
  const filteredConversations = conversations

  // Group conversations by client - memoized to prevent unnecessary recalculations
  const groupedConversations = useMemo(() => {
    return filteredConversations.reduce((groups, conversation) => {
      const clientKey = `${conversation.client.firstName} ${conversation.client.lastName}`
      if (!groups[clientKey]) {
        groups[clientKey] = {
          client: conversation.client,
          conversations: []
        }
      }
      groups[clientKey].conversations.push(conversation)
      return groups
    }, {} as Record<string, { client: Conversation['client'], conversations: Conversation[] }>)
  }, [filteredConversations])

  // Toggle client expansion
  const toggleClientExpansion = (clientKey: string) => {
    const newExpanded = new Set(expandedClients)
    if (newExpanded.has(clientKey)) {
      newExpanded.delete(clientKey)
    } else {
      newExpanded.add(clientKey)
    }
    setExpandedClients(newExpanded)
  }

  // Auto-expand clients on initial load or when searching
  useEffect(() => {
    const clientKeys = Object.keys(groupedConversations)
    if (searchTerm || clientKeys.length <= 3) {
      // Auto-expand all clients if searching or if there are few clients
      setExpandedClients(prev => {
        const newSet = new Set(clientKeys)
        // Only update if the set has actually changed
        if (prev.size !== newSet.size || !Array.from(prev).every(key => newSet.has(key))) {
          return newSet
        }
        return prev
      })
    }
  }, [searchTerm, groupedConversations])

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Conversations List */}
      <div className="w-[400px] bg-white border-r flex flex-col">
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
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search conversations, clients, and messages..."
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
                <SelectItem value="closed">Closed</SelectItem>
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

            <Button
              variant="outline"
              size="sm"
              onClick={() => setGroupByClient(!groupByClient)}
              className={`flex-shrink-0 px-3 ${groupByClient ? 'bg-blue-50 text-blue-700 border-blue-200' : ''}`}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              {groupByClient ? 'Grouped' : 'List'}
            </Button>
          </div>
        </div>

        {/* Search Results Header */}
        {searchTerm && (
          <div className="px-4 py-2 bg-blue-50 border-b">
            <p className="text-xs text-blue-700">
              {isLoading ? 'Searching...' : `${filteredConversations.length} result${filteredConversations.length !== 1 ? 's' : ''} for "${searchTerm}"`}
            </p>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              {searchTerm ? 'Searching conversations and messages...' : 'Loading conversations...'}
            </div>
          ) : filteredConversations.length === 0 ? (
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
                  Create a new conversation to get started
                </p>
              )}
            </div>
          ) : groupByClient ? (
            // Grouped by client view
            <div className="space-y-1">
              {Object.entries(groupedConversations).map(([clientKey, group]) => {
                const isExpanded = expandedClients.has(clientKey)
                const conversationCount = group.conversations.length
                
                return (
                  <Collapsible key={clientKey} open={isExpanded} onOpenChange={() => toggleClientExpansion(clientKey)}>
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors border-b">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-gray-500" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500" />
                            )}
                            <OnlineStatusAvatar status="offline">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200">
                                  <AvatarInitials 
                                    name={`${group.client.firstName} ${group.client.lastName}`}
                                    className="text-blue-700 font-semibold"
                                  />
                                </AvatarFallback>
                              </Avatar>
                            </OnlineStatusAvatar>
                          </div>
                          <div className="text-left">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {group.client.firstName} {group.client.lastName}
                            </h3>
                            <p className="text-xs text-gray-500">{group.client.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge 
                            variant="outline" 
                            className="text-xs font-medium bg-gray-50 text-gray-700"
                          >
                            {conversationCount}
                          </Badge>
                          {group.conversations.some(conv => conv.priority === 'urgent') && (
                            <PriorityBadge priority="urgent" showText={false} />
                          )}
                          {group.conversations.some(conv => conv.priority === 'high' && conv.priority !== 'urgent') && (
                            <PriorityBadge priority="high" showText={false} />
                          )}
                          {group.conversations.some(conv => conv.lastMessageAt && isRecent(conv.lastMessageAt)) && (
                            <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 border-l border-gray-200">
                        {group.conversations.map((conversation, index) => (
                          <div key={conversation.id} className="relative">
                            <PriorityIndicator 
                              priority={conversation.priority as 'low' | 'normal' | 'high' | 'urgent'} 
                              className="absolute left-0 top-3 bottom-3" 
                            />
                            <button
                              onClick={() => setSelectedConversation(conversation.id)}
                              className={`w-full p-3 pl-4 text-left hover:bg-gray-50 transition-colors relative ${
                                selectedConversation === conversation.id 
                                  ? 'bg-blue-50 border-r-2 border-blue-500' 
                                  : ''
                              }`}
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <h4 className="text-sm font-medium text-gray-900 truncate">
                                      {conversation.title}
                                    </h4>
                                    {conversation.lastMessageAt && isRecent(conversation.lastMessageAt) && (
                                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                                    )}
                                  </div>
                                  {conversation.lastMessageAt && (
                                    <p className="text-xs text-gray-500 flex items-center">
                                      <Clock className="h-3 w-3 mr-1" />
                                      {formatConversationDate(conversation.lastMessageAt)}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex flex-col items-end space-y-1 ml-2">
                                  <Badge
                                    variant={conversation.status === 'active' ? 'default' : 'secondary'}
                                    className={`text-xs ${
                                      conversation.status === 'active' 
                                        ? 'bg-green-100 text-green-800 border-green-200' 
                                        : ''
                                    }`}
                                  >
                                    {conversation.status}
                                  </Badge>
                                  <PriorityBadge 
                                    priority={conversation.priority as 'low' | 'normal' | 'high' | 'urgent'}
                                    variant="minimal"
                                    showIcon={false}
                                  />
                                </div>
                              </div>
                            </button>
                            {index < group.conversations.length - 1 && <Separator className="ml-4" />}
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )
              })}
            </div>
          ) : (
            // Traditional list view
            <div className="space-y-0">
              {filteredConversations.map((conversation, index) => (
                <div key={conversation.id} className="relative">
                  <PriorityIndicator 
                    priority={conversation.priority as 'low' | 'normal' | 'high' | 'urgent'} 
                    className="absolute left-0 top-4 bottom-4" 
                  />
                  <button
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={`w-full p-4 pl-5 text-left hover:bg-gray-50 transition-colors ${
                      selectedConversation === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <OnlineStatusAvatar status="offline">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200">
                            <AvatarInitials 
                              name={`${conversation.client.firstName} ${conversation.client.lastName}`}
                              className="text-blue-700 font-semibold"
                            />
                          </AvatarFallback>
                        </Avatar>
                      </OnlineStatusAvatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h4 className="text-sm font-semibold text-gray-900 truncate">
                                {conversation.title}
                              </h4>
                              {conversation.lastMessageAt && isRecent(conversation.lastMessageAt) && (
                                <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                              )}
                            </div>
                            <p className="text-xs text-gray-600 mb-1 flex items-center">
                              <User className="h-3 w-3 mr-1" />
                              {conversation.client.firstName} {conversation.client.lastName}
                            </p>
                            {conversation.lastMessageAt && (
                              <p className="text-xs text-gray-500 flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {formatConversationDate(conversation.lastMessageAt)}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex flex-col items-end space-y-1 ml-2">
                            <Badge
                              variant={conversation.status === 'active' ? 'default' : 'secondary'}
                              className={`text-xs ${
                                conversation.status === 'active' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : ''
                              }`}
                            >
                              {conversation.status}
                            </Badge>
                            <PriorityBadge 
                              priority={conversation.priority as 'low' | 'normal' | 'high' | 'urgent'}
                              variant="minimal"
                              showIcon={false}
                            />
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