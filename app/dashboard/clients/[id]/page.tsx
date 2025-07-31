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
  alternativePhone: string | null
  preferredContactMethod: string | null
  dateOfBirth: string | null
  currentCitizenships: string[] | null
  currentResidency: string | null
  passportNumber: string | null
  passportExpiryDate: string | null
  passportIssuingCountry: string | null
  employmentStatus: string | null
  currentProfession: string | null
  industry: string | null
  primaryGoals: string[] | null
  desiredTimeline: string | null
  urgencyLevel: string | null
  budgetRange: string | null
  sourceOfFundsReadiness: string | null
  programQualificationScore: number | null
  status: string
  notes: string | null
  tags: string[] | null
  lastContactDate: string | null
  nextFollowUpDate: string | null
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
      const profileResponse = await fetch(`/api/clients/${clientId}/profile`)
      
      if (!profileResponse.ok) {
        throw new Error('Failed to fetch client profile')
      }
      
      const data = await profileResponse.json()
      setClient(data.client)
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
            <h1 className="text-2xl font-bold tracking-tight">
              {client.firstName} {client.lastName}
            </h1>
            <div className="flex items-center space-x-2 mt-2">
              <Badge className={getStatusColor(client.status)}>
                {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
              </Badge>
              {client.currentCitizenships && client.currentCitizenships.length > 0 && (
                <Badge variant="outline">
                  {client.currentCitizenships.join(', ')}
                </Badge>
              )}
              {client.urgencyLevel && (
                <Badge className={getPriorityColor(client.urgencyLevel)}>
                  {client.urgencyLevel.charAt(0).toUpperCase() + client.urgencyLevel.slice(1)} Priority
                </Badge>
              )}
              <span className="text-sm text-muted-foreground">
                Client since {formatDate(client.createdAt)}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${params.id}/edit`)}>
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
          <TabsTrigger value="tasks">Client Strategy</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{client.programQualificationScore || 0}/100</div>
                <div className="text-sm text-muted-foreground">Qualification Score</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{client.applicationCount || 0}</div>
                <div className="text-sm text-muted-foreground">Applications</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{client.familyMembers?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Family Members</div>
              </CardContent>
            </Card>
            <Card className="border border-gray-200">
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{client.urgencyLevel?.charAt(0).toUpperCase() + client.urgencyLevel?.slice(1) || 'Low'}</div>
                <div className="text-sm text-muted-foreground">Priority Level</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Client Qualification Summary */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Qualification Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.programQualificationScore !== null && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Overall Score</span>
                      <span className="text-lg font-semibold">{client.programQualificationScore}/100</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          client.programQualificationScore >= 80 ? 'bg-green-500' :
                          client.programQualificationScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${client.programQualificationScore}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Citizenship Status</span>
                    <Badge variant="outline">{client.currentCitizenships?.join(', ') || 'Not specified'}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Financial Readiness</span>
                    <Badge variant={client.budgetRange ? 'default' : 'outline'}>
                      {client.budgetRange?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Source of Funds</span>
                    <Badge variant={client.sourceOfFundsReadiness ? 'default' : 'outline'}>
                      {client.sourceOfFundsReadiness?.replace('_', ' ') || 'Not specified'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Immigration Goals & Timeline */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Immigration Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Primary Goals</label>
                  <div className="mt-1">
                    {client.primaryGoals && client.primaryGoals.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.primaryGoals.map((goal) => (
                          <Badge key={goal} variant="secondary" className="text-xs">
                            {goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not specified</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Desired Timeline</label>
                  <div className="text-sm mt-1 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {client.desiredTimeline?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Not specified'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Geographic Preferences</label>
                  <div className="mt-1">
                    {client.geographicPreferences && client.geographicPreferences.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {client.geographicPreferences.map((pref) => (
                          <Badge key={pref} variant="outline" className="text-xs">
                            {pref}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">No preferences specified</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Urgency Level</label>
                  <div className="text-sm mt-1">
                    <Badge className={getPriorityColor(client.urgencyLevel || 'low')}>
                      {client.urgencyLevel?.charAt(0).toUpperCase() + client.urgencyLevel?.slice(1) || 'Low'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Family Profile */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Family Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {client.familyMembers && client.familyMembers.length > 0 ? (
                  <div className="space-y-3">
                    {client.familyMembers.map((member, index) => (
                      <div key={member.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{member.firstName} {member.lastName}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {member.relationship} • {member.dateOfBirth ? formatDate(member.dateOfBirth) : 'Age not specified'}
                          </div>
                        </div>
                        <Badge variant={member.includeInApplication ? 'default' : 'outline'}>
                          {member.includeInApplication ? 'Included' : 'Not included'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No family members registered</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contact & Professional Summary */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Contact & Professional
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Primary Contact</label>
                  <div className="mt-1 space-y-1">
                    {client.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        {formatPhone(client.phone)}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MessageSquare className="h-3 w-3" />
                      Prefers {client.preferredContactMethod || 'email'}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Professional</label>
                  <div className="mt-1">
                    <div className="text-sm">{client.currentProfession || 'Not specified'}</div>
                    {client.industry && (
                      <div className="text-xs text-muted-foreground">{client.industry}</div>
                    )}
                    {client.employmentStatus && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        {client.employmentStatus.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Badge>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <div className="mt-1">
                    <div className="text-sm">{client.currentResidency || 'Not specified'}</div>
                    {client.placeOfBirth && client.placeOfBirth !== client.currentResidency && (
                      <div className="text-xs text-muted-foreground">Born in {client.placeOfBirth}</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timeline & Follow-up */}
          {(client.lastContactDate || client.nextFollowUpDate) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Timeline & Follow-up
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.lastContactDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Last Contact</label>
                    <div className="text-sm mt-1">
                      {formatDate(client.lastContactDate)}
                    </div>
                  </div>
                )}
                {client.nextFollowUpDate && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Next Follow-up</label>
                    <div className="text-sm mt-1">
                      {formatDate(client.nextFollowUpDate)}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

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
              {client.applications.map((app) => {
                console.log('=== CLIENT PROFILE DEBUG ===')
                console.log('App ID:', app.id)
                console.log('App Status:', app.status)
                console.log('App assignedAdvisorId:', app.assignedAdvisorId)
                console.log('Current User:', currentUser)
                console.log('User ID matches assigned advisor:', currentUser?.id === app.assignedAdvisorId)
                console.log('User is admin:', currentUser?.role === 'admin')
                console.log('Is Sample App:', app.id.startsWith('sample-'))
                console.log('==========================')
                
                return (
                <ApplicationCard
                  key={app.id}
                  application={{
                    id: app.id,
                    applicationNumber: app.applicationNumber,
                    status: app.status,
                    priority: app.priority,
                    assignedAdvisorId: app.assignedAdvisorId,
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
                  onEditApplication={(applicationId) => {
                    console.log('Edit application clicked:', applicationId)
                    // TODO: Add edit functionality
                  }}
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
                )
              })}
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


        {/* Communications Tab */}
        <TabsContent value="communications" className="mt-6">
          <CommunicationHub 
            clientId={clientId} 
            showClientFilter={false}
          />
        </TabsContent>

        {/* Client Strategy Tab */}
        <TabsContent value="tasks" className="mt-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold">Client Strategy</h2>
              <p className="text-sm text-muted-foreground">Immigration planning and strategic client management</p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Strategic Note
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Program Exploration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Program Exploration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Preferred Programs</label>
                  <div className="mt-1">
                    {client.preferredPrograms && client.preferredPrograms.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {client.preferredPrograms.map((program) => (
                          <Badge key={program} variant="secondary" className="text-xs">
                            {program}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No programs researched yet</div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Research Status</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Initial Consultation</span>
                      <Badge variant="default">Completed</Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Program Recommendations</span>
                      <Badge variant={client.preferredPrograms?.length ? 'default' : 'outline'}>
                        {client.preferredPrograms?.length ? 'Provided' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Financial Planning</span>
                      <Badge variant={client.budgetRange ? 'default' : 'outline'}>
                        {client.budgetRange ? 'Assessed' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Readiness Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Readiness Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Documentation Status</label>
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Passport Valid</span>
                      <Badge variant={client.passportNumber ? 'default' : 'outline'}>
                        {client.passportNumber ? 'Yes' : 'Unknown'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Professional Documents</span>
                      <Badge variant={client.currentProfession ? 'default' : 'outline'}>
                        {client.currentProfession ? 'Available' : 'Pending'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm">Financial Documents</span>
                      <Badge variant={client.sourceOfFundsReadiness === 'ready' ? 'default' : 'outline'}>
                        {client.sourceOfFundsReadiness === 'ready' ? 'Ready' : 'In Progress'}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Family Coordination</label>
                  <div className="mt-1">
                    {client.familyMembers && client.familyMembers.length > 0 ? (
                      <div className="text-sm">
                        {client.familyMembers.length} family member(s) involved
                        <div className="text-xs text-muted-foreground mt-1">
                          {client.familyMembers.filter(m => m.includeInApplication).length} to be included in applications
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Single applicant</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Strategic Timeline */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Strategic Timeline & Next Steps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Immediate (Next 30 days)</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      {!client.preferredPrograms?.length && <li>• Research program options</li>}
                      {!client.budgetRange && <li>• Assess financial capacity</li>}
                      {client.familyMembers?.some(m => !m.includeInApplication) && <li>• Confirm family inclusion</li>}
                      <li>• Schedule follow-up consultation</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-yellow-500" />
                      <span className="font-medium text-sm">Short Term (1-3 months)</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>• Finalize program selection</li>
                      <li>• Begin document collection</li>
                      <li>• Complete due diligence</li>
                      <li>• Prepare investment funds</li>
                    </ul>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Long Term (3+ months)</span>
                    </div>
                    <ul className="text-sm space-y-1">
                      <li>• Submit applications</li>
                      <li>• Monitor processing</li>
                      <li>• Plan relocation timeline</li>
                      <li>• Post-approval services</li>
                    </ul>
                  </div>
                </div>
                {(client.lastContactDate || client.nextFollowUpDate) && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between">
                      <div>
                        {client.lastContactDate && (
                          <span className="text-sm text-muted-foreground">
                            Last contact: {formatDate(client.lastContactDate)}
                          </span>
                        )}
                      </div>
                      <div>
                        {client.nextFollowUpDate && (
                          <span className="text-sm font-medium">
                            Next follow-up: {formatDate(client.nextFollowUpDate)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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