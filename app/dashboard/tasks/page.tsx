'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// Badge imported but used in TabsTrigger className conditionally
import { TaskCreateModal } from './_components/task-create-modal'
import { TaskStatusCard } from './_components/task-status-card'
import { 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  Users,
  Calendar,
  Filter
} from 'lucide-react'

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

interface TaskStats {
  total: number
  pending: number
  inProgress: number
  completed: number
  overdue: number
}

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [activeTab, setActiveTab] = useState('all')

  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data.tasks || [])
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const handleTaskCreated = () => {
    fetchTasks()
  }

  const handleTaskUpdate = () => {
    fetchTasks()
  }

  const handleTaskDelete = async (taskId: string) => {
    // Check if this is a sample task
    if (taskId.startsWith('sample-')) {
      // For sample tasks, just show demo message
      console.log('Demo mode: Cannot delete sample tasks')
      return
    }

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  // Calculate task statistics
  const stats: TaskStats = tasks.reduce((acc, task) => {
    acc.total++
    
    switch (task.status) {
      case 'pending':
        acc.pending++
        break
      case 'in_progress':
        acc.inProgress++
        break
      case 'completed':
        acc.completed++
        break
    }
    
    // Check if task is overdue
    if (new Date(task.dueDate) < new Date() && task.status !== 'completed') {
      acc.overdue++
    }
    
    return acc
  }, { total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 })

  // Filter tasks based on active tab
  const filteredTasks = tasks.filter(task => {
    switch (activeTab) {
      case 'pending':
        return task.status === 'pending'
      case 'in_progress':
        return task.status === 'in_progress'
      case 'completed':
        return task.status === 'completed'
      case 'overdue':
        return new Date(task.dueDate) < new Date() && task.status !== 'completed'
      default:
        return true
    }
  })

  // Sort tasks by due date (overdue first, then by due date)
  const sortedTasks = filteredTasks.sort((a, b) => {
    const aOverdue = new Date(a.dueDate) < new Date() && a.status !== 'completed'
    const bOverdue = new Date(b.dueDate) < new Date() && b.status !== 'completed'
    
    if (aOverdue && !bOverdue) return -1
    if (!aOverdue && bOverdue) return 1
    
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  })

  if (loading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tasks & Workflow</h1>
          <p className="text-sm" style={{color: '#00000080'}}>
            Manage and track tasks across all clients and applications
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Task
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <Calendar className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overdue}</div>
          </CardContent>
        </Card>
      </div>

      {/* Task Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="in_progress">
              Active ({stats.inProgress})
            </TabsTrigger>
            <TabsTrigger value="overdue" className={stats.overdue > 0 ? 'text-red-600' : ''}>
              Overdue ({stats.overdue})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Done ({stats.completed})
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        <TabsContent value="all" className="mt-6">
          <TaskList tasks={sortedTasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <TaskList tasks={sortedTasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
        </TabsContent>

        <TabsContent value="in_progress" className="mt-6">
          <TaskList tasks={sortedTasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
        </TabsContent>

        <TabsContent value="overdue" className="mt-6">
          <TaskList tasks={sortedTasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
        </TabsContent>

        <TabsContent value="completed" className="mt-6">
          <TaskList tasks={sortedTasks} onTaskUpdate={handleTaskUpdate} onTaskDelete={handleTaskDelete} />
        </TabsContent>
      </Tabs>

      {/* Task Create Modal */}
      <TaskCreateModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onTaskCreated={handleTaskCreated}
      />
    </div>
  )
}

interface TaskListProps {
  tasks: Task[]
  onTaskUpdate: () => void
  onTaskDelete: (taskId: string) => void
}

function TaskList({ tasks, onTaskUpdate, onTaskDelete }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No tasks found</h3>
        <p className="text-sm text-muted-foreground">
          Create your first task to get started
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {tasks.map((task) => (
        <TaskStatusCard
          key={task.id}
          task={task}
          onTaskUpdate={onTaskUpdate}
          onTaskDelete={onTaskDelete}
        />
      ))}
    </div>
  )
}