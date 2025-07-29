'use client'

import { useState, useEffect } from 'react'
import { UserSetup } from './user-setup'
import { CRBIPrograms } from './crbi-programs'
import { DashboardAnalytics } from './dashboard-analytics'
import { RecentActivity } from './recent-activity'
import { ClientStatusDistribution } from './client-status-distribution'
import { TaskManagement } from './task-management'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, FileText, TrendingUp, ArrowRight } from 'lucide-react'

export function DashboardWrapper() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUserSetup()
  }, [])

  const checkUserSetup = async () => {
    try {
      const response = await fetch('/api/user/check-setup')
      const data = await response.json()
      
      if (response.ok) {
        setNeedsSetup(!data.isSetup)
      } else {
        // If there's an auth error, assume setup is needed
        setNeedsSetup(true)
      }
    } catch (error) {
      console.error('Error checking setup:', error)
      setNeedsSetup(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSetupComplete = () => {
    setNeedsSetup(false)
  }

  if (loading) {
    return (
      <section className="flex flex-col items-start justify-start p-6 w-full">
        <div className="w-full space-y-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </section>
    )
  }

  if (needsSetup) {
    return <UserSetup onSetupComplete={handleSetupComplete} />
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2 mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">
            Client Management Dashboard
          </h1>
          <p className="text-muted-foreground">
            Comprehensive view of your CRBI client portfolio, application progress, and key performance metrics.
          </p>
        </div>
        
        <div className="space-y-8">
          {/* Main Dashboard Content - First Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Recent Activity */}
            <RecentActivity />
            
            {/* Column 2: Task Management */}
            <TaskManagement />
          </div>
          
          {/* Second Row - 50/50 Split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Column 1: Client Status Distribution */}
            <ClientStatusDistribution />
            
            {/* Column 2: Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Frequently used features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className="w-full justify-start h-12 text-left hover:bg-blue-50 hover:border-blue-200 transition-colors" 
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-blue-100 rounded-full mr-3">
                      <Users className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Add New Client</div>
                      <div className="text-xs text-gray-500">Start onboarding process</div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start h-12 text-left hover:bg-green-50 hover:border-green-200 transition-colors" 
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-green-100 rounded-full mr-3">
                      <FileText className="h-4 w-4 text-green-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Review Applications</div>
                      <div className="text-xs text-gray-500">5 pending review</div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
                  </div>
                </Button>
                
                <Button 
                  className="w-full justify-start h-12 text-left hover:bg-purple-50 hover:border-purple-200 transition-colors" 
                  variant="outline"
                >
                  <div className="flex items-center w-full">
                    <div className="p-2 bg-purple-100 rounded-full mr-3">
                      <TrendingUp className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-medium">Analytics Report</div>
                      <div className="text-xs text-gray-500">Generate monthly report</div>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 text-gray-400" />
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>
          
          {/* Third Row - CRBI Programs */}
          <div className="grid grid-cols-1">
            <CRBIPrograms />
          </div>
        </div>
      </div>
    </section>
  )
}