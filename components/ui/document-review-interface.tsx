'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Download, 
  MessageCircle,
  Clock,
  AlertTriangle,
  FileText,
  Image,
  File,
  User,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentRequirement } from './document-checklist-card'

export interface DocumentReview {
  id: string
  documentId: string
  applicationId: string
  requirementId: string
  status: 'pending' | 'approved' | 'rejected' | 'needs_clarification'
  reviewedBy?: string
  reviewedAt?: string
  comments?: string
  rejectionReason?: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
}

export interface DocumentFile {
  id: string
  fileName: string
  fileSize: number
  fileType: string
  uploadedAt: string
  uploadedBy: string
  url: string
  thumbnailUrl?: string
}

export interface ReviewableDocument {
  id: string
  requirement: DocumentRequirement
  file: DocumentFile
  review?: DocumentReview
  client: {
    id: string
    name: string
    email: string
  }
  application: {
    id: string
    programName: string
    status: string
  }
}

export interface DocumentReviewInterfaceProps {
  document: ReviewableDocument
  onApprove?: (documentId: string, comments?: string) => Promise<void>
  onReject?: (documentId: string, reason: string, comments?: string) => Promise<void>
  onRequestClarification?: (documentId: string, comments: string) => Promise<void>
  onViewDocument?: (documentId: string) => void
  onDownloadDocument?: (documentId: string) => void
  className?: string
}

