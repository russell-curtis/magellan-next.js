'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DocumentUpload } from '../../_components/document-upload'
import { DocumentList } from '../../_components/document-list'
import { ApplicationCreateModal } from '../_components/application-create-modal'
import { ApplicationCard } from '@/components/ui/application-card'
import CommunicationHub from '../../_components/communication-hub'
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
  X,
  ArrowLeft,
  Key
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
  const [showUpload, setShowUpload] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<{
    id: string
    role: string
    firmId: string
  } | null>(null)
  
  // Portal invitation state
  const [showInvitationDialog, setShowInvitationDialog] = useState(false)
  const [invitationEmail, setInvitationEmail] = useState('')
  const [invitationPassword, setInvitationPassword] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [invitationResult, setInvitationResult] = useState<{
    success: boolean
    message: string
    loginUrl?: string
  } | null>(null)

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


  useEffect(() => {
    if (clientId) {
      fetchClientProfile()
      // Fetch current user for ApplicationCard
      const fetchCurrentUser = async () => {
        try {
          const userResponse = await fetch('/api/user/check-setup')
          if (userResponse.ok) {
            const userData = await userResponse.json()
            if (userData.isSetup && userData.user) {
              setCurrentUser({
                id: userData.user.id,
                role: userData.user.role || 'advisor',
                firmId: userData.user.firmId || ''
              })
            }
          }
        } catch (error) {
          console.error('Error fetching current user:', error)
        }
      }
      fetchCurrentUser()
    }
  }, [clientId, fetchClientProfile])


  const handleUploadComplete = () => {
    setShowUpload(false)
    // The DocumentList component will automatically refresh when new documents are uploaded
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

  const sendPortalInvitation = async () => {
    if (!client || !invitationEmail.trim() || !invitationPassword.trim()) {
      return
    }

    setIsInviting(true)
    setInvitationResult(null)

    try {
      const response = await fetch('/api/client-auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId: client.id,
          email: invitationEmail.trim(),
          password: invitationPassword.trim(),
          sendEmail: false,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        setInvitationResult({
          success: true,
          message: 'Portal invitation sent successfully!',
          loginUrl: `${window.location.origin}/client/login`,
        })
        // Reset form
        setInvitationEmail('')
        setInvitationPassword('')
      } else {
        setInvitationResult({
          success: false,
          message: data.error || 'Failed to send invitation',
        })
      }
    } catch {
      setInvitationResult({
        success: false,
        message: 'An error occurred while sending invitation',
      })
    } finally {
      setIsInviting(false)
    }
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
          
          <Dialog open={showInvitationDialog} onOpenChange={setShowInvitationDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Key className="h-4 w-4 mr-2" />
                Send Portal Invitation
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Send Client Portal Invitation</DialogTitle>
                <DialogDescription>
                  Create login credentials for {client.firstName} {client.lastName} to access the client portal.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {invitationResult && (
                  <Alert variant={invitationResult.success ? "default" : "destructive"}>
                    <AlertDescription>
                      {invitationResult.message}
                      {invitationResult.success && invitationResult.loginUrl && (
                        <div className="mt-2">
                          <p className="font-medium">Client can login at:</p>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {invitationResult.loginUrl}
                          </code>
                          <div className="mt-2 text-sm">
                            <p><strong>Email:</strong> {invitationEmail}</p>
                            <p><strong>Password:</strong> {invitationPassword}</p>
                            <p className="text-amber-600 mt-1">⚠️ Please share these credentials securely with your client</p>
                          </div>
                        </div>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="invitation-email">Client Email</Label>
                  <Input
                    id="invitation-email"
                    type="email"
                    value={invitationEmail}
                    onChange={(e) => setInvitationEmail(e.target.value)}
                    placeholder={client.email || "Enter client's email"}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="invitation-password">Temporary Password</Label>
                  <Input
                    id="invitation-password"
                    type="password"
                    value={invitationPassword}
                    onChange={(e) => setInvitationPassword(e.target.value)}
                    placeholder="Create a temporary password"
                  />
                  <p className="text-xs text-gray-500">
                    Client should change this password after first login
                  </p>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowInvitationDialog(false)
                      setInvitationResult(null)
                      setInvitationEmail('')
                      setInvitationPassword('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={sendPortalInvitation}
                    disabled={!invitationEmail.trim() || !invitationPassword.trim() || isInviting}
                  >
                    {isInviting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
            <div className="space-y-4">
              {client.applications.map((app) => (
                <ApplicationCard
                  key={app.id}
                  application={{
                    id: app.id,
                    applicationNumber: app.applicationNumber,
                    status: app.status,
                    priority: app.priority,
                    investmentAmount: app.investmentAmount,
                    investmentType: app.investmentType,
                    submittedAt: app.submittedAt,
                    decisionExpectedAt: app.decisionExpectedAt,
                    decidedAt: app.decidedAt,
                    notes: app.notes,
                    internalNotes: app.internalNotes,
                    createdAt: app.submittedAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    client: {
                      id: client.id,
                      firstName: client.firstName,
                      lastName: client.lastName,
                      email: client.email || ''
                    },
                    program: app.program ? {
                      id: app.program.id,
                      countryName: app.program.countryName,
                      programName: app.program.programName,
                      programType: app.program.programType,
                      minInvestment: app.program.minInvestment,
                      processingTimeMonths: app.program.processingTimeMonths
                    } : null
                  }}
                  currentUser={currentUser}
                  hideClientInfo={true}
                  onStatusChange={(applicationId, newStatus) => {
                    if (newStatus === 'deleted') {
                      // Refresh client profile to remove deleted application
                      fetchClientProfile()
                    } else {
                      // Update the application status in local state
                      setClient(prev => {
                        if (!prev) return prev
                        return {
                          ...prev,
                          applications: prev.applications?.map(a => 
                            a.id === applicationId ? { ...a, status: newStatus } : a
                          )
                        }
                      })
                    }
                  }}
                />
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
            <div className="mb-6">
              <DocumentUpload
                clientId={clientId}
                onUploadComplete={handleUploadComplete}
                allowMultiple={true}
                showApplicationSelection={true}
              />
            </div>
          )}
          
          {/* Documents List */}
          <DocumentList 
            clientId={clientId}
            showFilters={false}
            showActions={true}
          />
        </TabsContent>

        {/* Communications Tab */}
        <TabsContent value="communications" className="mt-6">
          <CommunicationHub 
            clientId={clientId} 
            showClientFilter={false}
          />
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