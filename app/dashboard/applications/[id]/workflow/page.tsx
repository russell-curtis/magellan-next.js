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
import { OriginalDocumentsDashboard } from '@/components/original-documents/original-documents-dashboard'
import { hasWorkflowAccess } from '@/lib/utils'
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
      console.log('=== FETCH APPLICATION DATA STARTED ===')
      setLoading(true)
      
      // Fetch application details
      console.log('Fetching application details...')
      const appResponse = await fetch(`/api/applications/${applicationId}`)
      console.log('Application API response:', appResponse.status)
      if (appResponse.ok) {
        const appData = await appResponse.json()
        console.log('Application data received:', appData ? 'success' : 'empty')
        setApplication(appData)
      } else {
        console.error('Application API failed:', appResponse.status)
      }

      // Fetch workflow data
      console.log('Fetching workflow data...')
      const workflowResponse = await fetch(`/api/applications/${applicationId}/workflow`)
      console.log('Workflow API response:', workflowResponse.status)
      if (workflowResponse.ok) {
        const workflowData = await workflowResponse.json()
        console.log('Workflow data received:', workflowData ? 'success' : 'empty')
        setWorkflow(workflowData)
      } else {
        const errorText = await workflowResponse.text()
        console.error('Workflow API error:', workflowResponse.status, errorText)
        // Don't set error and return - continue to fetch requirements
      }

      // Fetch document requirements
      console.log('Fetching document requirements...')
      const reqResponse = await fetch(`/api/applications/${applicationId}/documents/requirements`)
      console.log('Requirements API response:', reqResponse.status)
      if (reqResponse.ok) {
        const reqData = await reqResponse.json()
        console.log('Requirements data received:', reqData ? 'success' : 'empty')
        // Flatten the stages structure to get all requirements
        const allRequirements = reqData.stages?.flatMap((stage: any) => stage.requirements) || []
        console.log('Flattened requirements count:', allRequirements.length)
        setRequirements(allRequirements)
      } else {
        const errorText = await reqResponse.text()
        console.error('Requirements API error:', reqResponse.status, errorText)
      }

      console.log('=== FETCH APPLICATION DATA COMPLETED ===')

    } catch (err) {
      console.error('=== ERROR IN FETCH APPLICATION DATA ===', err)
      // Don't set error state as it might cause unwanted re-renders
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

  // Check if application has workflow access
  if (!hasWorkflowAccess(application.status)) {
    return (
      <div className="text-center py-12">
        <Clock className="h-12 w-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Workflow Not Available</h3>
        <p className="text-gray-600 mb-4">
          The workflow features are only available after the application has been started. 
          Please start the application first to access workflow management, document uploads, and tracking features.
        </p>
        <div className="space-y-2">
          <p className="text-sm text-gray-500">
            Application #{application.applicationNumber} • Status: Draft
          </p>
        </div>
        <div className="mt-6">
          <Link href="/dashboard/applications">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Applications
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const currentStage = workflow.stages.find(s => s.id === workflow.currentStageId)
  const completedStages = workflow.stages.filter(s => s.status === 'completed').length

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
            Application #{application.applicationNumber} • {application.client.firstName} {application.client.lastName}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Badge variant={workflow.status === 'completed' ? 'default' : 'secondary'}>
            {workflow.status.replace('_', ' ').toUpperCase()}
          </Badge>
          <Button onClick={fetchApplicationData} variant="outline" size="sm">
            <RefreshCcw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/applications">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <div className="font-semibold text-blue-900">Est. Timeline</div>
              <div className="text-sm text-blue-700">{workflow.estimatedTimeMonths} months</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <FileText className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <div className="font-semibold text-green-900">Documents</div>
              <div className="text-sm text-green-700">
                {requirements.filter(r => r.status === 'approved').length} of {requirements.length} approved
              </div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <div className="font-semibold text-purple-900">Client</div>
              <div className="text-sm text-purple-700">{application.client.firstName} {application.client.lastName}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Workflow Overview</TabsTrigger>
          <TabsTrigger value="documents">Document Management</TabsTrigger>
          <TabsTrigger value="uploads">Upload Center</TabsTrigger>
          <TabsTrigger value="reviews">Document Reviews</TabsTrigger>
          <TabsTrigger value="originals">Original Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <WorkflowProgressTracker
            stages={workflow.stages}
            currentStageId={workflow.currentStageId}
            showTimeline={true}
          />
        </TabsContent>

        <TabsContent value="documents" className="space-y-6">
          {workflow.stages.map((stage) => {
            // Find requirements that belong to this specific stage
            const stageRequirements = requirements.filter(req => req.stageId === stage.id)
            
            console.log(`Agent Documents Tab - Stage ${stage.stageName}:`, {
              stageId: stage.id,
              stageRequirements: stageRequirements.length,
              requirementIds: stageRequirements.map(r => r.id),
              withUploads: stageRequirements.filter(r => r.fileName).length
            })

            if (stageRequirements.length === 0) return null

            // Separate client-uploadable and agent-only documents
            const clientDocuments = stageRequirements.filter(req => req.isClientUploadable)
            const agentDocuments = stageRequirements.filter(req => !req.isClientUploadable)

            return (
              <div key={stage.id} className="space-y-4">
                {/* Agent Documents - Can Upload */}
                {agentDocuments.length > 0 && (
                  <DocumentChecklistCard
                    requirements={agentDocuments}
                    stageTitle={`${stage.stageName} - Agent Documents`}
                    stageDescription="Documents that you (the agent) need to prepare and upload"
                    isCurrentStage={stage.id === workflow.currentStageId}
                    canUpload={stage.status !== 'completed'}
                    onUpload={(files, requirementId) => handleDocumentUpload(files, requirementId)}
                    onView={(documentId) => {
                      window.open(`/api/applications/${applicationId}/documents/${documentId}/download`, '_blank')
                    }}
                  />
                )}

                {/* Client Documents - View Only */}
                {clientDocuments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-600" />
                        {stage.stageName} - Client Documents
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Documents that must be uploaded by the client. You can view and track their progress here.
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {clientDocuments.map((req) => (
                          <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-blue-50 border-blue-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium text-gray-900">{req.documentName}</h4>
                                <Badge variant={req.isRequired ? 'destructive' : 'secondary'}>
                                  {req.isRequired ? 'Required' : 'Optional'}
                                </Badge>
                                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                                  Client Upload
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline">{req.category}</Badge>
                                {req.fileName ? (
                                  <Badge className="bg-green-100 text-green-800 border-green-200">
                                    ✓ Uploaded
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                    Pending Client Upload
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {req.fileName && req.documentId ? (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => window.open(`/api/applications/${applicationId}/documents/${req.documentId}/download`, '_blank')}
                                >
                                  <FileText className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              ) : (
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  disabled
                                  className="text-muted-foreground"
                                >
                                  <Clock className="h-4 w-4 mr-2" />
                                  Awaiting Client
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </TabsContent>

        <TabsContent value="uploads" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Agent Document Upload Center</CardTitle>
              <p className="text-sm text-gray-600">
                Upload agent-prepared documents for the current stage: {currentStage?.stageName}
              </p>
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> This upload center is for agent-prepared documents only. 
                  Client documents must be uploaded by the client through their portal.
                </p>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                // Filter to only agent-uploadable documents that are pending
                const agentRequirements = requirements.filter(req => 
                  !req.isClientUploadable && 
                  (req.status === 'pending' || req.status === 'rejected')
                )

                if (agentRequirements.length === 0) {
                  return (
                    <div className="text-center py-12">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No Agent Documents Pending</h3>
                      <p className="text-gray-600 max-w-md mx-auto">
                        All agent-prepared documents for the current stage have been completed. 
                        Client documents are managed through the client portal.
                      </p>
                    </div>
                  )
                }

                return (
                  <>
                    <DocumentUploadZone
                      acceptedFormats={['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']}
                      maxFileSizeMB={10}
                      multiple={true}
                      onFilesSelected={(files) => {
                        // For demo - would need requirement selection in real implementation
                        console.log('Files selected for agent documents:', files)
                      }}
                      className="mb-6"
                    />

                    {/* Agent-Only Pending Requirements */}
                    <div className="space-y-4">
                      <h3 className="font-semibold text-gray-900">
                        Pending Agent Documents ({agentRequirements.length})
                      </h3>
                      {agentRequirements.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 border rounded-lg bg-green-50 border-green-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium text-gray-900">{req.documentName}</h4>
                              <Badge variant={req.isRequired ? 'destructive' : 'secondary'}>
                                {req.isRequired ? 'Required' : 'Optional'}
                              </Badge>
                              <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                Agent Document
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mb-2">{req.description}</p>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline">{req.category}</Badge>
                              {req.status === 'rejected' && (
                                <Badge variant="destructive">Rejected - Needs Reupload</Badge>
                              )}
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleDocumentUpload([], req.id)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Upload
                          </Button>
                        </div>
                      ))}
                    </div>
                  </>
                )
              })()}
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
                {(() => {
                  // Show documents that need review OR have been reviewed (for history)
                  const reviewableRequirements = requirements.filter(req => 
                    req.fileName && req.documentId && 
                    (req.status === 'under_review' || req.status === 'uploaded' || req.status === 'approved' || req.status === 'rejected')
                  )
                  console.log('Agent Reviews Tab - All requirements:', requirements.length)
                  console.log('Agent Reviews Tab - Documents for review/history:', reviewableRequirements.length)
                  console.log('Agent Reviews Tab - Document statuses:', reviewableRequirements.map(r => ({ 
                    id: r.id, 
                    documentId: r.documentId,
                    name: r.documentName, 
                    status: r.status, 
                    fileName: r.fileName,
                    uploadedAt: r.uploadedAt 
                  })))
                  return reviewableRequirements
                })().map((req) => (
                    <div key={req.id} className="border rounded-lg p-6">
                      <DocumentReviewInterface
                        document={{
                          id: req.id,
                          requirement: {
                            id: req.id,
                            documentName: req.documentName,
                            description: req.description,
                            category: req.category,
                            isRequired: req.isRequired,
                            acceptedFormats: req.acceptedFormats,
                            maxFileSizeMB: req.maxFileSizeMB,
                            helpText: req.helpText,
                            stageId: req.stageId,
                            status: req.status,
                            isClientUploadable: req.isClientUploadable,
                            expirationMonths: req.expirationMonths,
                            displayGroup: req.displayGroup,
                            sortOrder: req.sortOrder,
                            examples: req.examples,
                            validationRules: req.validationRules
                          },
                          file: {
                            id: req.documentId || req.id,
                            fileName: req.fileName || 'document.pdf',
                            fileSize: req.fileSize || 1024000,
                            fileType: 'application/pdf',
                            uploadedAt: req.uploadedAt || new Date().toISOString(),
                            uploadedBy: 'client',
                            url: `/api/applications/${applicationId}/documents/${req.documentId}/download`,
                            thumbnailUrl: undefined
                          },
                          review: {
                            id: req.status === 'approved' || req.status === 'rejected' ? 'completed-review' : 'pending-review',
                            documentId: req.documentId || req.id,
                            applicationId: applicationId,
                            requirementId: req.id,
                            status: req.status === 'under_review' || req.status === 'uploaded' ? 'pending' : req.status,
                            reviewedAt: req.status === 'approved' || req.status === 'rejected' ? new Date().toISOString() : undefined,
                            priority: 'medium' as const
                          },
                          client: {
                            id: 'client-id',
                            name: application?.client ? `${application.client.firstName} ${application.client.lastName}` : 'Client',
                            email: application?.client?.email || 'client@example.com'
                          },
                          application: {
                            id: applicationId,
                            programName: application?.program?.programName || 'St. Kitts Citizenship',
                            status: application?.status || 'in_progress'
                          }
                        }}
                        onApprove={async (documentId, comments) => {
                          try {
                            console.log('=== FRONTEND APPROVAL CALLED ===')
                            console.log('Document ID being sent:', documentId)
                            console.log('Application ID:', applicationId)
                            console.log('Comments:', comments)
                            console.log('Full requirement data:', req)
                            
                            const response = await fetch(`/api/applications/${applicationId}/documents/review`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                documentId,
                                action: 'approve',
                                comments
                              })
                            })
                            
                            console.log('Response received:', response.status, response.statusText)
                            
                            if (response.ok) {
                              const result = await response.json()
                              console.log('Approval successful:', result)
                              console.log('Refreshing application data...')
                              await fetchApplicationData() // Refresh data
                              console.log('Application data refreshed')
                            } else {
                              const errorText = await response.text()
                              console.error('Approve failed with status:', response.status)
                              console.error('Error response:', errorText)
                              console.error('Response headers:', Object.fromEntries(response.headers.entries()))
                              alert(`Approval failed: ${errorText}`)
                            }
                          } catch (err) {
                            console.error('Error approving document:', err)
                            alert(`Error approving document: ${err instanceof Error ? err.message : 'Unknown error'}`)
                          }
                        }}
                        onReject={async (documentId, reason, comments) => {
                          try {
                            const response = await fetch(`/api/applications/${applicationId}/documents/review`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                documentId,
                                action: 'reject',
                                reason,
                                comments
                              })
                            })
                            
                            if (response.ok) {
                              await fetchApplicationData() // Refresh data
                            } else {
                              const errorText = await response.text()
                              console.error('Reject failed:', errorText)
                            }
                          } catch (err) {
                            console.error('Error rejecting document:', err)
                          }
                        }}
                        onRequestClarification={async (documentId, comments) => {
                          try {
                            const response = await fetch(`/api/applications/${applicationId}/documents/review`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                documentId,
                                action: 'request_clarification',
                                comments
                              })
                            })
                            
                            if (response.ok) {
                              await fetchApplicationData() // Refresh data
                            } else {
                              const errorText = await response.text()
                              console.error('Request clarification failed:', errorText)
                            }
                          } catch (err) {
                            console.error('Error requesting clarification:', err)
                          }
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

        <TabsContent value="originals" className="space-y-6">
          <OriginalDocumentsDashboard 
            applicationId={applicationId}
            showApplicationFilter={false}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}