export function DocumentReviewInterface({
  document,
  onApprove,
  onReject,
  onRequestClarification,
  onViewDocument,
  onDownloadDocument,
  className
}: DocumentReviewInterfaceProps) {
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'clarify' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-600" />
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-600" />
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="h-5 w-5 text-blue-700" />
    } else {
      return <File className="h-5 w-5 text-gray-600" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'needs_clarification':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-blue-100 text-blue-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`
  }

  const handleSubmitReview = async (e?: React.MouseEvent) => {
    try {
      console.log('=== SUBMIT REVIEW BUTTON CLICKED ===')
      e?.preventDefault()
      e?.stopPropagation()
      
      if (!reviewAction) {
        console.log('No review action selected, returning')
        return
      }

      console.log('Setting isSubmitting to true')
      setIsSubmitting(true)
      
      console.log('=== DOCUMENT REVIEW SUBMISSION ===')
      console.log('Review action:', reviewAction)
      console.log('Document file ID:', document.file.id)
      console.log('Document requirement ID:', document.id)
      console.log('Comments:', comments)
      console.log('onApprove function exists:', typeof onApprove)
      
      if (reviewAction === 'approve') {
        console.log('About to call onApprove...')
        if (onApprove) {
          console.log('onApprove function is defined, calling it...')
          try {
            await onApprove(document.file.id, comments || undefined)
            console.log('onApprove completed successfully')
          } catch (approveError) {
            console.error('Error in onApprove:', approveError)
            throw approveError
          }
        } else {
          console.error('onApprove function is not defined!')
          throw new Error('onApprove function is not defined')
        }
      }
      
      console.log('Review submission completed successfully, resetting form')
      // Reset form
      setReviewAction(null)
      setComments('')
      setRejectionReason('')
    } catch (error) {
      console.error('Error in handleSubmitReview:', error)
      alert(`Error submitting review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      console.log('Setting isSubmitting to false')
      setIsSubmitting(false)
    }
  }

  const canReview = !document.review || document.review.status === 'pending'
  
  console.log('DocumentReviewInterface - canReview check:', {
    hasReview: !!document.review,
    reviewStatus: document.review?.status,
    canReview,
    documentStatus: document.requirement.status
  })

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center space-x-2">
              <span>{document.requirement.documentName}</span>
              {document.review && (
                <Badge variant="secondary" className={getStatusColor(document.review.status)}>
                  {document.review.status.replace('_', ' ').toUpperCase()}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              <div className="space-y-1">
                <div>Client: {document.client.name} ({document.client.email})</div>
                <div>Program: {document.application.programName}</div>
                <div className="flex items-center space-x-2">
                  <span>Category:</span>
                  <Badge variant="outline" className="text-xs">
                    {document.requirement.category}
                  </Badge>
                </div>
              </div>
            </CardDescription>
          </div>

          {document.review && (
            <Badge variant="outline" className={getPriorityColor(document.review.priority)}>
              {document.review.priority.toUpperCase()} PRIORITY
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Document Requirement Info */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Document Requirements</h4>
          <p className="text-sm text-gray-600 mb-3">{document.requirement.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Required:</span>
              <span className="ml-2 font-medium">
                {document.requirement.isRequired ? 'Yes' : 'No'}
              </span>
            </div>
            <div>
              <span className="text-gray-500">Max Size:</span>
              <span className="ml-2 font-medium">{document.requirement.maxFileSizeMB}MB</span>
            </div>
            <div>
              <span className="text-gray-500">Formats:</span>
              <span className="ml-2 font-medium">
                {document.requirement.acceptedFormats.join(', ').toUpperCase()}
              </span>
            </div>
            {document.requirement.expirationMonths && (
              <div>
                <span className="text-gray-500">Validity:</span>
                <span className="ml-2 font-medium">{document.requirement.expirationMonths} months</span>
              </div>
            )}
          </div>
        </div>

        {/* Uploaded File Info */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center space-x-2">
            <span>Uploaded Document</span>
            {getFileIcon(document.file.fileType)}
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{document.file.fileName}</div>
                <div className="text-sm text-gray-500">
                  {formatFileSize(document.file.fileSize)} • {document.file.fileType}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onViewDocument?.(document.file.id)}
                  className="flex items-center space-x-1"
                >
                  <Eye className="h-3 w-3" />
                  <span>View</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onDownloadDocument?.(document.file.id)}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download</span>
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>Uploaded by {document.file.uploadedBy}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(document.file.uploadedAt)}</span>
              </div>
            </div>

            {/* Document Preview */}
            {document.file.thumbnailUrl && (
              <div className="mt-3">
                <img
                  src={document.file.thumbnailUrl}
                  alt="Document preview"
                  className="max-w-full h-32 object-contain border rounded"
                />
              </div>
            )}
          </div>
        </div>

        {/* Previous Review Info */}
        {document.review && document.review.status !== 'pending' && (
          <div className="p-4 border rounded-lg">
            <h4 className="font-medium text-gray-900 mb-3">Previous Review</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className={getStatusColor(document.review.status)}>
                  {document.review.status.replace('_', ' ').toUpperCase()}
                </Badge>
                {document.review.reviewedAt && (
                  <span className="text-sm text-gray-500">
                    {formatDate(document.review.reviewedAt)}
                  </span>
                )}
              </div>
              
              {document.review.reviewedBy && (
                <div className="text-sm text-gray-600">
                  Reviewed by: {document.review.reviewedBy}
                </div>
              )}
              
              {document.review.comments && (
                <div className="p-3 bg-gray-50 rounded">
                  <div className="text-sm font-medium text-gray-700 mb-1">Comments:</div>
                  <div className="text-sm text-gray-600">{document.review.comments}</div>
                </div>
              )}
              
              {document.review.rejectionReason && (
                <div className="p-3 bg-red-50 rounded">
                  <div className="text-sm font-medium text-red-700 mb-1">Rejection Reason:</div>
                  <div className="text-sm text-red-600">{document.review.rejectionReason}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Actions */}
        {canReview && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <h4 className="font-medium text-gray-900 mb-4">Review Document</h4>
            
            {!reviewAction ? (
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-3">
                  Choose an action to review this document:
                </div>
                <div className="flex space-x-3">
                  <Button
                    type="button"
                    variant="default"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setReviewAction('approve')
                    }}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4" />
                    <span>Approve</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setReviewAction('reject')
                    }}
                    className="flex items-center space-x-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Reject</span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setReviewAction('clarify')
                    }}
                    className="flex items-center space-x-2 text-yellow-700 border-yellow-300 hover:bg-yellow-50"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Request Clarification</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  {reviewAction === 'approve' && (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700">Approving Document</span>
                    </>
                  )}
                  {reviewAction === 'reject' && (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-700">Rejecting Document</span>
                    </>
                  )}
                  {reviewAction === 'clarify' && (
                    <>
                      <MessageCircle className="h-5 w-5 text-yellow-600" />
                      <span className="font-medium text-yellow-700">Requesting Clarification</span>
                    </>
                  )}
                </div>

                {reviewAction === 'reject' && (
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">Rejection Reason (Required)</Label>
                    <Textarea
                      id="rejection-reason"
                      placeholder="Please provide a clear reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="review-comments">
                    {reviewAction === 'clarify' ? 'Clarification Comments (Required)' : 'Additional Comments (Optional)'}
                  </Label>
                  <Textarea
                    id="review-comments"
                    placeholder={
                      reviewAction === 'approve' 
                        ? "Add any additional notes or feedback..."
                        : reviewAction === 'reject'
                        ? "Provide additional context or suggestions..."
                        : "Specify what clarification is needed..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>

                <div className="flex space-x-3">
                  <Button
                    type="button"
                    onClick={async (e) => {
                      try {
                        e.preventDefault()
                        e.stopPropagation()
                        console.log('=== SUBMIT BUTTON CLICKED ===')
                        
                        // Call the handler and catch any errors
                        await handleSubmitReview(e)
                        console.log('=== SUBMIT HANDLER COMPLETED ===')
                      } catch (error) {
                        console.error('=== ERROR IN SUBMIT HANDLER ===', error)
                        alert(`Error in submit handler: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }}
                    disabled={isSubmitting}
                    className={cn(
                      "flex items-center space-x-2",
                      reviewAction === 'approve' && "bg-green-600 hover:bg-green-700",
                      reviewAction === 'reject' && "bg-red-600 hover:bg-red-700",
                      reviewAction === 'clarify' && "bg-yellow-600 hover:bg-yellow-700"
                    )}
                  >
                    {isSubmitting ? (
                      <Clock className="h-4 w-4 animate-spin" />
                    ) : reviewAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : reviewAction === 'reject' ? (
                      <XCircle className="h-4 w-4" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    <span>
                      {isSubmitting ? 'Submitting...' : 
                       reviewAction === 'approve' ? 'Submit Approval' :
                       reviewAction === 'reject' ? 'Submit Rejection' :
                       'Send Clarification Request'}
                    </span>
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      console.log('Cancel button clicked')
                      setReviewAction(null)
                      setComments('')
                      setRejectionReason('')
                    }}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Non-reviewable status */}
        {!canReview && (
          <div className="p-4 border rounded-lg bg-gray-50">
            <div className="flex items-center space-x-2 text-gray-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                This document has already been reviewed and cannot be modified.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}