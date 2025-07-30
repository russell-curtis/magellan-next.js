'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
  Calendar,
  ChevronDown,
  ChevronUp
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

export interface DocumentReviewCardProps {
  document: ReviewableDocument
  onApprove?: (documentId: string, comments?: string) => Promise<void>
  onReject?: (documentId: string, reason: string, comments?: string) => Promise<void>
  onRequestClarification?: (documentId: string, comments: string) => Promise<void>
  onViewDocument?: (documentId: string) => void
  onDownloadDocument?: (documentId: string) => void
  className?: string
  compact?: boolean
}

export function DocumentReviewCard({
  document,
  onApprove,
  onReject,
  onRequestClarification,
  onViewDocument,
  onDownloadDocument,
  className,
  compact = false
}: DocumentReviewCardProps) {
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject' | 'clarify' | null>(null)
  const [comments, setComments] = useState('')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-4 w-4 text-blue-600" />
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-red-600" />
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return <FileText className="h-4 w-4 text-blue-700" />
    } else {
      return <File className="h-4 w-4 text-gray-600" />
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

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleSubmitReview = async () => {
    try {
      if (!reviewAction) return

      setIsSubmitting(true)
      
      if (reviewAction === 'approve' && onApprove) {
        await onApprove(document.file.id, comments || undefined)
      } else if (reviewAction === 'reject' && onReject) {
        await onReject(document.file.id, rejectionReason, comments || undefined)
      } else if (reviewAction === 'clarify' && onRequestClarification) {
        await onRequestClarification(document.file.id, comments)
      }
      
      // Reset form
      setReviewAction(null)
      setComments('')
      setRejectionReason('')
    } catch (error) {
      console.error('Error submitting review:', error)
      alert(`Error submitting review: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const canReview = !document.review || document.review.status === 'pending'

  return (
    <Card className={cn("transition-all duration-200 hover:shadow-md", className)}>
      <CardContent className="p-4">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 truncate">{document.requirement.documentName}</h3>
              {document.review && (
                <Badge variant="secondary" className={cn("text-xs", getStatusColor(document.review.status))}>
                  {document.review.status.replace('_', ' ').charAt(0).toUpperCase() + document.review.status.replace('_', ' ').slice(1)}
                </Badge>
              )}
              {document.review && (
                <Badge variant="outline" className={cn("text-xs", getPriorityColor(document.review.priority))}>
                  {document.review.priority}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {document.client.name}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(document.file.uploadedAt)}
              </span>
              <span className="text-gray-400">•</span>
              <span>{document.application.programName}</span>
            </div>
          </div>
          
          {!compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 flex-shrink-0"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>

        {/* File Info */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
          <div className="flex items-center gap-3">
            {getFileIcon(document.file.fileType)}
            <div>
              <div className="font-medium text-sm text-gray-900">{document.file.fileName}</div>
              <div className="text-xs text-gray-500">
                {formatFileSize(document.file.fileSize)} • {document.file.fileType}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewDocument?.(document.file.id)}
              className="text-xs px-2 py-1"
            >
              <Eye className="h-3 w-3 mr-1" />
              View
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDownloadDocument?.(document.file.id)}
              className="text-xs px-2 py-1"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>

        {/* Previous Review Info (if exists and not pending) */}
        {document.review && document.review.status !== 'pending' && (
          <div className="p-3 bg-gray-50 rounded-lg mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Previous Review</span>
              {document.review.reviewedAt && (
                <span className="text-xs text-gray-500">{formatDate(document.review.reviewedAt)}</span>
              )}
            </div>
            {document.review.comments && (
              <p className="text-sm text-gray-600 mb-2">{document.review.comments}</p>
            )}
            {document.review.rejectionReason && (
              <div className="p-2 bg-red-50 rounded border border-red-200">
                <p className="text-sm text-red-700">{document.review.rejectionReason}</p>
              </div>
            )}
          </div>
        )}

        {/* Expanded Details */}
        {(isExpanded || compact) && (
          <div className="mb-3 p-3 border rounded-lg bg-blue-50">
            <p className="text-sm text-gray-700 mb-2">{document.requirement.description}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline">{document.requirement.category}</Badge>
              <Badge variant={document.requirement.isRequired ? 'destructive' : 'secondary'}>
                {document.requirement.isRequired ? 'Required' : 'Optional'}
              </Badge>
              <span className="text-gray-500">Max: {document.requirement.maxFileSizeMB}MB</span>
            </div>
          </div>
        )}

        {/* Review Actions */}
        {canReview && (
          <div className="border-t pt-3">
            {!reviewAction ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => setReviewAction('approve')}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  onClick={() => setReviewAction('reject')}
                  className="bg-red-600 hover:bg-red-700 text-white flex-1"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setReviewAction('clarify')}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-1" />
                  Clarify
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {reviewAction === 'approve' && <CheckCircle className="h-4 w-4 text-green-600" />}
                  {reviewAction === 'reject' && <XCircle className="h-4 w-4 text-red-600" />}
                  {reviewAction === 'clarify' && <MessageCircle className="h-4 w-4 text-yellow-600" />}
                  <span className="text-sm font-medium">
                    {reviewAction === 'approve' ? 'Approving Document' :
                     reviewAction === 'reject' ? 'Rejecting Document' :
                     'Requesting Clarification'}
                  </span>
                </div>

                {reviewAction === 'reject' && (
                  <div>
                    <Label className="text-xs">Rejection Reason (Required)</Label>
                    <Textarea
                      placeholder="Please provide a clear reason for rejection..."
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="text-sm min-h-[60px] mt-1"
                    />
                  </div>
                )}

                <div>
                  <Label className="text-xs">
                    {reviewAction === 'clarify' ? 'Clarification Comments (Required)' : 'Additional Comments (Optional)'}
                  </Label>
                  <Textarea
                    placeholder={
                      reviewAction === 'approve' 
                        ? "Add any additional notes..."
                        : reviewAction === 'reject'
                        ? "Provide additional context..."
                        : "Specify what clarification is needed..."
                    }
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="text-sm min-h-[60px] mt-1"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSubmitReview}
                    disabled={isSubmitting || (reviewAction === 'reject' && !rejectionReason) || (reviewAction === 'clarify' && !comments)}
                    className={cn(
                      "flex-1",
                      reviewAction === 'approve' && "bg-green-600 hover:bg-green-700",
                      reviewAction === 'reject' && "bg-red-600 hover:bg-red-700",
                      reviewAction === 'clarify' && "bg-yellow-600 hover:bg-yellow-700"
                    )}
                  >
                    {isSubmitting ? (
                      <Clock className="h-4 w-4 animate-spin mr-1" />
                    ) : reviewAction === 'approve' ? (
                      <CheckCircle className="h-4 w-4 mr-1" />
                    ) : reviewAction === 'reject' ? (
                      <XCircle className="h-4 w-4 mr-1" />
                    ) : (
                      <MessageCircle className="h-4 w-4 mr-1" />
                    )}
                    {isSubmitting ? 'Submitting...' : 
                     reviewAction === 'approve' ? 'Submit Approval' :
                     reviewAction === 'reject' ? 'Submit Rejection' :
                     'Send Request'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
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
          <div className="border-t pt-3">
            <div className="flex items-center gap-2 text-gray-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Review completed - no further action needed</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}