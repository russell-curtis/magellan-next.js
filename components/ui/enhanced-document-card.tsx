'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  FileText, 
  Download, 
  Eye, 
  Upload,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Image,
  File,
  FileSpreadsheet,
  Archive,
  Calendar,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { DocumentPreview } from './document-preview'

export interface DocumentData {
  documentId?: string
  fileName?: string
  fileUrl?: string
  fileSize?: number
  contentType?: string
  uploadedAt?: string
  status: 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected'
  
  // Requirement info
  requirementId: string
  documentName: string
  description: string
  category: string
  isRequired: boolean
  
  // Application info
  applicationId: string
  applicationNumber: string
  programName: string
  countryName: string
  
  // Review info
  reviewedAt?: string
  reviewComments?: string
}

export interface EnhancedDocumentCardProps {
  document: DocumentData
  onUpload?: (requirementId: string) => void
  onDownload?: (documentId: string) => void
  onDelete?: (documentId: string) => void
  className?: string
  showApplicationInfo?: boolean
  compact?: boolean
}

export function EnhancedDocumentCard({
  document,
  onUpload,
  onDownload,
  onDelete,
  className,
  showApplicationInfo = false,
  compact = false
}: EnhancedDocumentCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const getFileIcon = (contentType?: string, fileName?: string) => {
    if (!contentType && !fileName) {
      return <FileText className="h-5 w-5 text-gray-600" />
    }

    const extension = fileName?.split('.').pop()?.toLowerCase() || ''
    
    if (contentType?.startsWith('image/')) {
      return <Image className="h-5 w-5 text-blue-600" />
    }
    
    if (contentType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-600" />
    }
    
    if (contentType?.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    }
    
    if (contentType?.includes('word') || ['doc', 'docx'].includes(extension)) {
      return <FileText className="h-5 w-5 text-blue-600" />
    }
    
    if (['zip', 'rar', '7z'].includes(extension)) {
      return <Archive className="h-5 w-5 text-orange-600" />
    }
    
    return <File className="h-5 w-5 text-gray-600" />
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return {
          label: 'Approved',
          color: 'bg-green-100 text-green-800 border-green-200',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Document has been approved'
        }
      case 'rejected':
        return {
          label: 'Rejected',
          color: 'bg-red-100 text-red-800 border-red-200',
          icon: <XCircle className="h-4 w-4" />,
          description: 'Document needs to be resubmitted'
        }
      case 'under_review':
        return {
          label: 'Under Review',
          color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          icon: <Clock className="h-4 w-4" />,
          description: 'Document is being reviewed by our team'
        }
      case 'uploaded':
        return {
          label: 'Uploaded',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Document uploaded successfully'
        }
      case 'pending':
      default:
        return {
          label: 'Required',
          color: 'bg-orange-100 text-orange-800 border-orange-200',
          icon: <AlertTriangle className="h-4 w-4" />,
          description: 'Document upload required'
        }
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal':
        return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'financial':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'professional':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'investment':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      case 'application':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const statusInfo = getStatusInfo(document.status)
  const hasDocument = document.documentId && document.fileName
  const canDelete = hasDocument && document.status !== 'approved'

  const handleDelete = async () => {
    if (!document.documentId || !onDelete) return
    
    setIsDeleting(true)
    try {
      await onDelete(document.documentId)
    } catch (error) {
      console.error('Error deleting document:', error)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleView = () => {
    if (document.documentId && document.fileUrl) {
      setPreviewOpen(true)
    }
  }

  return (
    <>
      <Card className={cn(
        "transition-all duration-200 hover:shadow-sm border border-gray-200",
        document.status === 'rejected' && "border-red-200 bg-red-50/30",
        document.status === 'approved' && "border-green-200 bg-green-50/30",
        className
      )}>
        <CardContent className={cn("p-4", compact && "p-3")}>
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className={cn(
                  "font-semibold text-gray-900 truncate",
                  compact ? "text-sm" : "text-base"
                )}>
                  {document.documentName}
                </h3>
                {document.isRequired && (
                  <Badge variant="outline" className="text-xs border-red-300 text-red-700">
                    Required
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("text-xs", statusInfo.color)}>
                  {statusInfo.icon}
                  <span className="ml-1">{statusInfo.label}</span>
                </Badge>
                <Badge variant="outline" className={cn("text-xs", getCategoryColor(document.category))}>
                  {document.category}
                </Badge>
              </div>

              <p className={cn(
                "text-gray-600 line-clamp-2",
                compact ? "text-xs" : "text-sm"
              )}>
                {document.description}
              </p>
            </div>
          </div>

          {/* Document File Info */}
          {hasDocument && (
            <div className="bg-gray-50 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getFileIcon(document.contentType, document.fileName)}
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-gray-900 truncate">
                      {document.fileName}
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      {document.fileSize && <span>{formatFileSize(document.fileSize)}</span>}
                      {document.uploadedAt && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(document.uploadedAt)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Application Info */}
          {showApplicationInfo && (
            <div className="bg-blue-50 rounded-lg p-3 mb-3">
              <div className="text-xs text-blue-700">
                <div className="font-medium">{document.programName}</div>
                <div className="flex items-center gap-2 mt-1">
                  <span>Application #{document.applicationNumber}</span>
                  <span>•</span>
                  <span>{document.countryName}</span>
                </div>
              </div>
            </div>
          )}

          {/* Review Comments */}
          {document.reviewComments && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
              <div className="text-sm">
                <div className="font-medium text-yellow-800 mb-1">Review Comments</div>
                <p className="text-yellow-700">{document.reviewComments}</p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              {statusInfo.description}
            </div>
            
            <div className="flex items-center gap-2">
              {!hasDocument ? (
                <Button
                  size="sm"
                  onClick={() => onUpload?.(document.requirementId)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </Button>
              ) : (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleView}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDownload?.(document.documentId!)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {canDelete && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Document Preview Modal */}
      {hasDocument && document.fileUrl && (
        <DocumentPreview
          document={{
            id: document.documentId!,
            filename: document.fileName!,
            fileUrl: document.fileUrl,
            contentType: document.contentType || 'application/octet-stream',
            fileSize: document.fileSize || 0,
            status: document.status,
            description: document.description
          }}
          open={previewOpen}
          onOpenChange={setPreviewOpen}
        />
      )}
    </>
  )
}