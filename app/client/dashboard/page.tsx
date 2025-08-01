'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { PriorityBadge } from '@/components/ui/priority-badge'
import { formatConversationDate, isRecent } from '@/lib/date-utils'
import { MessageSquare, FileText, Briefcase, Clock, ArrowRight, Plus, TrendingUp, CheckCircle, AlertCircle, CheckSquare, Upload, Calendar } from 'lucide-react'

interface DashboardStats {
  totalConversations: number
  unreadMessages: number
  totalApplications: number
  recentDocuments: number
}

interface RecentActivity {
  id: string
  type: 'message' | 'document' | 'application'
  title: string
  description: string
  timestamp: string
  priority?: string
}

interface Task {
  id: string
  title: string
  description: string
  status: 'pending' | 'in_progress' | 'completed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  dueDate?: string
  category: 'document' | 'application' | 'communication' | 'payment'
}

export default function ClientDashboardOverview() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalConversations: 0,
    unreadMessages: 0,
    totalApplications: 0,
    recentDocuments: 0,
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loadingStats, setLoadingStats] = useState(true)

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  const fetchDashboardData = useCallback(async () => {
    if (!client) return

    setLoadingStats(true)
    try {
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      // Fetch conversations for stats
      const conversationsResponse = await fetch('/api/conversations?userType=client', { headers })
      let conversations = []
      if (conversationsResponse.ok) {
        const data = await conversationsResponse.json()
        conversations = data.conversations || []
      }

      // Calculate stats (placeholder data for applications and documents)
      setStats({
        totalConversations: conversations.length,
        unreadMessages: conversations.filter((c: { status: string }) => c.status === 'active').length,
        totalApplications: 2, // Placeholder
        recentDocuments: 5, // Placeholder
      })

      // Create recent activity from conversations
      const activities: RecentActivity[] = conversations.slice(0, 5).map((conv: { 
        id: string
        title: string
        assignedAdvisor?: { name: string }
        lastMessageAt?: string
        createdAt: string
        priority?: string
      }) => ({
        id: conv.id,
        type: 'message' as const,
        title: conv.title,
        description: conv.assignedAdvisor ? `with ${conv.assignedAdvisor.name}` : 'New conversation',
        timestamp: conv.lastMessageAt || conv.createdAt,
        priority: conv.priority,
      }))

      // Add some placeholder activities
      activities.push(
        {
          id: 'doc-1',
          type: 'document',
          title: 'Investment Portfolio Document',
          description: 'Shared by your advisor',
          timestamp: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        },
        {
          id: 'app-1',
          type: 'application',
          title: 'Quebec Investor Program',
          description: 'Application status updated',
          timestamp: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        }
      )

      setRecentActivity(activities)

      // Add mock tasks for the client
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          title: 'Upload Investment Portfolio',
          description: 'Submit proof of investment funds',
          status: 'pending',
          priority: 'high',
          dueDate: new Date(Date.now() + 172800000).toISOString(), // 2 days from now
          category: 'document'
        },
        {
          id: 'task-2',
          title: 'Schedule Advisor Meeting',
          description: 'Book consultation for next steps',
          status: 'pending',
          priority: 'normal',
          dueDate: new Date(Date.now() + 604800000).toISOString(), // 1 week from now
          category: 'communication'
        },
        {
          id: 'task-3',
          title: 'Review Application Status',
          description: 'Check Quebec program progress',
          status: 'in_progress',
          priority: 'normal',
          category: 'application'
        },
        {
          id: 'task-4',
          title: 'Update Personal Information',
          description: 'Verify contact details are current',
          status: 'pending',
          priority: 'low',
          dueDate: new Date(Date.now() + 1209600000).toISOString(), // 2 weeks from now
          category: 'application'
        },
        {
          id: 'task-5',
          title: 'Payment Confirmation',
          description: 'Confirm government fee payment',
          status: 'completed',
          priority: 'high',
          category: 'payment'
        }
      ]
      
      setTasks(mockTasks)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [client])

  useEffect(() => {
    if (client) {
      fetchDashboardData()
    }
  }, [client, fetchDashboardData])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'message':
        return MessageSquare
      case 'document':
        return FileText
      case 'application':
        return Briefcase
      default:
        return Clock
    }
  }

  const getTaskIcon = (category: string) => {
    switch (category) {
      case 'document':
        return Upload
      case 'application':
        return Briefcase
      case 'communication':
        return MessageSquare
      case 'payment':
        return CheckCircle
      default:
        return CheckSquare
    }
  }

  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const formatDueDate = (dueDate?: string) => {
    if (!dueDate) return null
    const date = new Date(dueDate)
    const now = new Date()
    const diffTime = date.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays < 0) return 'Overdue'
    if (diffDays === 0) return 'Due today'
    if (diffDays === 1) return 'Due tomorrow'
    if (diffDays <= 7) return `Due in ${diffDays} days`
    return date.toLocaleDateString()
  }


  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {client.firstName}!
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Here&apos;s what&apos;s happening with your applications and communications.
          </p>
        </div>
        <Avatar className="h-12 w-12">
          <AvatarFallback>
            <AvatarInitials name={`${client.firstName} ${client.lastName}`} />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <div className="p-2 bg-blue-100 rounded-full">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalConversations}</div>
            <div className="flex items-center space-x-2 mt-1">
              <p className="text-xs text-muted-foreground">
                {stats.unreadMessages} unread
              </p>
              {stats.unreadMessages > 0 && (
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-blue-600" />
        </Card>

        <Card className="relative overflow-hidden border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Applications</CardTitle>
            <div className="p-2 bg-green-100 rounded-full">
              <Briefcase className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.totalApplications}</div>
            <div className="flex items-center space-x-1 mt-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              <p className="text-xs text-green-600 font-medium">
                In progress
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 to-green-600" />
        </Card>

        <Card className="relative overflow-hidden border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <div className="p-2 bg-purple-100 rounded-full">
              <FileText className="h-4 w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">{stats.recentDocuments}</div>
            <div className="flex items-center space-x-1 mt-1">
              <CheckCircle className="h-3 w-3 text-purple-500" />
              <p className="text-xs text-purple-600 font-medium">
                Available
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-purple-600" />
        </Card>

        <Card className="relative overflow-hidden border border-gray-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
            <div className="p-2 bg-orange-100 rounded-full">
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">3</div>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="h-3 w-3 text-orange-500" />
              <p className="text-xs text-orange-600 font-medium">
                Action required
              </p>
            </div>
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 to-orange-600" />
        </Card>
      </div>

      {/* Recent Activity, Tasks, and Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Activity</CardTitle>
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingStats ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading activity...</p>
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((activity) => {
                const Icon = getActivityIcon(activity.type)
                const isRecentActivity = isRecent(activity.timestamp)
                
                const iconColors = {
                  message: 'bg-blue-100 text-blue-600',
                  document: 'bg-purple-100 text-purple-600',
                  application: 'bg-green-100 text-green-600',
                }
                
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconColors[activity.type] || iconColors.message}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {activity.title}
                          </p>
                          {isRecentActivity && (
                            <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-pulse" />
                          )}
                        </div>
                        {activity.priority && activity.priority !== 'normal' && (
                          <PriorityBadge 
                            priority={activity.priority as 'low' | 'normal' | 'high' | 'urgent'}
                            variant="minimal"
                            showIcon={false}
                          />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-2 flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatConversationDate(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Task Management */}
        <Card className="border border-gray-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5" />
                <span>My Tasks</span>
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                {tasks.filter(t => t.status !== 'completed').length} pending
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStats ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-sm text-gray-500">Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-4 text-gray-500">
                <p className="text-sm">No tasks assigned</p>
              </div>
            ) : (
              tasks.slice(0, 4).map((task) => {
                const Icon = getTaskIcon(task.category)
                const dueDate = formatDueDate(task.dueDate)
                
                const categoryColors = {
                  document: 'bg-purple-100 text-purple-600',
                  application: 'bg-green-100 text-green-600',
                  communication: 'bg-blue-100 text-blue-600',
                  payment: 'bg-orange-100 text-orange-600',
                }
                
                return (
                  <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-gray-100">
                    <div className="flex-shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${categoryColors[task.category] || categoryColors.document}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {task.title}
                        </p>
                        <Badge 
                          className={`text-xs px-2 py-1 rounded-full border ${getTaskStatusColor(task.status)}`}
                          variant="outline"
                        >
                          {task.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                      <div className="flex items-center justify-between">
                        <PriorityBadge 
                          priority={task.priority}
                          variant="minimal"
                          showIcon={false}
                        />
                        {dueDate && (
                          <div className="flex items-center text-xs text-gray-500">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span className={dueDate.includes('Overdue') || dueDate.includes('today') ? 'text-red-600 font-medium' : ''}>
                              {dueDate}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
            
            {tasks.length > 4 && (
              <Button variant="ghost" size="sm" className="w-full mt-3">
                View All Tasks ({tasks.length})
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <span>Quick Actions</span>
              <Badge variant="outline" className="text-xs">4</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start h-12 text-left hover:bg-blue-50 hover:border-blue-200 transition-colors" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/messages')}
            >
              <div className="flex items-center w-full">
                <div className="p-2 bg-blue-100 rounded-full mr-3">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">View Messages</div>
                  <div className="text-xs text-gray-500">{stats.unreadMessages} unread</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
              </div>
            </Button>
            
            <Button 
              className="w-full justify-start h-12 text-left hover:bg-green-50 hover:border-green-200 transition-colors" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/applications')}
            >
              <div className="flex items-center w-full">
                <div className="p-2 bg-green-100 rounded-full mr-3">
                  <Briefcase className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Application Status</div>
                  <div className="text-xs text-gray-500">{stats.totalApplications} active</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
              </div>
            </Button>
            
            <Button 
              className="w-full justify-start h-12 text-left hover:bg-purple-50 hover:border-purple-200 transition-colors" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/documents')}
            >
              <div className="flex items-center w-full">
                <div className="p-2 bg-purple-100 rounded-full mr-3">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">View Documents</div>
                  <div className="text-xs text-gray-500">{stats.recentDocuments} available</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
              </div>
            </Button>
            
            <Button 
              className="w-full justify-start h-12 text-left hover:bg-orange-50 hover:border-orange-200 transition-colors" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/profile')}
            >
              <div className="flex items-center w-full">
                <div className="p-2 bg-orange-100 rounded-full mr-3">
                  <Plus className="h-4 w-4 text-orange-600" />
                </div>
                <div className="text-left">
                  <div className="font-medium">Update Profile</div>
                  <div className="text-xs text-gray-500">Keep info current</div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}