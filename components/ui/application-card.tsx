'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  FileText,
  Globe,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Edit,
  MessageSquare,
  Send,
  RotateCcw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  RefreshCw,
  Archive,
  ArchiveRestore,
  Upload,
  ExternalLink
} from 'lucide-react'
import { formatCurrency, formatDate, hasWorkflowAccess } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import Link from 'next/link'
import { useState } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface Application {
  id: string
  applicationNumber: string
  status: string
  priority: string
  investmentAmount: string | null
  investmentType: string | null
  submittedAt: string | null
  decisionExpectedAt: string | null
  decidedAt: string | null
  notes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  assignedAdvisorId?: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  program: {
    id: string
    countryName: string
    programName: string
    programType: string
    minInvestment: string
    processingTimeMonths: number
  } | null
}

interface ApplicationCardProps {
  application: Application
  onStatusChange?: (applicationId: string, newStatus: string) => void
  onEditApplication?: (applicationId: string) => void
  currentUser?: {
    id: string
    role: string
    firmId: string
  }
  hideClientInfo?: boolean
}

export function ApplicationCard({ application, onStatusChange, onEditApplication, currentUser, hideClientInfo = false }: ApplicationCardProps) {
  const { toast } = useToast()
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: string
    newStatus: string
    title: string
    description: string
    requiresNote?: boolean
  } | null>(null)
  const [actionNote, setActionNote] = useState('')
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'submitted_to_government':
        return <ExternalLink className="h-5 w-5 text-purple-600" />
      case 'ready_for_submission':
        return <Upload className="h-5 w-5 text-orange-600" />
      case 'submitted':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'started':
        return <RefreshCw className="h-5 w-5 text-blue-500" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'archived':
        return <Archive className="h-5 w-5 text-gray-500" />
      case 'draft':
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'submitted_to_government':
        return 'bg-purple-100 text-purple-800'
      case 'ready_for_submission':
        return 'bg-orange-100 text-orange-800'
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'started':
        return 'bg-blue-50 text-blue-700'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'archived':
        return 'bg-gray-100 text-gray-600'
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  // Get contextual information based on status
  const getContextualInfo = () => {
    switch (application.status) {
      case 'submitted_to_government':
        return {
          label: 'Submitted to Government',
          value: application.submittedAt ? formatDate(application.submittedAt) : 'Recently',
          icon: <ExternalLink className="h-4 w-4 text-purple-500" />
        }
      case 'ready_for_submission':
        return {
          label: 'Ready for Government Submission',
          value: 'Awaiting submission',
          icon: <Upload className="h-4 w-4 text-orange-500" />
        }
      case 'submitted':
        return {
          label: 'Internal Review Complete',
          value: application.submittedAt ? formatDate(application.submittedAt) : 'Recently',
          icon: <Calendar className="h-4 w-4 text-gray-400" />
        }
      case 'started':
        return {
          label: 'Started',
          value: formatDate(application.updatedAt),
          icon: <RefreshCw className="h-4 w-4 text-blue-500" />
        }
      case 'under_review':
        return {
          label: 'Government Review',
          value: application.decisionExpectedAt ? formatDate(application.decisionExpectedAt) : 'In Progress',
          icon: <Clock className="h-4 w-4 text-gray-400" />
        }
      case 'approved':
        return {
          label: 'Approved',
          value: application.decidedAt ? formatDate(application.decidedAt) : 'Recently',
          icon: <CheckCircle className="h-4 w-4 text-green-500" />
        }
      case 'rejected':
        return {
          label: 'Rejected',
          value: application.decidedAt ? formatDate(application.decidedAt) : 'Recently',
          icon: <XCircle className="h-4 w-4 text-red-500" />
        }
      case 'archived':
        return {
          label: 'Archived',
          value: formatDate(application.updatedAt),
          icon: <Archive className="h-4 w-4 text-gray-500" />
        }
      default:
        return {
          label: 'Created',
          value: formatDate(application.createdAt),
          icon: <Calendar className="h-4 w-4 text-gray-400" />
        }
    }
  }

  const contextualInfo = getContextualInfo()

  // Status transition functions
  const getValidStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, string[]> = {
      'draft': ['started'],
      'started': ['submitted', 'draft'],
      'submitted': ['ready_for_submission', 'started'],
      'ready_for_submission': ['submitted_to_government', 'submitted'],
      'submitted_to_government': ['under_review', 'ready_for_submission'],
      'under_review': ['approved', 'rejected', 'submitted_to_government'],
      'approved': [],
      'rejected': ['started'],
      'archived': []
    }
    return transitions[currentStatus] || []
  }

  const getStatusActions = (currentStatus: string) => {
    const actions = []
    const validTransitions = getValidStatusTransitions(currentStatus)
    
    // Permission checks - only show actions if user has permission
    const canEdit = currentUser && (
      currentUser.role === 'admin' || 
      application.assignedAdvisorId === currentUser.id
    )
    
    if (!canEdit) {
      return [] // No actions if user doesn't have permission
    }

    if (validTransitions.includes('started')) {
      actions.push({
        action: 'start',
        newStatus: 'started',
        label: 'Start Application',
        icon: <RefreshCw className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Start Application',
        description: 'This will begin work on the application and make it visible to the client. Are you sure you want to continue?',
        requiresNote: false
      })
    }

    if (validTransitions.includes('submitted')) {
      actions.push({
        action: 'submit',
        newStatus: 'submitted',
        label: 'Complete Internal Review',
        icon: <Send className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Complete Internal Review',
        description: 'This will mark the internal review as complete and prepare the application for government submission. Are you sure you want to continue?',
        requiresNote: false
      })
    }

    if (validTransitions.includes('ready_for_submission')) {
      actions.push({
        action: 'prepare_submission',
        newStatus: 'ready_for_submission',
        label: 'Prepare for Government Submission',
        icon: <Upload className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Prepare for Government Submission',
        description: 'This will compile all documents and prepare the application package for government submission. Are you sure you want to continue?',
        requiresNote: false
      })
    }

    if (validTransitions.includes('submitted_to_government')) {
      actions.push({
        action: 'submit_to_government',
        newStatus: 'submitted_to_government',
        label: 'Submit to Government',
        icon: <ExternalLink className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Submit to Government',
        description: 'This will submit the complete application package to the government portal for official processing. This action cannot be undone. Are you sure you want to continue?',
        requiresNote: false
      })
    }

    if (validTransitions.includes('under_review')) {
      actions.push({
        action: 'review',
        newStatus: 'under_review',
        label: 'Mark Under Review',
        icon: <Eye className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Mark Under Review',
        description: 'This will mark the application as under review.',
        requiresNote: false
      })
    }

    // Admin-only actions: approve and reject
    if (validTransitions.includes('approved') && currentUser?.role === 'admin') {
      actions.push({
        action: 'approve',
        newStatus: 'approved',
        label: 'Approve Application',
        icon: <ThumbsUp className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Approve Application',
        description: 'This will approve the application. This action cannot be undone.',
        requiresNote: true
      })
    }

    if (validTransitions.includes('rejected') && currentUser?.role === 'admin') {
      actions.push({
        action: 'reject',
        newStatus: 'rejected',
        label: 'Reject Application',
        icon: <ThumbsDown className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Reject Application',
        description: 'This will reject the application. Please provide a reason.',
        requiresNote: true
      })
    }

    if (validTransitions.includes('draft') && currentStatus !== 'draft') {
      actions.push({
        action: 'return_draft',
        newStatus: 'draft',
        label: 'Return to Draft',
        icon: <RotateCcw className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Return to Draft',
        description: 'This will return the application to draft status and hide it from the client.',
        requiresNote: true
      })
    }

    // Archive action for non-draft, non-archived applications - admin or assigned advisor
    if (currentStatus !== 'draft' && currentStatus !== 'archived' && (
      currentUser?.role === 'admin' || 
      application.assignedAdvisorId === currentUser?.id
    )) {
      actions.push({
        action: 'archive',
        newStatus: 'archived',
        label: 'Archive Application',
        icon: <Archive className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Archive Application',
        description: 'This will archive the application, hiding it from active workflows but preserving all records and documents. This action can be reversed.',
        requiresNote: false
      })
    }

    // Unarchive action for archived applications
    if (currentStatus === 'archived' && (
      currentUser?.role === 'admin' || 
      application.assignedAdvisorId === currentUser?.id
    )) {
      actions.push({
        action: 'unarchive',
        newStatus: 'started', // Return to started status when unarchiving
        label: 'Unarchive Application',
        icon: <ArchiveRestore className="mr-2 h-4 w-4" />,
        requiresConfirmation: true,
        title: 'Unarchive Application',
        description: 'This will restore the application to active status and make it visible in workflows again.',
        requiresNote: false
      })
    }

    // Delete action for draft and started status - admin only or assigned advisor
    if ((currentStatus === 'draft' || currentStatus === 'started') && (
      currentUser?.role === 'admin' || 
      application.assignedAdvisorId === currentUser?.id
    )) {
      actions.push({
        action: 'delete',
        newStatus: 'deleted',
        label: 'Delete Application',
        icon: <Trash2 className="mr-2 h-4 w-4 text-red-500" />,
        requiresConfirmation: true,
        title: 'Delete Application',
        description: 'This will permanently delete the application and all associated documents. This action cannot be undone and will remove the application from both agent and client platforms.',
        requiresNote: false,
        destructive: true
      })
    }

    return actions
  }

  const handleStatusAction = (action: {
    action: string
    newStatus: string
    title: string
    description: string
    requiresNote?: boolean
    destructive?: boolean
  }) => {
    setPendingAction(action)
    setActionNote('')
    setIsConfirmDialogOpen(true)
  }

  const executeStatusChange = async () => {
    if (!pendingAction) return

    setIsLoading(true)
    try {
      if (pendingAction.action === 'delete') {
        // Handle delete with dedicated API endpoint
        console.log('=== FRONTEND DELETE REQUEST ===')
        console.log('Application ID:', application.id)
        console.log('URL:', `/api/applications/${application.id}/delete`)
        
        const response = await fetch(`/api/applications/${application.id}/delete`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        })
        
        console.log('Delete response status:', response.status)
        console.log('Delete response headers:', Object.fromEntries(response.headers.entries()))

        if (!response.ok) {
          console.error('Delete API response not OK:', response.status, response.statusText)
          let errorData
          try {
            errorData = await response.json()
            console.error('Delete API error data:', errorData)
          } catch (parseError) {
            console.error('Could not parse error response:', parseError)
            const textData = await response.text()
            console.error('Raw error response:', textData)
            throw new Error(`Delete failed with status ${response.status}: ${textData}`)
          }
          throw new Error(errorData.error || errorData.details || 'Failed to delete application')
        }

        const result = await response.json()
        
        toast({
          title: 'Application Deleted',
          description: `${result.deletionInfo?.applicationNumber || 'Application'} has been permanently deleted`,
          variant: 'default'
        })

        // Remove from UI immediately and notify parent
        if (onStatusChange) {
          onStatusChange(application.id, 'deleted')
        }

        // Force page refresh to ensure clean state
        setTimeout(() => {
          window.location.reload()
        }, 1500)
        
        return
      }

      if (pendingAction.action === 'archive' || pendingAction.action === 'unarchive') {
        // Handle archive/unarchive with dedicated API endpoint
        const response = await fetch(`/api/applications/${application.id}/archive`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            archived: pendingAction.action === 'archive',
            notes: actionNote || undefined
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `Failed to ${pendingAction.action} application`)
        }

        const result = await response.json()
        
        toast({
          title: pendingAction.action === 'archive' ? 'Application Archived' : 'Application Unarchived',
          description: result.message || `Application has been ${pendingAction.action === 'archive' ? 'archived' : 'unarchived'}`,
          variant: 'default'
        })

        // Update status and notify parent
        if (onStatusChange) {
          onStatusChange(application.id, pendingAction.newStatus)
        }

        return
      }

      // Handle government submission actions
      if (pendingAction.action === 'prepare_submission') {
        const response = await fetch(`/api/applications/${application.id}/government-submission`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'prepare'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to prepare application for submission')
        }

        const result = await response.json()
        
        toast({
          title: 'Application Prepared',
          description: result.message || 'Application package prepared for government submission',
          variant: 'default'
        })

        // Update status and notify parent
        if (onStatusChange) {
          onStatusChange(application.id, pendingAction.newStatus)
        }

        return
      }

      if (pendingAction.action === 'submit_to_government') {
        const response = await fetch(`/api/applications/${application.id}/government-submission`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'submit'
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to submit application to government')
        }

        const result = await response.json()
        
        toast({
          title: 'Submitted to Government',
          description: `Application submitted successfully. Reference: ${result.governmentReferenceNumber}`,
          variant: 'default'
        })

        // Update status and notify parent
        if (onStatusChange) {
          onStatusChange(application.id, pendingAction.newStatus)
        }

        return
      }

      const response = await fetch(`/api/applications/${application.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: pendingAction.newStatus,
          notes: actionNote || undefined,
          triggerWorkflow: true
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update status')
      }

      await response.json()
      
      toast({
        title: 'Status Updated',
        description: `Application status changed to ${pendingAction.newStatus}`,
        variant: 'default'
      })

      // Call the optional callback to refresh data
      if (onStatusChange) {
        onStatusChange(application.id, pendingAction.newStatus)
      }

      // Force a page refresh to show updated data
      window.location.reload()
      
    } catch (error) {
      console.error('Error updating status:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update application status',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
      setIsConfirmDialogOpen(false)
      setPendingAction(null)
      setActionNote('')
    }
  }

  const statusActions = getStatusActions(application.status)
  
  // Debug logging
  console.log('ApplicationCard Debug:', {
    applicationId: application.id,
    applicationNumber: application.applicationNumber,
    currentStatus: application.status,
    assignedAdvisorId: application.assignedAdvisorId,
    currentUser: currentUser,
    currentUserId: currentUser?.id,
    canEdit: currentUser && (
      currentUser.role === 'admin' || 
      application.assignedAdvisorId === currentUser.id
    ),
    statusActionsCount: statusActions.length,
    statusActions: statusActions.map(a => a.label),
    validTransitions: getValidStatusTransitions(application.status)
  })

  // Calculate progress based on status (similar to client view)
  const calculateProgress = () => {
    const statusProgress: Record<string, { progress: number; stage: string; description: string }> = {
      'draft': { progress: 5, stage: 'Initial Setup', description: 'Application created, ready to begin' },
      'started': { progress: 20, stage: 'In Progress', description: 'Gathering documents and information' },
      'submitted': { progress: 40, stage: 'Internal Review', description: 'Under review by advisory team' },
      'ready_for_submission': { progress: 70, stage: 'Government Prep', description: 'Prepared for government submission' },
      'submitted_to_government': { progress: 85, stage: 'Gov Review', description: 'Submitted to government portal' },
      'under_review': { progress: 90, stage: 'Gov Processing', description: 'Under government review' },
      'approved': { progress: 100, stage: 'Approved', description: 'Application successfully approved' },
      'rejected': { progress: 100, stage: 'Rejected', description: 'Application was rejected' },
      'archived': { progress: 0, stage: 'Archived', description: 'Application archived' }
    }
    return statusProgress[application.status] || statusProgress['draft']
  }

  const progressData = calculateProgress()
  const getNextStep = () => {
    switch (application.status) {
      case 'draft': return 'Begin application process'
      case 'started': return 'Complete document collection'
      case 'submitted': return 'Internal review completion'
      case 'ready_for_submission': return 'Submit to government'
      case 'submitted_to_government': return 'Await government review'
      case 'under_review': return 'Decision pending'
      case 'approved': return 'Process complete'
      case 'rejected': return 'Review rejection reasons'
      default: return 'Next steps pending'
    }
  }

  return (
    <>
    <Card className="border border-gray-200 hover:bg-gray-50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {getStatusIcon(application.status)}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {application.program?.programName || 'Unknown Program'}
              </h3>
              <div className="text-sm text-gray-600 space-y-1">
                <p>Application #{application.applicationNumber}</p>
                <div className="flex items-center space-x-4">
                  {!hideClientInfo && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-4 w-4">
                        <AvatarFallback>
                          <AvatarInitials 
                            name={application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown'} 
                          />
                        </AvatarFallback>
                      </Avatar>
                      <span>{application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown Client'}</span>
                    </div>
                  )}
                  <p>
                    Created {formatDate(application.createdAt)}
                    {application.submittedAt && (
                      <span> • Submitted {formatDate(application.submittedAt)}</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="text-right space-y-2">
            <div className="flex items-center space-x-2">
              <Badge className={getStatusColor(application.status)}>
                {formatStatus(application.status)}
              </Badge>
              {application.priority !== 'medium' && (
                <Badge variant="outline" className={getPriorityColor(application.priority)}>
                  {formatPriority(application.priority)}
                </Badge>
              )}
            </div>
            {application.program && (
              <div className="text-xs text-gray-500">
                {application.program.countryName} • {application.program.programType}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Section - Only show for non-draft applications */}
        {application.status !== 'draft' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-blue-900">Application Progress</h4>
                <p className="text-xs text-blue-700">{progressData.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-blue-900">{progressData.progress}%</div>
                <div className="text-xs text-blue-700">Complete</div>
              </div>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progressData.progress === 100 
                    ? (application.status === 'approved' ? 'bg-green-500' : 'bg-red-500')
                    : 'bg-blue-600'
                }`}
                style={{ width: `${progressData.progress}%` }}
              ></div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-blue-700">Current: {progressData.stage}</span>
              <span className="text-xs text-blue-700">Next: {getNextStep()}</span>
            </div>
          </div>
        )}

        {/* Application Details Section */}
        <div>
          <h4 className="text-sm font-semibold text-gray-900 mb-3">Application Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Investment Amount</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {application.investmentAmount ? 
                  formatCurrency(parseFloat(application.investmentAmount)) : 
                  'Not specified'
                }
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">{contextualInfo.label}</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{contextualInfo.value}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Program</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {application.program?.countryName || 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        {/* Assigned Advisor - Only show if different from current user */}
        {application.assignedAdvisorId && application.assignedAdvisorId !== currentUser?.id && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-700 mb-1">Assigned Advisor</p>
            <p className="text-sm text-gray-900">
              {/* We'll need to fetch advisor name - for now show ID */}
              Advisor ID: {application.assignedAdvisorId}
            </p>
          </div>
        )}

        {/* Notes */}
        {(application.notes || application.internalNotes) && (
          <div className="space-y-3">
            {application.notes && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Client Notes</p>
                <p className="text-sm text-gray-900">{application.notes}</p>
              </div>
            )}
            {application.internalNotes && (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">Internal Notes</p>
                <p className="text-sm text-gray-900">{application.internalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center space-x-3">
            {/* Primary action - Open Application */}
            {hasWorkflowAccess(application.status) && (
              <Link href={`/dashboard/applications/${application.id}/workflow`}>
                <Button className="bg-[#3E58DA] text-white hover:bg-[#3E58DA]/90">
                  <Eye className="mr-2 h-4 w-4" />
                  Open Application
                </Button>
              </Link>
            )}

            {/* Edit button for draft applications */}
            {application.status === 'draft' && currentUser && (
              currentUser.role === 'admin' || 
              application.assignedAdvisorId === currentUser.id
            ) && onEditApplication && (
              <Button variant="outline" onClick={() => onEditApplication(application.id)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Application
              </Button>
            )}
          </div>

          {/* Secondary actions dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Status transition actions */}
              {statusActions.length > 0 && currentUser && (
                <>
                  {statusActions.map((action) => (
                    <DropdownMenuItem
                      key={action.action}
                      onClick={() => handleStatusAction(action)}
                      className={action.destructive ? 'text-red-600 focus:text-red-600' : ''}
                    >
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              
              <DropdownMenuItem>
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Client
              </DropdownMenuItem>
              
              {!currentUser && (
                <DropdownMenuItem disabled>
                  <span className="text-xs text-gray-500">Debug: No user data</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>

    {/* Confirmation Dialog */}
    <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{pendingAction?.title}</DialogTitle>
          <DialogDescription>
            {pendingAction?.description}
          </DialogDescription>
        </DialogHeader>
        
        {pendingAction?.requiresNote && (
          <div className="space-y-2">
            <Label htmlFor="action-note">
              {pendingAction.action === 'reject' ? 'Reason for rejection' : 
               pendingAction.action === 'approve' ? 'Approval notes' : 'Notes'}
              {pendingAction.action === 'reject' && <span className="text-red-500"> *</span>}
            </Label>
            <Textarea
              id="action-note"
              placeholder={pendingAction.action === 'reject' 
                ? 'Please provide a reason for rejection...' 
                : 'Add any relevant notes...'}
              value={actionNote}
              onChange={(e) => setActionNote(e.target.value)}
              rows={3}
            />
          </div>
        )}
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsConfirmDialogOpen(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={executeStatusChange}
            disabled={isLoading || (pendingAction?.requiresNote && pendingAction.action === 'reject' && !actionNote.trim())}
            variant={pendingAction?.destructive ? 'destructive' : 'default'}
          >
            {isLoading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            {pendingAction?.action === 'delete' ? 'Delete' :
             pendingAction?.action === 'reject' ? 'Reject' :
             pendingAction?.action === 'approve' ? 'Approve' :
             'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </>
  )
}