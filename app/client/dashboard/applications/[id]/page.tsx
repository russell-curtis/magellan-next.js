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
  Upload,
  Download,
  MessageSquare,
  HelpCircle
} from 'lucide-react'
import { WorkflowProgressTracker, WorkflowStage } from '@/components/ui/workflow-progress-tracker'
import { DocumentChecklistCard, DocumentRequirement } from '@/components/ui/document-checklist-card'
import { DocumentUploadZone } from '@/components/ui/document-upload-zone'
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
        const allRequirements = reqData.stages?.flatMap((stage: any) => stage.requirements) || []
        setRequirements(allRequirements)
      } else {
        const errorText = await reqResponse.text()
        console.error('Requirements API error:', reqResponse.status, errorText)
        // Don't return here - requirements might be optional
      }

    } catch (err) {
      console.error('Error fetching application data:', err)
      setError('Failed to load application data')
    } finally {
      setLoading(false)
    }
  }

  const handleDocumentUpload = async (files: File[], requirementId: string) => {
    try {
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('requirementId', requirementId)

        const response = await fetch(`/api/client/applications/${applicationId}/documents/upload`, {
          method: 'POST',
          headers,
          body: formData
        })

        if (!response.ok) {
          throw new Error('Upload failed')
        }
      }
      
      await fetchApplicationData() // Refresh data
    } catch (err) {
      console.error('Error uploading document:', err)
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your application...</p>
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

  // Mock requirements data
  const mockRequirements: DocumentRequirement[] = [
    {
      id: 'req-1',
      documentName: 'Passport Copy',
      description: 'Certified copy of valid passport',
      category: 'personal',
      isRequired: true,
      isClientUploadable: true,
      acceptedFormats: ['pdf', 'jpg', 'png'],
      maxFileSizeMB: 5,
      expirationMonths: null,
      displayGroup: 'Identity Documents',
      helpText: 'Upload a clear, color copy of your passport main page',
      sortOrder: 1,
      status: 'approved',
      uploadedAt: new Date().toISOString(),
      fileName: 'passport-john-doe.pdf'
    },
    {
      id: 'req-2',
      documentName: 'Bank Statements',
      description: 'Last 3 months of bank statements',
      category: 'financial',
      isRequired: true,
      isClientUploadable: true,
      acceptedFormats: ['pdf'],
      maxFileSizeMB: 10,
      expirationMonths: 3,
      displayGroup: 'Financial Documents',
      helpText: 'Provide official bank statements showing sufficient funds',
      sortOrder: 2,
      status: 'under_review',
      uploadedAt: new Date().toISOString(),
      fileName: 'bank-statements-q4-2024.pdf'
    },
    {
      id: 'req-3',
      documentName: 'Source of Funds Letter',
      description: 'Detailed explanation of income source',
      category: 'financial',
      isRequired: true,
      isClientUploadable: true,
      acceptedFormats: ['pdf', 'doc', 'docx'],
      maxFileSizeMB: 5,
      expirationMonths: null,
      displayGroup: 'Financial Documents',
      helpText: 'Letter from your bank or employer confirming income source',
      sortOrder: 3,
      status: 'pending'
    },
    {
      id: 'req-4',
      documentName: 'Criminal Background Check',
      description: 'Police clearance certificate from country of residence',
      category: 'legal',
      isRequired: true,
      isClientUploadable: true,
      acceptedFormats: ['pdf'],
      maxFileSizeMB: 5,
      expirationMonths: 6,
      displayGroup: 'Legal Documents',
      helpText: 'Must be apostilled and not older than 6 months',
      sortOrder: 4,
      status: 'rejected',
      rejectionReason: 'Document is older than 6 months'
    }
  ]

  const requirementsData = requirements.length > 0 ? requirements : mockRequirements

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/client/dashboard/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              My Applications
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {application.program.programName}
            </h1>
            <p className="text-gray-600">
              Application #{application.applicationNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={workflowData.status === 'completed' ? 'default' : 'secondary'}>
            {workflowData.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button onClick={fetchApplicationData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
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
                {requirementsData.filter(r => r.status === 'approved').length} of {requirementsData.length} approved
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
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="progress">Progress Overview</TabsTrigger>
          <TabsTrigger value="documents">My Documents</TabsTrigger>
          <TabsTrigger value="upload">Upload Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Your Citizenship Journey</CardTitle>
              <p className="text-sm text-gray-600">
                Track your progress through the {application.program.programName} process
              </p>
            </CardHeader>
            <CardContent>
              <WorkflowProgressTracker
                stages={workflowData.stages}
                currentStageId={workflowData.currentStageId}
                showTimeline={true}
                className="mt-4"
              />
            </CardContent>
          </Card>

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
          {workflowData.stages.map((stage) => {
            const stageRequirements = requirementsData.filter(req => 
              stage.stageOrder === 1 ? req.category === 'personal' :
              stage.stageOrder === 2 ? req.category === 'financial' :
              stage.stageOrder === 3 ? req.category === 'legal' :
              req.category === 'investment'
            )

            if (stageRequirements.length === 0) return null

            return (
              <DocumentChecklistCard
                key={stage.id}
                requirements={stageRequirements}
                stageTitle={stage.stageName}
                stageDescription={stage.description}
                isCurrentStage={stage.id === workflowData.currentStageId}
                canUpload={stage.status !== 'completed'}
                onUpload={(files, requirementId) => handleDocumentUpload(files, requirementId)}
                onView={(documentId) => {
                  window.open(`/api/client/applications/${applicationId}/documents/${documentId}/download`, '_blank')
                }}
              />
            )
          })}
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
                  console.log('Files selected:', files)
                }}
                className="mb-6"
              >
                <div className="text-center py-12">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (max 10MB each)
                  </p>
                </div>
              </DocumentUploadZone>

              {/* Outstanding Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Outstanding Requirements</h3>
                {requirementsData
                  .filter(req => req.status === 'pending' || req.status === 'rejected')
                  .map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <h4 className="font-medium text-gray-900">{req.documentName}</h4>
                          {req.status === 'rejected' && (
                            <Badge variant="destructive" className="ml-2">Rejected</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                        {req.rejectionReason && (
                          <p className="text-sm text-red-600 mb-2">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            {req.rejectionReason}
                          </p>
                        )}
                        <div className="flex items-center space-x-2">
                          <Badge variant={req.isRequired ? 'destructive' : 'secondary'}>
                            {req.isRequired ? 'Required' : 'Optional'}
                          </Badge>
                          <Badge variant="outline">
                            {req.acceptedFormats.join(', ').toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            Max {req.maxFileSizeMB}MB
                          </Badge>
                        </div>
                        {req.helpText && (
                          <p className="text-xs text-gray-500 mt-2 flex items-center">
                            <HelpCircle className="h-3 w-3 mr-1" />
                            {req.helpText}
                          </p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleDocumentUpload([], req.id)}
                        className="ml-4"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {req.status === 'rejected' ? 'Resubmit' : 'Upload'}
                      </Button>
                    </div>
                  ))}

                {requirementsData.filter(req => req.status === 'pending' || req.status === 'rejected').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                    <p className="font-medium">All Required Documents Submitted</p>
                    <p className="text-sm">Your advisor will review them shortly</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}