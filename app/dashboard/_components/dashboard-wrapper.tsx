'use client'

import { useState, useEffect } from 'react'
import { UserSetup } from './user-setup'
import { SectionCards } from './section-cards'
import { ChartAreaInteractive } from './chart-interactive'
import { CRBIPrograms } from './crbi-programs'
import { DashboardAnalytics } from './dashboard-analytics'
import { TaskManagement } from './task-management'
import { Skeleton } from '@/components/ui/skeleton'

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
          {/* Dashboard Analytics - KPIs and Charts */}
          <DashboardAnalytics />
          
          {/* Task Management and CRBI Programs */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <TaskManagement />
            <CRBIPrograms />
          </div>
          
          {/* Legacy Components - TODO: Integrate or Replace */}
          <div className="space-y-6">
            <SectionCards />
            <ChartAreaInteractive />
          </div>
        </div>
      </div>
    </section>
  )
}