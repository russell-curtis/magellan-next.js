'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DocumentPreview } from '@/components/ui/document-preview'
import { DocumentUpload } from '@/components/ui/document-upload'
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
  Download,
  Eye,
  Upload,
  Trash2,
  X
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
    investmentAmount: string
    submittedAt: string
    decisionExpectedAt?: string
    programName: string
  }>
  documents?: Array<{
    id: string
    filename: string
    fileUrl: string
    contentType: string
    fileSize: number
    status: string
    complianceStatus: string
    uploadedAt: string
    documentType: string
    createdAt: string
    updatedAt: string
  }>
  communications?: Array<{
    id: string
    type: string
    subject: string
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
  const [previewDocument, setPreviewDocument] = useState<{
    id: string
    filename: string
    fileUrl: string
    contentType: string
    fileSize: number
    status: string
    description?: string
  } | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [showUpload, setShowUpload] = useState(false)

  const fetchClientProfile = useCallback(async () => {
    if (!clientId) return

    setLoading(true)
    try {
      const [profileResponse, documentsResponse] = await Promise.all([
        fetch(`/api/clients/${clientId}/profile`),
        fetch(`/api/clients/${clientId}/documents`)
      ])
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch client profile')
      }
      
      const profileData = await profileResponse.json()
      let documentsData = { documents: [] }
      
      // Documents might not exist yet, so handle gracefully
      if (documentsResponse.ok) {
        documentsData = await documentsResponse.json()
      }
      
      setClient({
        ...profileData.client,
        documents: documentsData.documents || []
      })
    } catch (error) {
      console.error('Error fetching client profile:', error)
      setClient(null)
    } finally {
      setLoading(false)
    }
  }, [clientId])

  const refreshDocuments = useCallback(async () => {
    if (!clientId) return
    
    try {
      const response = await fetch(`/api/clients/${clientId}/documents`)
      if (response.ok) {
        const data = await response.json()
        setClient(prev => prev ? {
          ...prev,
          documents: data.documents || []
        } : null)
      }
    } catch (error) {
      console.error('Error refreshing documents:', error)
    }
  }, [clientId])

  useEffect(() => {
    if (open && clientId) {
      fetchClientProfile()
    }
  }, [open, clientId, fetchClientProfile])

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      setClient(null)
      setActiveTab('overview')
      setPreviewDocument(null)
      setPreviewOpen(false)
      setShowUpload(false)
    }
  }, [open])

  const handleDocumentPreview = (document: {
    id: string
    filename: string
    fileUrl: string
    contentType: string
    fileSize: number
    status: string
    description?: string
  }) => {
    setPreviewDocument(document)
    setPreviewOpen(true)
  }

  const handleDocumentDelete = async (documentId: string) => {
    if (!clientId) return
    
    try {
      const response = await fetch(`/api/clients/${clientId}/documents?documentId=${documentId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await refreshDocuments()
      }
    } catch (error) {
      console.error('Error deleting document:', error)
    }
  }

  const handleUploadComplete = () => {
    setShowUpload(false)
    refreshDocuments()
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'prospect': 'bg-blue-100 text-blue-800 border-blue-200',
      'active': 'bg-green-100 text-green-800 border-green-200',
      'approved': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'under_review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'completed': 'bg-green-100 text-green-800 border-green-200',
      'pending': 'bg-orange-100 text-orange-800 border-orange-200',
      'pending_review': 'bg-orange-100 text-orange-800 border-orange-200',
      'verified': 'bg-green-100 text-green-800 border-green-200',
      'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      'urgent': 'bg-red-100 text-red-800',
      'high': 'bg-orange-100 text-orange-800',
      'medium': 'bg-yellow-100 text-yellow-800',
      'low': 'bg-green-100 text-green-800',
    }
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateString
    }
  }

  const formatPhone = (phone: string | null) => {
    if (!phone) return 'Not provided'
    
    // Clean the phone number - remove all non-digits
    const cleaned = phone.replace(/\D/g, '')
    
    if (cleaned.length === 0) return phone
    
    // Simple formatting based on length
    if (cleaned.length >= 10) {
      const len = cleaned.length
      if (len === 10) {
        // US format: (XXX) XXX-XXXX
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
      } else {
        // International format: +X XXX XXX XXXX
        const country = cleaned.slice(0, len - 10)
        const rest = cleaned.slice(-10)
        return `+${country} ${rest.slice(0, 3)} ${rest.slice(3, 6)} ${rest.slice(6)}`
      }
    }
    
    // If less than 10 digits, just return original
    return phone
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Loading Client Profile...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0">
        {/* Header */}
        <DialogHeader className="px-6 py-4 pr-12 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="text-lg">
                  {client.firstName[0]}{client.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">
                  {client.firstName} {client.lastName}
                </DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(client.status)}>
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
            <div className="flex items-center space-x-2">
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

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-6 py-3 border-b">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="tasks">Tasks</TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <TabsContent value="overview" className="mt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Personal Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                        <span className="text-sm">{formatPhone(client.phone)}</span>
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

              {/* Additional sections in overview */}
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
                        <p className="text-sm text-gray-700">
                          {client.notes}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="applications" className="mt-0">
              <div className="flex items-center justify-between mb-4">
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
                          <div>
                            <h4 className="font-medium">{app.programName}</h4>
                            <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
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
                          <Badge className={getStatusColor(app.status)}>
                            {app.status.replace('_', ' ')}
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

            <TabsContent value="documents" className="mt-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Documents</h3>
                <Button 
                  size="sm"
                  onClick={() => setShowUpload(!showUpload)}
                >
                  {showUpload ? (
                    <>
                      <X className="h-4 w-4 mr-2" />
                      Cancel Upload
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload Document
                    </>
                  )}
                </Button>
              </div>

              {/* Document Upload Section */}
              {showUpload && clientId && (
                <div className="mb-6 p-4 border rounded-lg bg-gray-50">
                  <DocumentUpload
                    clientId={clientId}
                    onUploadComplete={handleUploadComplete}
                    onUploadError={(error) => console.error('Upload error:', error)}
                  />
                </div>
              )}
              
              {/* Documents List */}
              {client.documents && client.documents.length > 0 ? (
                <div className="space-y-3">
                  {client.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="h-6 w-6 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{doc.filename}</div>
                          <div className="text-sm text-muted-foreground">
                            {doc.documentType || 'Document'} • {formatFileSize(doc.fileSize)} • Uploaded {formatDate(doc.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(doc.status)}>
                          {doc.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline" className={getStatusColor(doc.complianceStatus)}>
                          {doc.complianceStatus.replace('_', ' ')}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDocumentPreview(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const link = window.document.createElement('a')
                            link.href = doc.fileUrl
                            link.download = doc.filename
                            link.click()
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDocumentDelete(doc.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground mb-2">No documents uploaded yet</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Upload important documents like passports, financial statements, and application forms
                  </p>
                  {!showUpload && (
                    <Button onClick={() => setShowUpload(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Upload First Document
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="communications" className="mt-0">
              <div className="flex items-center justify-between mb-4">
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
                            <span className="font-medium">{comm.subject}</span>
                            <Badge variant="outline">
                              {comm.type}
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

            <TabsContent value="tasks" className="mt-0">
              <div className="flex items-center justify-between mb-4">
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
                      <Badge className={getStatusColor(task.status)}>
                        {task.status.replace('_', ' ')}
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

        {/* Document Preview Modal */}
        <DocumentPreview
          document={previewDocument}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      </DialogContent>
    </Dialog>
  )
}