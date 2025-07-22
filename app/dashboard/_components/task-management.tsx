'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  User, 
  Calendar,
  Plus,
  Filter
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface Task {
  id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  dueDate: string
  assignedTo?: {
    id: string
    name: string
    email: string
  }
  client?: {
    id: string
    name: string
  }
  application?: {
    id: string
    programName: string
  }
  taskType: string
  createdAt: string
}

interface TaskManagementProps {
  className?: string
}

export function TaskManagement({ className = '' }: TaskManagementProps) {
  const { toast } = useToast()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'overdue' | 'today'>('all')

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      } else {
        console.error('Failed to fetch tasks')
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTaskComplete = async (taskId: string, completed: boolean) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: completed ? 'completed' : 'pending',
          completedAt: completed ? new Date().toISOString() : null
        }),
      })

      if (response.ok) {
        setTasks(tasks.map(task => 
          task.id === taskId 
            ? { ...task, status: completed ? 'completed' : 'pending' }
            : task
        ))
        
        toast({
          title: completed ? 'Task Completed' : 'Task Reopened',
          description: completed 
            ? 'Task marked as completed successfully'
            : 'Task marked as pending'
        })
      }
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: 'Failed to update task status',
        variant: 'destructive'
      })
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <AlertTriangle className="h-3 w-3" />
      case 'medium':
        return <Clock className="h-3 w-3" />
      default:
        return null
    }
  }

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date()
  }

  const isDueToday = (dueDate: string) => {
    const today = new Date()
    const due = new Date(dueDate)
    return today.toDateString() === due.toDateString()
  }

  const getFilteredTasks = () => {
    switch (filter) {
      case 'pending':
        return tasks.filter(task => task.status === 'pending' || task.status === 'in_progress')
      case 'overdue':
        return tasks.filter(task => isOverdue(task.dueDate) && task.status !== 'completed')
      case 'today':
        return tasks.filter(task => isDueToday(task.dueDate) && task.status !== 'completed')
      default:
        return tasks
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 0) {
      return 'Today'
    } else if (diffDays === 1) {
      return 'Tomorrow'
    } else if (diffDays === -1) {
      return 'Yesterday'
    } else if (diffDays > 1 && diffDays <= 7) {
      return `In ${diffDays} days`
    } else if (diffDays < -1 && diffDays >= -7) {
      return `${Math.abs(diffDays)} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const filteredTasks = getFilteredTasks()
  const overdueTasks = tasks.filter(task => isOverdue(task.dueDate) && task.status !== 'completed')
  const todayTasks = tasks.filter(task => isDueToday(task.dueDate) && task.status !== 'completed')

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Task Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Task Management
            </CardTitle>
            <CardDescription>
              Track tasks, deadlines, and team assignments
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Task
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex items-center space-x-2 p-3 rounded-lg border">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <div>
              <div className="text-sm font-medium">{overdueTasks.length} Overdue</div>
              <div className="text-xs text-muted-foreground">Require immediate attention</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border">
            <Calendar className="h-4 w-4 text-orange-500" />
            <div>
              <div className="text-sm font-medium">{todayTasks.length} Due Today</div>
              <div className="text-xs text-muted-foreground">Today&apos;s priorities</div>
            </div>
          </div>
          <div className="flex items-center space-x-2 p-3 rounded-lg border">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <div>
              <div className="text-sm font-medium">
                {tasks.filter(t => t.status === 'completed').length} Completed
              </div>
              <div className="text-xs text-muted-foreground">This week</div>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
          >
            All Tasks ({tasks.length})
          </Button>
          <Button
            variant={filter === 'overdue' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('overdue')}
          >
            Overdue ({overdueTasks.length})
          </Button>
          <Button
            variant={filter === 'today' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('today')}
          >
            Today ({todayTasks.length})
          </Button>
          <Button
            variant={filter === 'pending' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('pending')}
          >
            Pending
          </Button>
        </div>

        {/* Task List */}
        <div className="space-y-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-start space-x-3 p-4 rounded-lg border transition-colors ${
                  task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-white hover:bg-gray-50'
                } ${isOverdue(task.dueDate) && task.status !== 'completed' ? 'border-red-200 bg-red-50' : ''}`}
              >
                <Checkbox
                  checked={task.status === 'completed'}
                  onCheckedChange={(checked) => handleTaskComplete(task.id, checked as boolean)}
                  className="mt-1"
                />
                
                <div className="flex-1 space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className={`text-sm font-medium ${
                        task.status === 'completed' ? 'line-through text-muted-foreground' : ''
                      }`}>
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="text-xs text-muted-foreground">{task.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={`${getPriorityColor(task.priority)} text-xs`}>
                        {getPriorityIcon(task.priority)}
                        <span className="ml-1">{task.priority}</span>
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center space-x-4">
                      {task.client && (
                        <div className="flex items-center space-x-1">
                          <User className="h-3 w-3" />
                          <span>{task.client.name}</span>
                        </div>
                      )}
                      {task.application && (
                        <div className="flex items-center space-x-1">
                          <span>•</span>
                          <span>{task.application.programName}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center space-x-1 ${
                      isOverdue(task.dueDate) && task.status !== 'completed' ? 'text-red-600 font-medium' : ''
                    } ${isDueToday(task.dueDate) && task.status !== 'completed' ? 'text-orange-600 font-medium' : ''}`}>
                      <Clock className="h-3 w-3" />
                      <span>{formatDate(task.dueDate)}</span>
                    </div>
                  </div>

                  {task.assignedTo && (
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-xs">
                          {task.assignedTo.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        Assigned to {task.assignedTo.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {filter === 'all' ? 'No tasks available' : `No ${filter} tasks`}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}