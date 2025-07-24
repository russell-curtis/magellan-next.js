'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, FileText, Briefcase, Clock, ArrowRight, Plus } from 'lucide-react'

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
        unreadMessages: conversations.filter((c: any) => c.status === 'active').length,
        totalApplications: 2, // Placeholder
        recentDocuments: 5, // Placeholder
      })

      // Create recent activity from conversations
      const activities: RecentActivity[] = conversations.slice(0, 5).map((conv: any) => ({
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

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) {
      return 'Today'
    } else if (diffDays === 2) {
      return 'Yesterday'
    } else if (diffDays <= 7) {
      return `${diffDays - 1} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {client.firstName}!
          </h1>
          <p className="text-gray-600 mt-1">
            Here's what's happening with your applications and communications.
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalConversations}</div>
            <p className="text-xs text-muted-foreground">
              {stats.unreadMessages} with new messages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalApplications}</div>
            <p className="text-xs text-muted-foreground">
              In progress
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentDocuments}</div>
            <p className="text-xs text-muted-foreground">
              Shared with you
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Steps</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Action items pending
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
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
                return (
                  <div key={activity.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Icon className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {activity.title}
                        </p>
                        {activity.priority && activity.priority !== 'normal' && (
                          <Badge 
                            variant={activity.priority === 'urgent' ? 'destructive' : 'outline'}
                            className="text-xs ml-2"
                          >
                            {activity.priority}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatTimestamp(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/messages')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              View Messages
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/applications')}
            >
              <Briefcase className="mr-2 h-4 w-4" />
              Check Application Status
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/documents')}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Documents
            </Button>
            <Button 
              className="w-full justify-start" 
              variant="outline"
              onClick={() => router.push('/client/dashboard/profile')}
            >
              <Plus className="mr-2 h-4 w-4" />
              Update Profile
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}