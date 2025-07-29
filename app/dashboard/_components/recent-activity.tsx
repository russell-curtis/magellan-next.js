'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FileText, TrendingUp } from 'lucide-react'

interface RecentActivity {
  id: string
  type: 'client_added' | 'application_submitted' | 'document_uploaded' | 'status_changed'
  description: string
  timestamp: string
}

export function RecentActivity() {
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/dashboard/analytics')
      if (response.ok) {
        const data = await response.json()
        setActivities(data.recentActivity || [])
      } else {
        // Use mock data if API fails
        setActivities([
          {
            id: '1',
            type: 'client_added',
            description: 'Sarah Chen joined Quebec program',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
          },
          {
            id: '2',
            type: 'application_submitted',
            description: 'Marcus Johnson - St. Kitts program',
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
          },
          {
            id: '3',
            type: 'status_changed',
            description: 'Elena Rodriguez approved',
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString() // 1 day ago
          }
        ])
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error)
      // Use mock data on error
      setActivities([
        {
          id: '1',
          type: 'client_added',
          description: 'Sarah Chen joined Quebec program',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '2',
          type: 'application_submitted',
          description: 'Marcus Johnson - St. Kitts program',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        },
        {
          id: '3',
          type: 'status_changed',
          description: 'Elena Rodriguez approved',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'client_added':
        return { icon: Users, color: 'bg-blue-100 text-blue-600' }
      case 'application_submitted':
        return { icon: FileText, color: 'bg-green-100 text-green-600' }
      case 'document_uploaded':
        return { icon: FileText, color: 'bg-purple-100 text-purple-600' }
      case 'status_changed':
        return { icon: TrendingUp, color: 'bg-orange-100 text-orange-600' }
      default:
        return { icon: Users, color: 'bg-gray-100 text-gray-600' }
    }
  }

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date()
    const time = new Date(timestamp)
    const diffInHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours === 1) return '1 hour ago'
    if (diffInHours < 24) return `${diffInHours} hours ago`
    if (diffInHours < 48) return '1 day ago'
    return `${Math.floor(diffInHours / 24)} days ago`
  }

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'client_added':
        return 'New client onboarded'
      case 'application_submitted':
        return 'Application submitted'
      case 'document_uploaded':
        return 'Document uploaded'
      case 'status_changed':
        return 'Status updated'
      default:
        return 'Activity update'
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest updates across your client portfolio</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3 p-3 rounded-lg border animate-pulse">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest updates across your client portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.slice(0, 5).map((activity) => {
              const { icon: Icon, color } = getActivityIcon(activity.type)
              
              return (
                <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-lg border">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{getActivityTitle(activity.type)}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(activity.timestamp)}</p>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">No recent activity to display</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}