'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Briefcase, Clock, CheckCircle, AlertCircle, FileText, ArrowRight, RefreshCcw } from 'lucide-react'

interface Application {
  id: string
  applicationNumber: string
  status: string
  priority: string
  investmentAmount: string | null
  investmentType: string | null
  submittedAt: string | null
  decisionExpectedAt: string | null
  decidedAt: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  program: {
    id: string
    countryName: string
    programName: string
    programType: string
    minInvestment: string
    processingTimeMonths: number
  } | null
  assignedAdvisor: {
    id: string
    name: string
    email: string
  } | null
}

export default function ClientApplicationsPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingApplications, setLoadingApplications] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  const fetchApplications = useCallback(async () => {
    if (!client) return
    
    setLoadingApplications(true)
    setError(null)
    
    try {
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch('/api/client/applications', { headers })
      
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load applications')
      }
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError('Network error while loading applications')
    } finally {
      setLoadingApplications(false)
    }
  }, [client])

  useEffect(() => {
    if (client) {
      fetchApplications()
    }
  }, [client, fetchApplications])

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'under_review':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'submitted':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'draft':
      default:
        return <Briefcase className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const calculateProgress = (status: string, submittedAt: string | null): number => {
    if (!submittedAt) return status === 'draft' ? 10 : 0
    
    switch (status) {
      case 'draft':
        return 10
      case 'submitted':
        return 25
      case 'under_review':
        return 60
      case 'approved':
        return 100
      case 'rejected':
        return 0
      default:
        return 0
    }
  }

  const getNextStep = (status: string): string => {
    switch (status) {
      case 'draft':
        return 'Complete and submit application'
      case 'submitted':
        return 'Initial review in progress'
      case 'under_review':
        return 'Due diligence and assessment'
      case 'approved':
        return 'Application approved'
      case 'rejected':
        return 'Review feedback and resubmit'
      default:
        return 'Contact your advisor'
    }
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount))
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
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchApplications}
            disabled={loadingApplications}
          >
            <RefreshCcw className={`mr-2 h-4 w-4 ${loadingApplications ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline">
            <FileText className="mr-2 h-4 w-4" />
            Download Status Report
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchApplications}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loadingApplications && applications.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your applications...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loadingApplications && applications.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Applications Yet</h3>
            <p className="text-gray-600 mb-4">
              Your advisor will create applications for you when you&apos;re ready to proceed with a CRBI program.
            </p>
            <Button onClick={() => router.push('/client/dashboard/messages')}>
              <ArrowRight className="mr-2 h-4 w-4" />
              Contact Your Advisor
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {applications.length > 0 && (
        <div className="space-y-6">
          {applications.map((application) => {
            const progress = calculateProgress(application.status, application.submittedAt)
            return (
              <Card key={application.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(application.status)}
                      <div>
                        <CardTitle className="text-lg">
                          {application.program?.programName || 'Unknown Program'}
                        </CardTitle>
                        <div className="text-sm text-gray-600 space-y-1">
                          <p>Application #{application.applicationNumber}</p>
                          <p>
                            Created on {new Date(application.createdAt).toLocaleDateString()}
                            {application.submittedAt && (
                              <span> • Submitted on {new Date(application.submittedAt).toLocaleDateString()}</span>
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-2">
                      <Badge className={getStatusColor(application.status)}>
                        {formatStatus(application.status)}
                      </Badge>
                      {application.program && (
                        <div className="text-xs text-gray-500">
                          {application.program.countryName} • {application.program.programType}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Progress</span>
                      <span className="text-sm text-gray-500">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Application Details */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Investment Amount</p>
                      <p className="text-sm text-gray-900">{formatCurrency(application.investmentAmount)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Investment Type</p>
                      <p className="text-sm text-gray-900">{application.investmentType || 'Not specified'}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Next Step</p>
                      <p className="text-sm text-gray-900">{getNextStep(application.status)}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Expected Decision</p>
                      <p className="text-sm text-gray-900">
                        {application.decisionExpectedAt ? 
                          new Date(application.decisionExpectedAt).toLocaleDateString() : 
                          'TBD'
                        }
                      </p>
                    </div>
                  </div>

                  {/* Assigned Advisor */}
                  {application.assignedAdvisor && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Assigned Advisor</p>
                      <p className="text-sm text-gray-900">{application.assignedAdvisor.name}</p>
                      <p className="text-xs text-gray-500">{application.assignedAdvisor.email}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {application.notes && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-1">Notes</p>
                      <p className="text-sm text-gray-900">{application.notes}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/client/dashboard/applications/${application.id}`}>
                        View Details
                      </Link>
                    </Button>
                    <Button 
                      size="sm"
                      onClick={() => router.push('/client/dashboard/messages')}
                    >
                      Contact Advisor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Summary Stats */}
      {applications.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
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
                  <p className="text-sm font-medium text-gray-600">Under Review</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter(app => app.status === 'under_review' || app.status === 'submitted').length}
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
                  <p className="text-sm font-medium text-gray-600">Approved</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter(app => app.status === 'approved').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Draft</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {applications.filter(app => app.status === 'draft').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}