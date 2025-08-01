'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCcw,
  MessageSquare,
  HelpCircle,
  CheckSquare
} from 'lucide-react'
import { WorkflowProgressTracker, WorkflowStage } from '@/components/ui/workflow-progress-tracker'
import { DocumentRequirement } from '@/components/ui/document-checklist-card'
import { DocumentUploadZone } from '@/components/ui/document-upload-zone'
import { EnhancedDocumentUpload } from '@/components/ui/enhanced-document-upload'
import { OriginalDocumentsStatus } from '@/components/client/original-documents-status'
import { calculateApplicationProgress } from '@/lib/utils/progress-calculation'
import Link from 'next/link'

interface ApplicationWorkflow {
  id: string
  templateName: string
  description: string
  totalStages: number
  estimatedTimeMonths: number
  currentStageId: string
  overallProgress: number
  status: string
  startedAt: string | null
  completedAt: string | null
  stages: WorkflowStage[]
}

interface Application {
  id: string
  applicationNumber: string
  status: string
  createdAt: string
  program: {
    countryName: string
    programName: string
    programType: string
  }
  assignedAdvisor: {
    id: string
    name: string
    email: string
  } | null
}

export default function ClientApplicationPage() {
  const { client, isLoading } = useClientAuth()
  const params = useParams()
  const router = useRouter()
  const applicationId = params.id as string
  
  const [application, setApplication] = useState<Application | null>(null)
  const [workflow, setWorkflow] = useState<ApplicationWorkflow | null>(null)
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('progress')
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  // Memoize localStorage access for performance
  const authToken = useMemo(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('clientToken') : null
  }, [])

  const fetchApplicationData = useCallback(async () => {
    try {
      console.log('fetchApplicationData started')
      setLoading(true)
      
      // Use memoized token for authentication
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
      
      // Parallel API calls for better performance
      const [appResponse, workflowResponse, reqResponse] = await Promise.all([
        fetch(`/api/client/applications/${applicationId}`, { headers }),
        fetch(`/api/client/applications/${applicationId}/workflow`, { headers }),
        fetch(`/api/client/applications/${applicationId}/documents/requirements`, { headers })
      ])

      // Process application data
      if (appResponse.ok) {
        const appData = await appResponse.json()
        setApplication(appData)
      } else {
        const errorText = await appResponse.text()
        console.error('Application API error:', appResponse.status, errorText)
        let errorMsg = 'Failed to load application data'
        try {
          const errorJson = JSON.parse(errorText)
          errorMsg = errorJson.details || errorJson.error || errorText
        } catch {
          errorMsg = errorText
        }
        setError(`Failed to load application: ${errorMsg}`)
        return
      }

      // Process workflow data (optional)
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        setWorkflow(workflowData)
      } else {
        const errorText = await workflowResponse.text()
        console.error('Workflow API error:', workflowResponse.status, errorText)
        // Don't return here - workflow might be optional
      }

      // Process document requirements (optional)
      if (reqResponse.ok) {
        const reqData = await reqResponse.json()
        console.log('Requirements API response:', reqData)
        const allRequirements = reqData.stages?.flatMap((stage: any) => stage.requirements) || []
        console.log('Flattened requirements:', allRequirements)
        console.log('Sample requirement:', allRequirements[0])
        setRequirements(allRequirements)
      } else {
        const errorText = await reqResponse.text()
        console.error('Requirements API error:', reqResponse.status, errorText)
        console.log('Will use mock requirements instead')
        // Don't return here - requirements might be optional
      }

    } catch (err) {
      console.error('Error fetching application data:', err)
      setError('Failed to load application data')
    } finally {
      console.log('fetchApplicationData completed, setting loading to false')
      setLoading(false)
    }
  }, [applicationId, authToken])

  useEffect(() => {
    if (client) {
      fetchApplicationData()
    }
  }, [client, applicationId, fetchApplicationData])

  // Memoized document status calculations for performance
  const documentStats = useMemo(() => {
    if (!requirements || requirements.length === 0) {
      return {
        actionRequired: 0,
        underReview: 0,
        approved: 0,
        total: 0,
        actionRequiredDocs: [],
        underReviewDocs: [],
        approvedDocs: []
      }
    }

    // Single pass through requirements array
    const stats = requirements.reduce((acc, req) => {
      acc.total++
      
      if (req.status === 'pending' || req.status === 'rejected') {
        acc.actionRequired++
        acc.actionRequiredDocs.push(req)
      } else if (req.status === 'submitted' || req.status === 'under_review') {
        acc.underReview++
        acc.underReviewDocs.push(req)
      } else if (req.status === 'approved') {
        acc.approved++
        acc.approvedDocs.push(req)
      }
      
      return acc
    }, {
      actionRequired: 0,
      underReview: 0,
      approved: 0,
      total: 0,
      actionRequiredDocs: [] as typeof requirements,
      underReviewDocs: [] as typeof requirements,
      approvedDocs: [] as typeof requirements
    })

    return stats
  }, [requirements])

  const handleDocumentUpload = async (files: File[], requirementId: string) => {
    try {
      setUploading(true)
      console.log('=== DOCUMENT UPLOAD STARTED ===')
      console.log('Starting document upload:', { 
        files, 
        filesType: typeof files, 
        isArray: Array.isArray(files),
        requirementId 
      })
      
      // Convert to array if it's not already
      const fileArray = Array.isArray(files) ? files : [files]
      console.log('File array:', fileArray.map((f, i) => ({
        index: i,
        name: f?.name,
        size: f?.size,
        type: f?.type,
        isFile: f instanceof File,
        isBlob: f instanceof Blob,
        constructor: f?.constructor?.name
      })))
      
      const headers = authToken ? { 'Authorization': `Bearer ${authToken}` } : {}

      for (const file of fileArray) {
        console.log('Processing file:', {
          name: file?.name,
          size: file?.size,
          type: file?.type,
          isFile: file instanceof File,
          isBlob: file instanceof Blob,
          constructor: file?.constructor?.name,
          prototype: Object.getPrototypeOf(file)?.constructor?.name
        })
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('requirementId', requirementId)
        formData.append('replaceExisting', 'true')
        
        console.log('FormData created, checking contents:')
        for (const [key, value] of formData.entries()) {
          console.log(`- ${key}:`, typeof value, value instanceof File ? `File(${value.name})` : value)
        }

        // For FormData, don't set Content-Type header - let browser set it automatically
        const requestHeaders = { ...headers }
        delete requestHeaders['Content-Type'] // Remove if it exists
        
        console.log('Making fetch request with headers:', requestHeaders)
        
        const response = await fetch(`/api/client/applications/${applicationId}/documents/upload`, {
          method: 'POST',
          headers: requestHeaders,
          body: formData
        })

        console.log('Upload response status:', response.status)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('Upload failed with status:', response.status, 'Error:', errorText)
          
          let errorMessage = 'Upload failed'
          try {
            const errorJson = JSON.parse(errorText)
            if (errorJson.error?.includes('already exists')) {
              errorMessage = 'Document already exists for this requirement. Please try again.'
            } else {
              errorMessage = errorJson.error || errorText
            }
          } catch {
            errorMessage = errorText || `Upload failed with status ${response.status}`
          }
          
          throw new Error(errorMessage)
        }

        const result = await response.json()
        console.log('Upload successful:', result)
      }
      
      console.log('=== REFRESHING APPLICATION DATA AFTER UPLOAD ===')
      await fetchApplicationData() // Refresh data
      console.log('=== UPLOAD COMPLETED SUCCESSFULLY - DATA REFRESHED ===')
    } catch (err) {
      console.error('Error uploading document:', err)
      // TODO: Show user-friendly error message
      alert(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
      console.log('=== UPLOAD PROCESS COMPLETED ===')
    }
  }


  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {uploading ? 'Uploading document...' : 'Loading your application...'}
          </p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  if (error || !application) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Application</h3>
        <p className="text-gray-600 mb-4">{error || 'Application data not found'}</p>
        <Link href="/client/dashboard/applications">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Link>
      </div>
    )
  }

  // Mock workflow data if not available (for demo purposes)
  const mockWorkflow: ApplicationWorkflow = {
    id: 'mock-workflow',
    templateName: 'St. Kitts Citizenship Process',
    description: 'Complete citizenship by investment workflow',
    totalStages: 6,
    estimatedTimeMonths: 6,
    currentStageId: 'stage-1',
    overallProgress: 5, // More realistic starting progress
    status: 'in_progress',
    startedAt: new Date().toISOString(),
    completedAt: null,
    stages: [
      {
        id: 'stage-1',
        stageOrder: 1,
        stageName: 'Initial Documentation',
        description: 'Submit personal and identity documents',
        estimatedDays: 14,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        progress: 25,
        documentCount: 8,
        completedDocuments: 2
      },
      {
        id: 'stage-2',
        stageOrder: 2,
        stageName: 'Financial Documentation',
        description: 'Provide proof of funds and financial records',
        estimatedDays: 21,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        status: 'pending',
        progress: 0,
        documentCount: 6,
        completedDocuments: 0
      },
      {
        id: 'stage-3',
        stageOrder: 3,
        stageName: 'Due Diligence',
        description: 'Background checks and compliance verification',
        estimatedDays: 30,
        isRequired: true,
        canSkip: false,
        autoProgress: true,
        status: 'pending',
        progress: 0,
        documentCount: 4,
        completedDocuments: 0
      },
      {
        id: 'stage-4',
        stageOrder: 4,
        stageName: 'Investment Selection',
        description: 'Choose and document investment option',
        estimatedDays: 14,
        isRequired: true,
        canSkip: false,
        autoProgress: false,
        status: 'pending',
        progress: 0,
        documentCount: 5,
        completedDocuments: 0
      },
      {
        id: 'stage-5',
        stageOrder: 5,
        stageName: 'Government Submission',
        description: 'Official application submission to St. Kitts CIU',
        estimatedDays: 7,
        isRequired: true,
        canSkip: false,
        autoProgress: true,
        status: 'pending',
        progress: 0,
        documentCount: 2,
        completedDocuments: 0
      },
      {
        id: 'stage-6',
        stageOrder: 6,
        stageName: 'Citizenship Completion',
        description: 'Passport issuance and final documentation',
        estimatedDays: 30,
        isRequired: true,
        canSkip: false,
        autoProgress: true,
        status: 'pending',
        progress: 0,
        documentCount: 3,
        completedDocuments: 0
      }
    ]
  }

  const workflowData = workflow || mockWorkflow
  const currentStage = workflowData.stages.find(s => s.id === workflowData.currentStageId)
  const completedStages = workflowData.stages.filter(s => s.status === 'completed').length
  
  // Calculate consistent progress using the shared utility (only after requirements are loaded)
  const applicationProgressData = calculateApplicationProgress({
    status: application.status,
    submittedAt: null, // Not available in this interface
    workflowProgress: workflowData.overallProgress,
    completedStages,
    totalStages: workflowData.totalStages,
    documentsApproved: documentStats.approved,
    totalDocuments: documentStats.total
  })
  
  console.log('Workflow data:', {
    hasRealWorkflow: !!workflow,
    usingMock: !workflow,
    stageCount: workflowData.stages.length,
    stageIds: workflowData.stages.map(s => ({ id: s.id, name: s.stageName }))
  })

  const requirementsData = requirements
  console.log('Requirements data decision:', {
    realRequirementsCount: requirements.length,
    selectedData: requirementsData.map(r => ({ id: r.id, name: r.documentName, isUUID: /^[0-9a-f-]{36}$/i.test(r.id) }))
  })

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {application.program.programName}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {application.program.countryName}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            Application #{application.applicationNumber}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={workflowData.status === 'completed' ? 'default' : 'secondary'}>
            {workflowData.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button onClick={fetchApplicationData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/client/dashboard/applications">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Link>
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      <Card className="border border-gray-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                Application Progress
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {completedStages} of {workflowData.totalStages} stages completed • 
                Current: {currentStage?.stageName || 'Getting Started'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{applicationProgressData.progress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-900">Est. Timeline</div>
              <div className="text-sm text-blue-700">{workflowData.estimatedTimeMonths} months</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-900">Documents</div>
              <div className="text-sm text-green-700">
                {requirementsData.length === 0 ? 'Loading...' : 
                 `${requirementsData.filter(r => r.status === 'approved').length} of ${requirementsData.length} approved`}
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <MessageSquare className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-900">Advisor</div>
              <div className="text-sm text-purple-700">
                {application.assignedAdvisor?.name || 'Assigned Soon'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="progress">My Progress</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          {/* Clean Workflow Progress Tracker */}
          <WorkflowProgressTracker
            stages={workflowData.stages}
            currentStageId={workflowData.currentStageId}
            showTimeline={true}
          />

          {/* Current Stage Summary */}
          {currentStage && (
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle>Current Stage: {currentStage.stageName}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <p className="text-blue-800 mb-3">{currentStage.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-blue-700">
                      Progress: {currentStage.progress}%
                    </span>
                    <span className="text-sm text-blue-700">
                      Est. {currentStage.estimatedDays} days
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Action Required</h4>
                    <div className="space-y-3">
                      {requirementsData.length === 0 ? (
                        <div className="flex items-center text-gray-500">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Loading document requirements...
                        </div>
                      ) : (
                        <>
                          {documentStats.actionRequiredDocs
                            .slice(0, 3)
                            .map((req) => (
                              <div key={req.id} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                                <div className="flex items-center">
                                  <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                                  <span className="text-sm text-gray-700">Upload {req.documentName}</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setActiveTab('documents')}
                                  className="text-xs px-2 py-1"
                                >
                                  Upload
                                </Button>
                              </div>
                            ))}
                          {documentStats.actionRequired === 0 && (
                            <div className="flex items-center text-green-600 p-2 bg-green-50 rounded-lg">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              <span className="text-sm">All documents submitted</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Recent Activity</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      <li className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        Passport approved
                      </li>
                      <li className="flex items-center">
                        <Clock className="h-4 w-4 text-blue-500 mr-2" />
                        Bank statements under review
                      </li>
                      <li className="flex items-center">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        Background check rejected
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckSquare className="h-5 w-5 mr-2 text-blue-600" />
                Quick Actions
              </CardTitle>
              <p className="text-sm text-gray-600">Take immediate action to keep your application moving forward</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Upload Documents Action */}
                {documentStats.actionRequired > 0 && (
                  <Button 
                    onClick={() => setActiveTab('documents')}
                    className="h-20 flex-col space-y-2 bg-orange-500 hover:bg-orange-600"
                  >
                    <FileText className="h-6 w-6" />
                    <div className="text-center">
                      <div className="font-medium">Upload Documents</div>
                      <div className="text-xs opacity-90">
                        {documentStats.actionRequired} pending
                      </div>
                    </div>
                  </Button>
                )}

                {/* Contact Advisor Action */}
                <Button 
                  onClick={() => router.push('/client/dashboard/messages')}
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-blue-300 hover:bg-blue-50"
                >
                  <MessageSquare className="h-6 w-6 text-blue-600" />
                  <div className="text-center">
                    <div className="font-medium text-blue-600">Contact Advisor</div>
                    <div className="text-xs text-blue-500">
                      {application.assignedAdvisor?.name || 'Get Help'}
                    </div>
                  </div>
                </Button>

                {/* View All Documents */}
                <Button 
                  onClick={() => setActiveTab('documents')}
                  variant="outline"
                  className="h-20 flex-col space-y-2 border-green-300 hover:bg-green-50"
                >
                  <FileText className="h-6 w-6 text-green-600" />
                  <div className="text-center">
                    <div className="font-medium text-green-600">View All Documents</div>
                    <div className="text-xs text-green-500">
                      {documentStats.approved} approved
                    </div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {requirementsData.length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Document Requirements</h3>
                <p className="text-gray-600 text-center max-w-md">
                  We&apos;re loading your document requirements. If this takes too long, please refresh the page or contact your advisor.
                </p>
                <Button onClick={fetchApplicationData} variant="outline" className="mt-4">
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Document Status Overview */}
              <Card className="border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-600" />
                    Document Overview
                  </CardTitle>
                  <p className="text-sm text-gray-600">Track the status of all your application documents</p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="text-2xl font-bold text-red-700">
                        {documentStats.actionRequired}
                      </div>
                      <div className="text-sm text-red-600 font-medium">Action Required</div>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="text-2xl font-bold text-yellow-700">
                        {documentStats.underReview}
                      </div>
                      <div className="text-sm text-yellow-600 font-medium">Under Review</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="text-2xl font-bold text-green-700">
                        {documentStats.approved}
                      </div>
                      <div className="text-sm text-green-600 font-medium">Approved</div>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="text-2xl font-bold text-blue-700">
                        {documentStats.total}
                      </div>
                      <div className="text-sm text-blue-600 font-medium">Total Documents</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Action Required Documents */}
              {documentStats.actionRequired > 0 && (
                <Card className="border border-red-200 bg-red-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-700">
                      <AlertCircle className="h-5 w-5 mr-2" />
                      Action Required ({documentStats.actionRequired})
                    </CardTitle>
                    <p className="text-sm text-red-600">These documents need your immediate attention</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documentStats.actionRequiredDocs.map(requirement => (
                          <EnhancedDocumentUpload
                            key={requirement.id}
                            requirement={requirement}
                            onUpload={async (file) => {
                              const formData = new FormData()
                              formData.append('file', file)
                              formData.append('requirementId', requirement.id)
                              formData.append('replaceExisting', 'true')
                              
                              try {
                                setUploading(true)
                                const token = localStorage.getItem('clientToken')
                                const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
                                
                                const response = await fetch(`/api/client/applications/${applicationId}/documents/upload`, {
                                  method: 'POST',
                                  headers,
                                  body: formData
                                })
                                
                                if (!response.ok) {
                                  const errorData = await response.json()
                                  throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
                                }
                                
                                await fetchApplicationData()
                              } catch (err) {
                                console.error('Enhanced upload error:', err)
                                throw err
                              } finally {
                                setUploading(false)
                              }
                            }}
                            onView={() => {
                              if (requirement.fileName) {
                                window.open(`/api/client/applications/${applicationId}/documents/${requirement.id}/download`, '_blank')
                              }
                            }}
                            canUpload={true}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Under Review Documents */}
              {documentStats.underReview > 0 && (
                <Card className="border border-yellow-200 bg-yellow-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-yellow-700">
                      <Clock className="h-5 w-5 mr-2" />
                      Under Review ({documentStats.underReview})
                    </CardTitle>
                    <p className="text-sm text-yellow-600">These documents are being reviewed by your advisor</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documentStats.underReviewDocs.map(requirement => (
                          <EnhancedDocumentUpload
                            key={requirement.id}
                            requirement={requirement}
                            onUpload={async (file) => {
                              const formData = new FormData()
                              formData.append('file', file)
                              formData.append('requirementId', requirement.id)
                              formData.append('replaceExisting', 'true')
                              
                              try {
                                setUploading(true)
                                const token = localStorage.getItem('clientToken')
                                const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
                                
                                const response = await fetch(`/api/client/applications/${applicationId}/documents/upload`, {
                                  method: 'POST',
                                  headers,
                                  body: formData
                                })
                                
                                if (!response.ok) {
                                  const errorData = await response.json()
                                  throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
                                }
                                
                                await fetchApplicationData()
                              } catch (err) {
                                console.error('Enhanced upload error:', err)
                                throw err
                              } finally {
                                setUploading(false)
                              }
                            }}
                            onView={() => {
                              if (requirement.fileName) {
                                window.open(`/api/client/applications/${applicationId}/documents/${requirement.id}/download`, '_blank')
                              }
                            }}
                            canUpload={true}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Approved Documents */}
              {documentStats.approved > 0 && (
                <Card className="border border-green-200 bg-green-50/30">
                  <CardHeader>
                    <CardTitle className="flex items-center text-green-700">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Approved Documents ({documentStats.approved})
                    </CardTitle>
                    <p className="text-sm text-green-600">These documents have been approved by your advisor</p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {documentStats.approvedDocs.map(requirement => (
                          <EnhancedDocumentUpload
                            key={requirement.id}
                            requirement={requirement}
                            onUpload={async (file) => {
                              const formData = new FormData()
                              formData.append('file', file)
                              formData.append('requirementId', requirement.id)
                              formData.append('replaceExisting', 'true')
                              
                              try {
                                setUploading(true)
                                const token = localStorage.getItem('clientToken')
                                const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
                                
                                const response = await fetch(`/api/client/applications/${applicationId}/documents/upload`, {
                                  method: 'POST',
                                  headers,
                                  body: formData
                                })
                                
                                if (!response.ok) {
                                  const errorData = await response.json()
                                  throw new Error(errorData.error || `Upload failed with status: ${response.status}`)
                                }
                                
                                await fetchApplicationData()
                              } catch (err) {
                                console.error('Enhanced upload error:', err)
                                throw err
                              } finally {
                                setUploading(false)
                              }
                            }}
                            onView={() => {
                              if (requirement.fileName) {
                                window.open(`/api/client/applications/${applicationId}/documents/${requirement.id}/download`, '_blank')
                              }
                            }}
                            canUpload={true}
                          />
                        ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Original Documents Status */}
              <OriginalDocumentsStatus applicationId={applicationId} />

              {/* General Upload Area */}
              {documentStats.actionRequired > 0 && (
                <Card className="border border-gray-200">
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-gray-600" />
                      Quick Upload
                    </CardTitle>
                    <p className="text-sm text-gray-600">
                      Drag and drop files here for quick upload to pending requirements
                    </p>
                  </CardHeader>
                  <CardContent>
                    <DocumentUploadZone
                      acceptedFormats={['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']}
                      maxFileSizeMB={10}
                      multiple={true}
                      onFilesSelected={(files) => {
                        if (requirementsData.length === 0) {
                          alert('No document requirements are loaded yet. Please wait for the requirements to load or refresh the page.')
                          return
                        }
                        
                        // Use the first pending requirement from optimized data
                        const pendingRequirement = documentStats.actionRequiredDocs[0]
                        if (!pendingRequirement) {
                          alert('No pending document requirements found.')
                          return
                        }
                        
                        handleDocumentUpload(files, pendingRequirement.id)
                      }}
                      className="mb-4"
                    />
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

      </Tabs>
    </div>
  )
}