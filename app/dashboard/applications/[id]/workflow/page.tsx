'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  ArrowLeft, 
  FileText, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertCircle,
  RefreshCcw,
  Download,
  MessageSquare
} from 'lucide-react'
import { WorkflowProgressTracker, WorkflowStage } from '@/components/ui/workflow-progress-tracker'
import { DocumentChecklistCard, DocumentRequirement } from '@/components/ui/document-checklist-card'
import { DocumentUploadZone } from '@/components/ui/document-upload-zone'
import { DocumentReviewInterface } from '@/components/ui/document-review-interface'
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
  client: {
    firstName: string
    lastName: string
    email: string
  }
  program: {
    countryName: string
    programName: string
    programType: string
  }
}

export default function ApplicationWorkflowPage() {
  const params = useParams()
  const applicationId = params.id as string
  
  const [application, setApplication] = useState<Application | null>(null)
  const [workflow, setWorkflow] = useState<ApplicationWorkflow | null>(null)
  const [requirements, setRequirements] = useState<DocumentRequirement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    fetchApplicationData()
  }, [applicationId])

  const fetchApplicationData = async () => {
    try {
      setLoading(true)
      
      // Fetch application details
      const appResponse = await fetch(`/api/applications/${applicationId}`)
      if (appResponse.ok) {
        const appData = await appResponse.json()
        setApplication(appData)
      }

      // Fetch workflow data
      const workflowResponse = await fetch(`/api/applications/${applicationId}/workflow`)
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        setWorkflow(workflowData)
      } else {
        const errorText = await workflowResponse.text()
        console.error('Workflow API error:', workflowResponse.status, errorText)
        let errorMsg = 'Failed to load workflow data'
        try {
          const errorJson = JSON.parse(errorText)
          errorMsg = errorJson.details || errorJson.error || errorText
        } catch {
          errorMsg = errorText
        }
        setError(`Failed to load workflow: ${errorMsg}`)
        return
      }

      // Fetch document requirements
      const reqResponse = await fetch(`/api/applications/${applicationId}/documents/requirements`)
      if (reqResponse.ok) {
        const reqData = await reqResponse.json()
        // Flatten the stages structure to get all requirements
        const allRequirements = reqData.stages?.flatMap((stage: any) => stage.requirements) || []
        setRequirements(allRequirements)
      }

    } catch (err) {
      console.error('Error fetching application data:', err)
      setError('Failed to load application data')
    } finally {
      setLoading(false)
    }
  }

  const handleStageUpdate = async (stageId: string, status: string, progress?: number) => {
    try {
      const response = await fetch(`/api/applications/${applicationId}/workflow`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageId, status, progress })
      })

      if (response.ok) {
        await fetchApplicationData() // Refresh data
      }
    } catch (err) {
      console.error('Error updating stage:', err)
    }
  }

  const handleDocumentUpload = async (files: File[], requirementId: string) => {
    try {
      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('requirementId', requirementId)

        const response = await fetch(`/api/applications/${applicationId}/documents/upload`, {
          method: 'POST',
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workflow...</p>
        </div>
      </div>
    )
  }

  if (error || !application || !workflow) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Workflow</h3>
        <p className="text-gray-600 mb-4">{error || 'Application or workflow data not found'}</p>
        <Link href="/dashboard/applications">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Applications
          </Button>
        </Link>
      </div>
    )
  }

  const currentStage = workflow.stages.find(s => s.id === workflow.currentStageId)
  const completedStages = workflow.stages.filter(s => s.status === 'completed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/dashboard/applications">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Applications
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {application.program.programName}
            </h1>
            <p className="text-gray-600">
              Application #{application.applicationNumber} • {application.client.firstName} {application.client.lastName}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
            {workflow.status.replace('_', ' ').toUpperCase()}
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
                Workflow Progress
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {completedStages} of {workflow.totalStages} stages completed • 
                Stage: {currentStage?.stageName || 'Not Started'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{workflow.overallProgress}%</div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-900">Est. Timeline</div>
              <div className="text-sm text-blue-700">{workflow.estimatedTimeMonths} months</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-900">Documents</div>
              <div className="text-sm text-green-700">
                {requirements.filter(r => r.status === 'approved').length} of {requirements.length} approved
              </div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-900">Client</div>
              <div className="text-sm text-purple-700">{application.client.firstName} {application.client.lastName}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Workflow Overview</TabsTrigger>
          <TabsTrigger value="documents">Document Management</TabsTrigger>
          <TabsTrigger value="uploads">Upload Center</TabsTrigger>
          <TabsTrigger value="reviews">Document Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>St. Kitts Citizenship Workflow Stages</CardTitle>
              <p className="text-sm text-gray-600">
                Track progress through each stage of the {application.program.programName} process
              </p>
            </CardHeader>
            <CardContent>
              <WorkflowProgressTracker
                stages={workflow.stages}
                currentStageId={workflow.currentStageId}
                showTimeline={true}
                className="mt-4"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {workflow.stages.map((stage) => {
            const stageRequirements = requirements.filter(req => 
              // For demo purposes, distribute requirements across stages
              stage.stageOrder === 1 ? req.category === 'personal' :
              stage.stageOrder === 2 ? req.category === 'financial' :
              stage.stageOrder === 3 ? req.category === 'legal' :
              stage.stageOrder === 4 ? req.category === 'investment' :
              stage.stageOrder === 5 ? req.category === 'medical' :
              req.category === 'other'
            )

            if (stageRequirements.length === 0) return null

            return (
              <DocumentChecklistCard
                key={stage.id}
                requirements={stageRequirements}
                stageTitle={stage.stageName}
                stageDescription={stage.description}
                isCurrentStage={stage.id === workflow.currentStageId}
                canUpload={stage.status !== 'completed'}
                onUpload={(files, requirementId) => handleDocumentUpload(files, requirementId)}
                onView={(documentId) => {
                  // Open document viewer
                  window.open(`/api/applications/${applicationId}/documents/${documentId}/download`, '_blank')
                }}
              />
            )
          })}
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload Center</CardTitle>
              <p className="text-sm text-gray-600">
                Upload documents for the current stage: {currentStage?.stageName}
              </p>
            </CardHeader>
            <CardContent>
              <DocumentUploadZone
                acceptedFormats={['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']}
                maxFileSizeMB={10}
                multiple={true}
                onFilesSelected={(files) => {
                  // For demo - would need requirement selection in real implementation
                  console.log('Files selected:', files)
                }}
                className="mb-6"
              >
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
                  <p className="text-gray-600 mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supported formats: PDF, JPG, PNG, DOC, DOCX (max 10MB each)
                  </p>
                </div>
              </DocumentUploadZone>

              {/* Pending Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900">Pending Requirements</h3>
                {requirements
                  .filter(req => req.status === 'pending' || req.status === 'rejected')
                  .map((req) => (
                    <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-900">{req.documentName}</h4>
                        <p className="text-sm text-gray-600">{req.description}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge variant={req.isRequired ? 'destructive' : 'secondary'}>
                            {req.isRequired ? 'Required' : 'Optional'}
                          </Badge>
                          <Badge variant="outline">
                            {req.category}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleDocumentUpload([], req.id)}
                        disabled={!req.isClientUploadable}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Upload
                      </Button>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviews" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Document Review Status</CardTitle>
              <p className="text-sm text-gray-600">
                Review and approve submitted documents
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {requirements
                  .filter(req => req.status === 'under_review' || req.status === 'uploaded')
                  .map((req) => (
                    <div key={req.id} className="border rounded-lg p-6">
                      <DocumentReviewInterface
                        document={{
                          id: req.id,
                          fileName: req.fileName || 'document.pdf',
                          originalName: req.fileName || 'document.pdf',
                          fileSize: req.fileSize || 1024000,
                          fileType: 'application/pdf',
                          filePath: `/documents/${req.id}`,
                          uploadedAt: req.uploadedAt || new Date().toISOString(),
                          requirement: {
                            id: req.id,
                            documentName: req.documentName,
                            description: req.description,
                            category: req.category,
                            isRequired: req.isRequired,
                            acceptedFormats: req.acceptedFormats,
                            maxFileSizeMB: req.maxFileSizeMB,
                            helpText: req.helpText
                          },
                          uploadedBy: {
                            id: 'client-id',
                            name: `${application.client.firstName} ${application.client.lastName}`,
                            email: application.client.email
                          },
                          currentStatus: req.status
                        }}
                        onApprove={(documentId, comments) => {
                          console.log('Approve document:', documentId, comments)
                          // Call review API
                        }}
                        onReject={(documentId, reason, comments) => {
                          console.log('Reject document:', documentId, reason, comments)
                          // Call review API
                        }}
                        onRequestClarification={(documentId, comments) => {
                          console.log('Request clarification:', documentId, comments)
                          // Call review API
                        }}
                        onViewDocument={(documentId) => {
                          window.open(`/api/applications/${applicationId}/documents/${documentId}/download`, '_blank')
                        }}
                        onDownloadDocument={(documentId) => {
                          window.open(`/api/applications/${applicationId}/documents/${documentId}/download?download=true`, '_blank')
                        }}
                      />
                    </div>
                  ))}

                {requirements.filter(req => req.status === 'under_review' || req.status === 'uploaded').length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No documents pending review</p>
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