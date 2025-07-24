"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { 
  MessageSquare, 
  Phone, 
  Video, 
  Mail, 
  Plus, 
  Send, 
  ArrowUpRight, 
  ArrowDownLeft,
  Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Communication {
  id: string
  type: 'email' | 'call' | 'meeting' | 'message'
  subject?: string
  content: string
  direction: 'inbound' | 'outbound'
  occurredAt: string
  clientId: string
  applicationId?: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  user: {
    id: string
    name: string
    email: string
  }
}

interface CommunicationHubProps {
  clientId?: string
  applicationId?: string
  showClientFilter?: boolean
}

const communicationTypeIcons = {
  email: Mail,
  call: Phone,
  meeting: Video,
  message: MessageSquare,
}

const communicationTypePriority = {
  email: 1,
  message: 2,
  call: 3,
  meeting: 4,
}

export default function CommunicationHub({ 
  clientId, 
  applicationId, 
  showClientFilter = true 
}: CommunicationHubProps) {
  const [communications, setCommunications] = useState<Communication[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [clients, setClients] = useState<Array<{
    id: string
    firstName: string
    lastName: string
    email: string
  }>>([])

  // New communication form state
  const [newComm, setNewComm] = useState({
    clientId: clientId || '',
    applicationId: applicationId || '',
    type: 'email' as Communication['type'],
    subject: '',
    content: '',
    direction: 'outbound' as Communication['direction'],
  })

  const fetchCommunications = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (clientId) params.append('clientId', clientId)
      if (applicationId) params.append('applicationId', applicationId)
      if (selectedType !== 'all') params.append('type', selectedType)

      const response = await fetch(`/api/communications?${params}`)
      if (response.ok) {
        const data = await response.json()
        setCommunications(data.communications)
      }
    } catch (error) {
      console.error('Error fetching communications:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId, applicationId, selectedType])

  useEffect(() => {
    fetchCommunications()
  }, [fetchCommunications])

  useEffect(() => {
    if (showClientFilter) {
      fetchClients()
    }
  }, [showClientFilter])

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients')
      if (response.ok) {
        const data = await response.json()
        setClients(data.clients)
      }
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }

  const handleCreateCommunication = async () => {
    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newComm),
      })

      if (response.ok) {
        const newCommunication = await response.json()
        setCommunications(prev => [newCommunication, ...prev])
        setShowNewDialog(false)
        setNewComm({
          clientId: clientId || '',
          applicationId: applicationId || '',
          type: 'email',
          subject: '',
          content: '',
          direction: 'outbound',
        })
      }
    } catch (error) {
      console.error('Error creating communication:', error)
    }
  }

  const filteredCommunications = communications.filter(comm => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        comm.subject?.toLowerCase().includes(query) ||
        comm.content.toLowerCase().includes(query) ||
        `${comm.client.firstName} ${comm.client.lastName}`.toLowerCase().includes(query)
      )
    }
    return true
  })

  const groupedCommunications = filteredCommunications.reduce((groups, comm) => {
    const date = new Date(comm.occurredAt).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(comm)
    return groups
  }, {} as Record<string, Communication[]>)

  const getTypeColor = (type: Communication['type']) => {
    switch (type) {
      case 'email': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
      case 'call': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
      case 'meeting': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300'
      case 'message': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Communications</h2>
          <p className="text-muted-foreground">Manage all client communications in one place</p>
        </div>
        
        <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Communication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Communication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {showClientFilter && (
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select 
                    value={newComm.clientId} 
                    onValueChange={(value) => setNewComm(prev => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map(client => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.firstName} {client.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Type</Label>
                  <Select 
                    value={newComm.type} 
                    onValueChange={(value: Communication['type']) => setNewComm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="call">Phone Call</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="message">Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="direction">Direction</Label>
                  <Select 
                    value={newComm.direction} 
                    onValueChange={(value: Communication['direction']) => setNewComm(prev => ({ ...prev, direction: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="outbound">Outbound</SelectItem>
                      <SelectItem value="inbound">Inbound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {newComm.type === 'email' && (
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={newComm.subject}
                    onChange={(e) => setNewComm(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Email subject"
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="content">Content/Notes</Label>
                <Textarea
                  id="content"
                  value={newComm.content}
                  onChange={(e) => setNewComm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Communication content or notes"
                  rows={4}
                />
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowNewDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCommunication} disabled={!newComm.content || !newComm.clientId}>
                  <Send className="h-4 w-4 mr-2" />
                  Add Communication
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search communications..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="call">Phone Calls</SelectItem>
            <SelectItem value="meeting">Meetings</SelectItem>
            <SelectItem value="message">Messages</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Communications List */}
      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-8">Loading communications...</div>
        ) : Object.keys(groupedCommunications).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No communications found</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first communication with a client.
              </p>
              <Button onClick={() => setShowNewDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Communication
              </Button>
            </CardContent>
          </Card>
        ) : (
          Object.entries(groupedCommunications)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime())
            .map(([date, comms]) => (
              <div key={date}>
                <div className="flex items-center mb-4">
                  <div className="h-px bg-border flex-1" />
                  <div className="px-4 text-sm text-muted-foreground font-medium">
                    {new Date(date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div className="h-px bg-border flex-1" />
                </div>
                
                <div className="space-y-3">
                  {comms
                    .sort((a, b) => communicationTypePriority[a.type] - communicationTypePriority[b.type])
                    .map((comm) => {
                      const Icon = communicationTypeIcons[comm.type]
                      return (
                        <Card key={comm.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-4">
                              <div className={`p-2 rounded-full ${getTypeColor(comm.type)}`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center space-x-2">
                                    <Badge variant="outline" className={getTypeColor(comm.type)}>
                                      {comm.type}
                                    </Badge>
                                    <div className="flex items-center text-sm text-muted-foreground">
                                      {comm.direction === 'outbound' ? (
                                        <ArrowUpRight className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ArrowDownLeft className="h-3 w-3 mr-1" />
                                      )}
                                      {comm.direction}
                                    </div>
                                  </div>
                                  
                                  <div className="text-sm text-muted-foreground">
                                    {formatDistanceToNow(new Date(comm.occurredAt), { addSuffix: true })}
                                  </div>
                                </div>
                                
                                {!clientId && (
                                  <div className="text-sm font-medium mb-1">
                                    {comm.client.firstName} {comm.client.lastName}
                                  </div>
                                )}
                                
                                {comm.subject && (
                                  <div className="font-medium mb-1">{comm.subject}</div>
                                )}
                                
                                <div className="text-sm text-muted-foreground line-clamp-2">
                                  {comm.content}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}