'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DocumentPreview } from '@/components/ui/document-preview'
import { DocumentUpload } from '@/components/ui/document-upload'
import { ApplicationCreateModal } from '../_components/application-create-modal'
import { ApplicationStatusWorkflow } from '../_components/application-status-workflow'
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
  X,
  ArrowLeft
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
    applicationNumber: string
    status: string
    priority: string
    investmentAmount: string
    investmentType?: string
    submittedAt: string
    decisionExpectedAt?: string
    decidedAt?: string
    notes?: string
    internalNotes?: string
    program: {
      id: string
      countryName: string
      programName: string
      programType: string
      minInvestment: string
      processingTimeMonths: number
    }
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

export default function ClientProfilePage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<ClientWithFullDetails | null>(null)
  const [loading, setLoading] = useState(true)
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
  const [showApplicationModal, setShowApplicationModal] = useState(false)

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
    if (clientId) {
      fetchClientProfile()
    }
  }, [clientId, fetchClientProfile])

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

  const handleApplicationCreated = () => {
    fetchClientProfile()
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
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Client Not Found</h2>
            <p className="text-gray-500 mb-4">The client you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
            <Button onClick={() => router.push('/dashboard/clients')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Clients
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="text-xl">
              {client.firstName[0]}{client.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getStatusColor(client.status)}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Badge>
              {client.nationality && (
                <Badge variant="outline">
                  {client.nationality}
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Client since {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline">
            <Edit className="h-4 w-4 mr-2" />
            Edit Client
          </Button>
          <Button variant="outline">
            <MessageSquare className="h-4 w-4 mr-2" />
            Send Message
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => router.push('/dashboard/clients')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="text-sm">Back</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
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

          {/* Additional sections */}
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

        {/* Applications Tab */}
        <TabsContent value="applications" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Applications</h2>
            <Button onClick={() => setShowApplicationModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Application
            </Button>
          </div>
          
          {client.applications && client.applications.length > 0 ? (
            <div className="space-y-6">
              {client.applications.map((app) => (
                <div key={app.id} className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl">
                            {app.program?.countryName || 'Unknown Country'} - {app.program?.programName || 'Unknown Program'}
                          </h3>
                          <p className="text-sm text-muted-foreground font-normal">
                            Application #{app.applicationNumber}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={getStatusColor(app.status)}>
                            {app.status.replace('_', ' ')}
                          </Badge>
                          <Badge className={getPriorityColor(app.priority)}>
                            {app.priority} priority
                          </Badge>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Investment Amount:</span>
                          <div className="font-medium">{formatCurrency(app.investmentAmount)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Investment Type:</span>
                          <div className="font-medium">{app.investmentType || 'Not specified'}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Processing Time:</span>
                          <div className="font-medium">{app.program?.processingTimeMonths || 'TBD'} months</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <ApplicationStatusWorkflow
                    application={{
                      id: app.id,
                      applicationNumber: app.applicationNumber,
                      status: app.status,
                      priority: app.priority,
                      submittedAt: app.submittedAt,
                      decisionExpectedAt: app.decisionExpectedAt,
                      decidedAt: app.decidedAt,
                      notes: app.notes,
                      internalNotes: app.internalNotes,
                      program: {
                        countryName: app.program?.countryName || 'Unknown Country',
                        programName: app.program?.programName || 'Unknown Program'
                      },
                      client: {
                        firstName: client.firstName,
                        lastName: client.lastName
                      }
                    }}
                    onStatusUpdate={fetchClientProfile}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No applications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create the first application for this client to get started
              </p>
              <Button onClick={() => setShowApplicationModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Application
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Documents</h2>
            <Button 
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
                <Card key={doc.id} className="hover:bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 flex-1">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-lg">{doc.filename}</div>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No documents uploaded yet</h3>
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

        {/* Communications Tab */}
        <TabsContent value="communications" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Communications</h2>
            <Button>
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
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        <span className="font-medium text-lg">{comm.subject}</span>
                        <Badge variant="outline">
                          {comm.type}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(comm.occurredAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 ml-7">{comm.content}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No communications yet</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Start a conversation with this client
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Send First Message
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tasks Tab */}
        <TabsContent value="tasks" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Tasks</h2>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
          
          {client.tasks && client.tasks.length > 0 ? (
            <div className="space-y-3">
              {client.tasks.map((task) => (
                <Card key={task.id} className="hover:bg-gray-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded ${getPriorityColor(task.priority)}`}>
                          {task.status === 'completed' ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : task.priority === 'urgent' ? (
                            <AlertTriangle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className={`font-medium text-lg ${task.status === 'completed' ? 'line-through' : ''}`}>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks assigned</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Create tasks to track work for this client
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create First Task
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Document Preview Modal */}
      <DocumentPreview
        document={previewDocument}
        open={previewOpen}
        onOpenChange={setPreviewOpen}
      />

      {/* Application Create Modal */}
      <ApplicationCreateModal
        clientId={clientId}
        clientName={client ? `${client.firstName} ${client.lastName}` : ''}
        open={showApplicationModal}
        onOpenChange={setShowApplicationModal}
        onApplicationCreated={handleApplicationCreated}
      />
    </div>
  )
}