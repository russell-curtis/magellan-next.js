'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Briefcase, Clock, CheckCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react'

export default function ClientApplicationsPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

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

  // Placeholder data for applications
  const applications = [
    {
      id: '1',
      program: 'Quebec Investor Program',
      status: 'in_progress',
      progress: 65,
      nextStep: 'Due Diligence Review',
      submittedAt: '2024-01-15',
      expectedCompletion: '2024-08-15',
      investment: '$1,200,000 CAD',
    },
    {
      id: '2',
      program: 'Start-up Visa Program',
      status: 'pending_review',
      progress: 30,
      nextStep: 'Business Plan Assessment',
      submittedAt: '2024-02-20',
      expectedCompletion: '2024-10-20',
      investment: '$75,000 CAD',
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'pending_review':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      default:
        return <Briefcase className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'pending_review':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-600 mt-1">
            Track the progress of your immigration applications
          </p>
        </div>
        <Button variant="outline">
          <FileText className="mr-2 h-4 w-4" />
          Download Status Report
        </Button>
      </div>

      {/* Applications List */}
      <div className="space-y-6">
        {applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(application.status)}
                  <div>
                    <CardTitle className="text-lg">{application.program}</CardTitle>
                    <p className="text-sm text-gray-600">
                      Submitted on {new Date(application.submittedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge className={getStatusColor(application.status)}>
                  {formatStatus(application.status)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress Bar */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">{application.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${application.progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Application Details */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Investment Amount</p>
                  <p className="text-sm text-gray-900">{application.investment}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Next Step</p>
                  <p className="text-sm text-gray-900">{application.nextStep}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Expected Completion</p>
                  <p className="text-sm text-gray-900">
                    {new Date(application.expectedCompletion).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-4 border-t">
                <Button variant="outline" size="sm">
                  View Details
                </Button>
                <Button size="sm">
                  Contact Advisor
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">
                  {applications.filter(app => app.status === 'completed').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}