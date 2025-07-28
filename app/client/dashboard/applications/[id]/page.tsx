'use client'

import { useState, useEffect } from 'react'
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
  HelpCircle
} from 'lucide-react'
import { WorkflowProgressTracker, WorkflowStage } from '@/components/ui/workflow-progress-tracker'
import { DocumentRequirement } from '@/components/ui/document-checklist-card'
import { DocumentUploadZone } from '@/components/ui/document-upload-zone'
import { EnhancedDocumentUpload } from '@/components/ui/enhanced-document-upload'
import { OriginalDocumentsStatus } from '@/components/client/original-documents-status'
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

  useEffect(() => {
    if (client) {
      fetchApplicationData()
    }
  }, [client, applicationId])

  const fetchApplicationData = async () => {
    try {
      console.log('fetchApplicationData started')
      setLoading(true)
      
      // Get client token for authentication
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      // Fetch application details
      const appResponse = await fetch(`/api/client/applications/${applicationId}`, { headers })
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

      // Fetch workflow data
      const workflowResponse = await fetch(`/api/client/applications/${applicationId}/workflow`, { headers })
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        setWorkflow(workflowData)
      } else {
        const errorText = await workflowResponse.text()
        console.error('Workflow API error:', workflowResponse.status, errorText)
        // Don't return here - workflow might be optional
      }

      // Fetch document requirements
      const reqResponse = await fetch(`/api/client/applications/${applicationId}/documents/requirements`, { headers })
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
  }

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
      
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

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
    currentStageId: 'stage-2',
    overallProgress: 35,
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
        status: 'completed',
        completedAt: new Date().toISOString(),
        progress: 100,
        documentCount: 8,
        completedDocuments: 8
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
        status: 'in_progress',
        startedAt: new Date().toISOString(),
        progress: 60,
        documentCount: 6,
        completedDocuments: 3
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
          <p className="text-gray-600 mt-1">
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
      <Card>
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
              <div className="text-2xl font-bold text-gray-900">{workflowData.overallProgress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-900">Est. Timeline</div>
              <div className="text-sm text-blue-700">{workflowData.estimatedTimeMonths} months</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-900">Documents</div>
              <div className="text-sm text-green-700">
                {requirementsData.length === 0 ? 'Loading...' : 
                 `${requirementsData.filter(r => r.status === 'approved').length} of ${requirementsData.length} approved`}
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Overview</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
          <TabsTrigger value="originals">Original Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <WorkflowProgressTracker
            stages={workflowData.stages}
            currentStageId={workflowData.currentStageId}
            showTimeline={true}
          />

          {/* Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle>What's Next?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentStage && (
                  <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                    <h3 className="font-semibold text-blue-900 mb-2">
                      Current Stage: {currentStage.stageName}
                    </h3>
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
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2">Pending Actions</h4>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {requirementsData.length === 0 ? (
                        <li className="flex items-center text-gray-500">
                          <HelpCircle className="h-4 w-4 mr-2" />
                          Loading document requirements...
                        </li>
                      ) : (
                        <>
                          {requirementsData
                            .filter(req => req.status === 'pending' || req.status === 'rejected')
                            .slice(0, 3)
                            .map((req) => (
                              <li key={req.id} className="flex items-center">
                                <AlertCircle className="h-4 w-4 text-orange-500 mr-2" />
                                Upload {req.documentName}
                              </li>
                            ))}
                          {requirementsData.filter(req => req.status === 'pending' || req.status === 'rejected').length === 0 && (
                            <li className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              All documents submitted
                            </li>
                          )}
                        </>
                      )}
                    </ul>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {requirementsData.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Document Requirements</h3>
                <p className="text-gray-600 text-center max-w-md">
                  We're loading your document requirements. If this takes too long, please refresh the page or contact your advisor.
                </p>
                <Button onClick={fetchApplicationData} variant="outline" className="mt-4">
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </CardContent>
            </Card>
          ) : (
            workflowData.stages.map((stage) => {
              // Find requirements that belong to this specific stage
              const stageRequirements = requirementsData.filter(req => req.stageId === stage.id)
              
              console.log(`Stage ${stage.stageName}:`, {
                stageId: stage.id,
                stageRequirements: stageRequirements.length,
                requirementIds: stageRequirements.map(r => r.id)
              })

              if (stageRequirements.length === 0) return null

              return (
                <div key={stage.id} className="space-y-6">
                  <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-900">{stage.stageName}</h3>
                    <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                  </div>
                  
                  {stageRequirements.map(requirement => (
                    <EnhancedDocumentUpload
                      key={requirement.id}
                      requirement={requirement}
                      onUpload={async (file, _validationResult) => {
                        // Create enhanced upload handler with correct requirement ID
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
                          
                          const result = await response.json()
                          console.log('Enhanced upload successful with quality validation:', {
                            fileName: result.fileName,
                            qualityScore: result.qualityValidation?.score,
                            issues: result.qualityValidation?.issues?.length || 0
                          })
                          
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
                      canUpload={stage.status !== 'completed'}
                    />
                  ))}
                </div>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="upload" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <p className="text-sm text-gray-600">
                Upload required documents for your application
              </p>
            </CardHeader>
            <CardContent>
              <DocumentUploadZone
                acceptedFormats={['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']}
                maxFileSizeMB={10}
                multiple={true}
                onFilesSelected={(files) => {
                  console.log('Upload attempt:', { 
                    filesCount: files.length, 
                    requirementsCount: requirementsData.length,
                    requirements: requirementsData.map(r => ({ id: r.id, name: r.documentName, status: r.status }))
                  })
                  
                  if (requirementsData.length === 0) {
                    alert('No document requirements are loaded yet. Please wait for the requirements to load or refresh the page.')
                    return
                  }
                  
                  if (files.length === 0) {
                    alert('No files selected.')
                    return
                  }
                  
                  // For general uploads, prefer Passport Copy (which accepts multiple formats) or any pending requirement
                  const passportRequirement = requirementsData.find(req => req.documentName === 'Passport Copy')
                  const pendingRequirement = requirementsData.find(req => req.status === 'pending')
                  const anyRequirement = requirementsData[0]
                  const targetRequirement = passportRequirement || pendingRequirement || anyRequirement
                  
                  if (!targetRequirement || !targetRequirement.id) {
                    alert('No valid document requirement found. Please contact your advisor.')
                    return
                  }
                  
                  // Validate that the requirement ID looks like a UUID
                  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                  if (!uuidRegex.test(targetRequirement.id)) {
                    console.error('Invalid requirement ID (not a UUID):', targetRequirement.id)
                    alert(`Cannot upload: Invalid requirement ID. Please refresh the page and try again.`)
                    return
                  }
                  
                  console.log('Using requirement:', {
                    id: targetRequirement.id,
                    name: targetRequirement.documentName,
                    status: targetRequirement.status
                  })
                  
                  handleDocumentUpload(files, targetRequirement.id)
                }}
                className="mb-6"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="originals" className="space-y-6">
          <OriginalDocumentsStatus applicationId={applicationId} />
        </TabsContent>
      </Tabs>
    </div>
  )
}