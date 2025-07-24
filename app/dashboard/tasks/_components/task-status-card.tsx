'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  PauseCircle,
  User,
  Calendar,
  FileText,
  Edit3,
  MoreVertical
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
// Types are available but not used directly in component

interface Task {
  id: string
  title: string
  description?: string | null
  priority: string
  status: string
  dueDate: string
  taskType?: string | null
  createdAt: string
  client?: {
    id: string
    name: string
  } | null
  assignedTo?: {
    id: string
    name: string
    email: string
  } | null
  application?: {
    id: string
    programName: string
  } | null
}

interface TaskStatusCardProps {
  task: Task
  onTaskUpdate?: () => void
  onTaskEdit?: (task: Task) => void
  onTaskDelete?: (taskId: string) => void
}

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    description: 'Task is waiting to be started'
  },
  in_progress: {
    label: 'In Progress',
    icon: AlertCircle,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    description: 'Task is currently being worked on'
  },
  completed: {
    label: 'Completed',
    icon: CheckCircle,
    color: 'bg-green-100 text-green-800 border-green-200',
    description: 'Task has been completed successfully'
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    description: 'Task has been cancelled'
  },
  blocked: {
    label: 'Blocked',
    icon: PauseCircle,
    color: 'bg-red-100 text-red-800 border-red-200',
    description: 'Task is blocked and cannot proceed'
  }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-green-100 text-green-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-orange-100 text-orange-800' },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800' }
}

export function TaskStatusCard({ 
  task, 
  onTaskUpdate, 
  onTaskEdit, 
  onTaskDelete 
}: TaskStatusCardProps) {
  const [updating, setUpdating] = useState(false)
  const [showStatusUpdate, setShowStatusUpdate] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNotes, setStatusNotes] = useState('')

  const { toast } = useToast()

  const currentStatus = STATUS_CONFIG[task.status as keyof typeof STATUS_CONFIG]
  const currentPriority = PRIORITY_CONFIG[task.priority as keyof typeof PRIORITY_CONFIG]
  const StatusIcon = currentStatus?.icon || Clock

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      toast({
        title: 'Update Required',
        description: 'Please select a new status',
        variant: 'destructive'
      })
      return
    }

    setUpdating(true)
    try {
      // Check if this is a sample task (starts with 'sample-')
      if (task.id.startsWith('sample-')) {
        // For sample tasks, just show success without API call
        toast({
          title: 'Demo Mode',
          description: 'This is sample data. Create a real task to enable status updates.',
          variant: 'default'
        })
        
        setNewStatus('')
        setStatusNotes('')
        setShowStatusUpdate(false)
        return
      }

      const updateData: Record<string, unknown> = {
        status: newStatus
      }

      // If completing the task, set completedAt timestamp
      if (newStatus === 'completed') {
        updateData.completedAt = new Date().toISOString()
      }

      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to update task' }))
        throw new Error(errorData.error || 'Failed to update task')
      }

      toast({
        title: 'Success',
        description: 'Task status updated successfully'
      })

      setNewStatus('')
      setStatusNotes('')
      setShowStatusUpdate(false)
      onTaskUpdate?.()

    } catch (error) {
      console.error('Error updating task status:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update task status',
        variant: 'destructive'
      })
    } finally {
      setUpdating(false)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffInHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
      
      if (diffInHours < -24) {
        return `${Math.abs(Math.floor(diffInHours / 24))} days overdue`
      } else if (diffInHours < 0) {
        return `${Math.abs(Math.floor(diffInHours))} hours overdue`
      } else if (diffInHours < 24) {
        return `Due in ${Math.floor(diffInHours)} hours`
      } else {
        return `Due in ${Math.floor(diffInHours / 24)} days`
      }
    } catch {
      return 'Invalid date'
    }
  }

  const isOverdue = new Date(task.dueDate) < new Date() && task.status !== 'completed'
  const isDueToday = new Date(task.dueDate).toDateString() === new Date().toDateString()

  return (
    <Card className={`hover:shadow-md transition-shadow ${isOverdue ? 'border-red-300 bg-red-50/50' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-2">
              <StatusIcon className={`h-4 w-4 ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`} />
              <h3 className={`font-semibold truncate ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                {task.title}
              </h3>
            </div>
            
            <div className="flex items-center space-x-2 mb-2">
              <Badge className={currentStatus?.color}>
                {currentStatus?.label || task.status}
              </Badge>
              <Badge className={currentPriority?.color} variant="outline">
                {currentPriority?.label || task.priority}
              </Badge>
              {isOverdue && (
                <Badge className="bg-red-100 text-red-800" variant="outline">
                  Overdue
                </Badge>
              )}
              {isDueToday && !isOverdue && (
                <Badge className="bg-orange-100 text-orange-800" variant="outline">
                  Due Today
                </Badge>
              )}
              {task.id.startsWith('sample-') && (
                <Badge className="bg-blue-100 text-blue-800" variant="outline">
                  Demo
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setShowStatusUpdate(true)}>
                <Edit3 className="h-4 w-4 mr-2" />
                Update Status
              </DropdownMenuItem>
              {onTaskEdit && (
                <DropdownMenuItem onClick={() => onTaskEdit(task)}>
                  <Edit3 className="h-4 w-4 mr-2" />
                  Edit Task
                </DropdownMenuItem>
              )}
              {onTaskDelete && (
                <DropdownMenuItem 
                  onClick={() => onTaskDelete(task.id)}
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {task.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {task.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Task Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className={isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'}>
              {formatDate(task.dueDate)}
            </span>
          </div>
          
          {task.assignedTo && (
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {task.assignedTo.name}
              </span>
            </div>
          )}
          
          {task.client && (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {task.client.name}
              </span>
            </div>
          )}
          
          {task.application && (
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground truncate">
                {task.application.programName}
              </span>
            </div>
          )}
        </div>

        {/* Status Update Form */}
        {showStatusUpdate && (
          <div className="border rounded-lg p-3 space-y-3 bg-gray-50">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Update Status</h4>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowStatusUpdate(false)}
              >
                Cancel
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newStatus">New Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STATUS_CONFIG).map(([status, config]) => {
                    const Icon = config.icon
                    return (
                      <SelectItem key={status} value={status}>
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4" />
                          <span>{config.label}</span>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="statusNotes">Notes (Optional)</Label>
              <Textarea
                id="statusNotes"
                placeholder="Add notes about this status update..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={2}
              />
            </div>

            <Button 
              onClick={handleStatusUpdate}
              disabled={updating || !newStatus}
              size="sm"
              className="w-full"
            >
              {updating ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}