'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  FileText,
  ArrowRight 
} from 'lucide-react'

interface Application {
  id: string
  applicationNumber: string
  status: string
  priority: string
  submittedAt?: string
  decisionExpectedAt?: string
  decidedAt?: string
  notes?: string
  internalNotes?: string
  program: {
    countryName: string
    programName: string
  }
  client: {
    firstName: string
    lastName: string
  }
}

interface ApplicationStatusWorkflowProps {
  application: Application
  onStatusUpdate?: () => void
}

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    icon: FileText,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Application is being prepared',
    allowedTransitions: ['submitted']
  },
  submitted: {
    label: 'Submitted',
    icon: Clock,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Application has been submitted for review',
    allowedTransitions: ['under_review', 'draft']
  },
  under_review: {
    label: 'Under Review',
    icon: AlertCircle,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Application is being reviewed by authorities',
    allowedTransitions: ['approved', 'rejected', 'submitted']
  },
  approved: {
    label: 'Approved',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Application has been approved',
    allowedTransitions: []
  },
  rejected: {
    label: 'Rejected',
    icon: XCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Application has been rejected',
    allowedTransitions: ['draft']
  }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' }
}

export function ApplicationStatusWorkflow({ 
  application, 
  onStatusUpdate 
}: ApplicationStatusWorkflowProps) {
  const [updating, setUpdating] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [newPriority, setPriority] = useState('')
  const [statusNotes, setStatusNotes] = useState('')
  const [showUpdateForm, setShowUpdateForm] = useState(false)

  const { toast } = useToast()

  const currentStatusConfig = STATUS_CONFIG[application.status as keyof typeof STATUS_CONFIG]
  const currentPriorityConfig = PRIORITY_CONFIG[application.priority as keyof typeof PRIORITY_CONFIG]

  const handleStatusUpdate = async () => {
    if (!newStatus && !newPriority && !statusNotes.trim()) {
      toast({
        title: 'Update Required',
        description: 'Please select a new status, priority, or add notes',
        variant: 'destructive'
      })
      return
    }

    setUpdating(true)
    try {
      const updateData: Record<string, unknown> = {}
      
      if (newStatus) updateData.status = newStatus
      if (newPriority) updateData.priority = newPriority
      if (statusNotes.trim()) updateData.internalNotes = statusNotes

      // Check if this is a sample application (starts with 'sample-')
      if (application.id.startsWith('sample-')) {
        // For sample applications, just show success without API call
        toast({
          title: 'Demo Mode',
          description: 'This is sample data. Create a real application to enable status updates.',
          variant: 'default'
        })
        
        setNewStatus('')
        setPriority('')
        setStatusNotes('')
        setShowUpdateForm(false)
        return
      }

      const response = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update application' }))
        throw new Error(errorData.error || 'Failed to update application')
      }

      toast({
        title: 'Success',
        description: 'Application status updated successfully'
      })

      setNewStatus('')
      setPriority('')
      setStatusNotes('')
      setShowUpdateForm(false)
      onStatusUpdate?.()

    } catch (error) {
      console.error('Error updating application status:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update application status',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not set'
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

  const StatusIcon = currentStatusConfig?.icon || FileText

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Application Status & Workflow</span>
          {!showUpdateForm && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowUpdateForm(true)}
            >
              Update Status
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status Display */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="flex items-center space-x-3">
            <StatusIcon className="h-6 w-6 text-muted-foreground" />
            <div>
              <div className="flex items-center space-x-2">
                <Badge className={currentStatusConfig?.color}>
                  {currentStatusConfig?.label || application.status}
                </Badge>
                <Badge className={currentPriorityConfig?.color}>
                  {currentPriorityConfig?.label || application.priority} Priority
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentStatusConfig?.description || 'Status description not available'}
              </p>
            </div>
          </div>
          <div className="text-right text-sm text-muted-foreground">
            <div>App #: {application.applicationNumber}</div>
            {application.submittedAt && (
              <div>Submitted: {formatDate(application.submittedAt)}</div>
            )}
          </div>
        </div>

        {/* Timeline Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="font-medium text-muted-foreground">Submitted</label>
            <div>{formatDate(application.submittedAt)}</div>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Decision Expected</label>
            <div>{formatDate(application.decisionExpectedAt)}</div>
          </div>
          <div>
            <label className="font-medium text-muted-foreground">Decision Made</label>
            <div>{formatDate(application.decidedAt)}</div>
          </div>
        </div>

        {/* Status Update Form */}
        {showUpdateForm && (
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Update Application Status</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowUpdateForm(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="newStatus">New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select new status" />
                  </SelectTrigger>
                  <SelectContent>
                    {currentStatusConfig?.allowedTransitions.map((status) => {
                      const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]
                      return (
                        <SelectItem key={status} value={status}>
                          <div className="flex items-center space-x-2">
                            <config.icon className="h-4 w-4" />
                            <span>{config.label}</span>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPriority">Priority</Label>
                <Select value={newPriority} onValueChange={setPriority}>
                  <SelectTrigger>
                    <SelectValue placeholder="Update priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusNotes">Internal Notes</Label>
              <Textarea
                id="statusNotes"
                placeholder="Add notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleStatusUpdate}
              disabled={updating}
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Application'}
            </Button>
          </div>
        )}

        {/* Notes Display */}
        {(application.notes || application.internalNotes) && (
          <div className="space-y-3">
            {application.notes && (
              <div>
                <label className="font-medium text-muted-foreground text-sm">Client Notes</label>
                <p className="text-sm text-gray-700 mt-1 p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                  {application.notes}
                </p>
              </div>
            )}
            {application.internalNotes && (
              <div>
                <label className="font-medium text-muted-foreground text-sm">Internal Notes</label>
                <p className="text-sm text-gray-700 mt-1 p-2 bg-yellow-50 rounded border-l-4 border-yellow-200">
                  {application.internalNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}