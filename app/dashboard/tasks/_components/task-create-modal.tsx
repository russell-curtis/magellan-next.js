'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Plus, 
  User, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react'
import { TASK_PRIORITIES, TASK_TYPES, type TaskPriority, type TaskType } from '@/db/schema'

interface User {
  id: string
  name: string
  email: string
  role: string
}

interface Client {
  id: string
  firstName: string
  lastName: string
}

interface Application {
  id: string
  applicationNumber: string
  program: {
    countryName: string
    programName: string
  }
}

interface TaskCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onTaskCreated?: () => void
  preselectedClientId?: string
  preselectedApplicationId?: string
}

const TASK_TYPE_CONFIG = {
  document_review: { label: 'Document Review', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  client_communication: { label: 'Client Communication', icon: User, color: 'bg-green-100 text-green-800' },
  application_preparation: { label: 'Application Preparation', icon: CheckCircle2, color: 'bg-orange-100 text-orange-800' },
  compliance_check: { label: 'Compliance Check', icon: AlertCircle, color: 'bg-red-100 text-red-800' },
  due_diligence: { label: 'Due Diligence', icon: AlertCircle, color: 'bg-yellow-100 text-yellow-800' },
  follow_up: { label: 'Follow Up', icon: Clock, color: 'bg-purple-100 text-purple-800' },
  meeting: { label: 'Meeting', icon: Calendar, color: 'bg-indigo-100 text-indigo-800' },
  other: { label: 'Other', icon: FileText, color: 'bg-gray-100 text-gray-800' }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' }
}

export function TaskCreateModal({
  open,
  onOpenChange,
  onTaskCreated,
  preselectedClientId,
  preselectedApplicationId
}: TaskCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingData, setLoadingData] = useState(false)

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    taskType: 'other' as TaskType,
    dueDate: '',
    reminderAt: '',
    assignedToId: '',
    clientId: preselectedClientId || '',
    applicationId: preselectedApplicationId || ''
  })

  const { toast } = useToast()

  const fetchData = useCallback(async () => {
    if (!open) return
    
    setLoadingData(true)
    try {
      const [usersRes, clientsRes, applicationsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/clients'),
        fetch('/api/applications')
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.users || [])
      }

      if (clientsRes.ok) {
        const clientsData = await clientsRes.json()
        setClients(clientsData.clients || [])
      }

      if (applicationsRes.ok) {
        const applicationsData = await applicationsRes.json()
        setApplications(applicationsData.applications || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }, [open])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (preselectedClientId) {
      setFormData(prev => ({ ...prev, clientId: preselectedClientId }))
    }
    if (preselectedApplicationId) {
      setFormData(prev => ({ ...prev, applicationId: preselectedApplicationId }))
    }
  }, [preselectedClientId, preselectedApplicationId])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Task title is required',
        variant: 'destructive'
      })
      return false
    }

    if (formData.dueDate && new Date(formData.dueDate) < new Date()) {
      toast({
        title: 'Validation Error',
        description: 'Due date cannot be in the past',
        variant: 'destructive'
      })
      return false
    }

    if (formData.reminderAt && formData.dueDate && new Date(formData.reminderAt) > new Date(formData.dueDate)) {
      toast({
        title: 'Validation Error',
        description: 'Reminder time cannot be after due date',
        variant: 'destructive'
      })
      return false
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          dueDate: formData.dueDate || null,
          reminderAt: formData.reminderAt || null,
          assignedToId: formData.assignedToId || null,
          clientId: formData.clientId || null,
          applicationId: formData.applicationId || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create task' }))
        throw new Error(errorData.error || 'Failed to create task')
      }

      await response.json()

      toast({
        title: 'Success',
        description: 'Task created successfully'
      })

      // Reset form
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        taskType: 'other',
        dueDate: '',
        reminderAt: '',
        assignedToId: '',
        clientId: preselectedClientId || '',
        applicationId: preselectedApplicationId || ''
      })

      onTaskCreated?.()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating task:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create task',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      priority: 'medium',
      taskType: 'other',
      dueDate: '',
      reminderAt: '',
      assignedToId: '',
      clientId: preselectedClientId || '',
      applicationId: preselectedApplicationId || ''
    })
  }

  const selectedClient = clients.find(c => c.id === formData.clientId)
  const selectedApplication = applications.find(a => a.id === formData.applicationId)
  const selectedTaskType = TASK_TYPE_CONFIG[formData.taskType]
  const selectedPriority = PRIORITY_CONFIG[formData.priority]

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Task
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Task Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title..."
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe the task details..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
              />
            </div>
          </div>

          {/* Task Type and Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="taskType">Task Type</Label>
              <Select value={formData.taskType} onValueChange={(value) => handleInputChange('taskType', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map((type) => {
                    const config = TASK_TYPE_CONFIG[type]
                    const Icon = config.icon
                    return (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {selectedTaskType && (
                <Badge className={selectedTaskType.color} variant="outline">
                  {selectedTaskType.label}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TASK_PRIORITIES.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {PRIORITY_CONFIG[priority].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPriority && (
                <Badge className={selectedPriority.color} variant="outline">
                  {selectedPriority.label}
                </Badge>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="space-y-2">
            <Label htmlFor="assignedToId">Assign To</Label>
            <Select value={formData.assignedToId} onValueChange={(value) => handleInputChange('assignedToId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Unassigned</SelectItem>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4" />
                      <span>{user.name}</span>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                id="dueDate"
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => handleInputChange('dueDate', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderAt">Reminder</Label>
              <Input
                id="reminderAt"
                type="datetime-local"
                value={formData.reminderAt}
                onChange={(e) => handleInputChange('reminderAt', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                max={formData.dueDate}
              />
            </div>
          </div>

          {/* Related Entities */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Related Client</Label>
              <Select 
                value={formData.clientId} 
                onValueChange={(value) => handleInputChange('clientId', value)}
                disabled={!!preselectedClientId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select client (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <p className="text-sm text-muted-foreground">
                  Client: {selectedClient.firstName} {selectedClient.lastName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="applicationId">Related Application</Label>
              <Select 
                value={formData.applicationId} 
                onValueChange={(value) => handleInputChange('applicationId', value)}
                disabled={!!preselectedApplicationId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No application</SelectItem>
                  {applications.map((app) => (
                    <SelectItem key={app.id} value={app.id}>
                      {app.applicationNumber} - {app.program?.countryName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedApplication && (
                <p className="text-sm text-muted-foreground">
                  App: {selectedApplication.applicationNumber}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.title.trim() || loadingData}
          >
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}