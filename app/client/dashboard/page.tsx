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
import { MessageSquare, FileText, Briefcase, Clock, ArrowRight, Plus, TrendingUp, CheckCircle, AlertCircle } from 'lucide-react'

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
        <Card className="relative overflow-hidden">
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

        <Card className="relative overflow-hidden">
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

        <Card className="relative overflow-hidden">
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

        <Card className="relative overflow-hidden">
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

        {/* Quick Actions */}
        <Card>
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