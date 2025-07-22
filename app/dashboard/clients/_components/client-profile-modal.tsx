'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  User, 
  Phone, 
  Mail, 
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Edit,
  Plus,
  Download
} from 'lucide-react'

interface ClientWithFullDetails {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationality: string | null
  dateOfBirth: string | null
  passportNumber: string | null
  status: string
  netWorthEstimate: string | null
  investmentBudget: string | null
  sourceOfFunds: string | null
  notes: string | null
  tags: string[] | null
  createdAt: string
  assignedAdvisor?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  applications?: Array<{
    id: string
    status: string
    programName: string
    investmentAmount: string | null
    submittedAt: string | null
    decisionExpectedAt: string | null
  }>
  documents?: Array<{
    id: string
    filename: string
    documentType: string
    uploadedAt: string
    status: string
  }>
  communications?: Array<{
    id: string
    type: string
    subject: string | null
    content: string
    direction: 'inbound' | 'outbound'
    occurredAt: string
  }>
  tasks?: Array<{
    id: string
    title: string
    status: string
    priority: string
    dueDate: string
    assignedTo?: string
  }>
}

interface ClientProfileModalProps {
  clientId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ClientProfileModal({ 
  clientId, 
  open, 
  onOpenChange 
}: ClientProfileModalProps) {
  const [client, setClient] = useState<ClientWithFullDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')

  const fetchClientDetails = useCallback(async () => {
    if (!clientId) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${clientId}/profile`)
      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
      } else {
        console.error('Failed to fetch client details')
      }
    } catch (error) {
      console.error('Error fetching client details:', error)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  useEffect(() => {
    if (clientId && open) {
      fetchClientDetails()
    }
  }, [clientId, open, fetchClientDetails])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'active':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'prospect':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'rejected':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-red-600'
      case 'high':
        return 'text-orange-600'
      case 'medium':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount))
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not specified'
    return new Date(dateString).toLocaleDateString()
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Loading Client Profile...</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg">
                  {client.firstName[0]}{client.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl">
                  {client.firstName} {client.lastName}
                </DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge variant="outline" className={getStatusColor(client.status)}>
                    {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                  </Badge>
                  {client.nationality && (
                    <Badge variant="outline">
                      {client.nationality}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm">
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="overview" className="space-y-6 m-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Personal Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Email</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{client.email || 'Not provided'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Phone</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{client.phone || 'Not provided'}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{formatDate(client.dateOfBirth)}</span>
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Passport Number</label>
                          <div className="flex items-center space-x-2 mt-1">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{client.passportNumber || 'Not provided'}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Financial Information */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <DollarSign className="h-5 w-5" />
                        Financial Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Net Worth Estimate</label>
                        <div className="text-lg font-semibold mt-1">
                          {formatCurrency(client.netWorthEstimate)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Investment Budget</label>
                        <div className="text-lg font-semibold mt-1">
                          {formatCurrency(client.investmentBudget)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Source of Funds</label>
                        <p className="text-sm mt-1 text-gray-700">
                          {client.sourceOfFunds || 'Not specified'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Assigned Advisor */}
                {client.assignedAdvisor && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Assigned Advisor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center space-x-3">
                        <Avatar>
                          <AvatarFallback>
                            {client.assignedAdvisor.name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{client.assignedAdvisor.name}</div>
                          <div className="text-sm text-muted-foreground">{client.assignedAdvisor.email}</div>
                          <Badge variant="outline" className="mt-1">
                            {client.assignedAdvisor.role}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tags and Notes */}
                {(client.tags?.length || client.notes) && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {client.tags && client.tags.length > 0 && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {client.tags.map((tag) => (
                              <Badge key={tag} variant="secondary">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {client.notes && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground mb-2 block">Notes</label>
                          <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                            {client.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="applications" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Applications</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Application
                  </Button>
                </div>
                
                {client.applications && client.applications.length > 0 ? (
                  <div className="space-y-4">
                    {client.applications.map((app) => (
                      <Card key={app.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <h4 className="font-medium">{app.programName}</h4>
                              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                <span>Investment: {formatCurrency(app.investmentAmount)}</span>
                                <span>•</span>
                                <span>Submitted: {formatDate(app.submittedAt)}</span>
                                {app.decisionExpectedAt && (
                                  <>
                                    <span>•</span>
                                    <span>Decision Expected: {formatDate(app.decisionExpectedAt)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <Badge variant="outline" className={getStatusColor(app.status)}>
                              {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No applications yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Documents</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Upload Document
                  </Button>
                </div>
                
                {client.documents && client.documents.length > 0 ? (
                  <div className="space-y-2">
                    {client.documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{doc.filename}</div>
                            <div className="text-sm text-muted-foreground">
                              {doc.documentType} • Uploaded {formatDate(doc.uploadedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className={getStatusColor(doc.status)}>
                            {doc.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="communications" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Communications</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Message
                  </Button>
                </div>
                
                {client.communications && client.communications.length > 0 ? (
                  <div className="space-y-4">
                    {client.communications.map((comm) => (
                      <Card key={comm.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <MessageSquare className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{comm.subject || `${comm.type} communication`}</span>
                              <Badge variant={comm.direction === 'inbound' ? 'default' : 'secondary'}>
                                {comm.direction}
                              </Badge>
                            </div>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(comm.occurredAt)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700">{comm.content}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No communications yet</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tasks" className="space-y-4 m-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Tasks</h3>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Task
                  </Button>
                </div>
                
                {client.tasks && client.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {client.tasks.map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className={`p-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.status === 'completed' ? (
                              <CheckCircle className="h-4 w-4" />
                            ) : task.priority === 'urgent' ? (
                              <AlertTriangle className="h-4 w-4" />
                            ) : (
                              <Clock className="h-4 w-4" />
                            )}
                          </div>
                          <div>
                            <div className={`font-medium ${task.status === 'completed' ? 'line-through' : ''}`}>
                              {task.title}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Due: {formatDate(task.dueDate)}
                              {task.assignedTo && ` • Assigned to ${task.assignedTo}`}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getStatusColor(task.status)}>
                          {task.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No tasks assigned</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}