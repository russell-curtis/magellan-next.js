'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  Download, 
  ExternalLink, 
  Eye,
  FileSpreadsheet,
  FileImage,
  Archive,
  File
} from 'lucide-react'

interface DocumentPreviewProps {
  document: {
    id: string
    filename: string
    fileUrl: string
    contentType: string
    fileSize: number
    status: string
    description?: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DocumentPreview({ document, open, onOpenChange }: DocumentPreviewProps) {
  const [previewError, setPreviewError] = useState(false)

  if (!document) return null

  const getFileIcon = (contentType: string, filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    
    if (contentType.startsWith('image/')) {
      return <FileImage className="h-5 w-5" />
    }
    
    if (contentType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-600" />
    }
    
    if (contentType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(extension)) {
      return <FileSpreadsheet className="h-5 w-5 text-green-600" />
    }
    
    if (contentType.includes('word') || ['doc', 'docx'].includes(extension)) {
      return <FileText className="h-5 w-5 text-blue-600" />
    }
    
    if (['zip', 'rar', '7z'].includes(extension)) {
      return <Archive className="h-5 w-5 text-orange-600" />
    }
    
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'uploaded': 'bg-blue-100 text-blue-800 border-blue-200',
      'verified': 'bg-green-100 text-green-800 border-green-200',
      'pending_review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'rejected': 'bg-red-100 text-red-800 border-red-200',
      'archived': 'bg-gray-100 text-gray-800 border-gray-200',
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const canPreviewInBrowser = (contentType: string, filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || ''
    
    // Images can be previewed directly
    if (contentType.startsWith('image/')) return true
    
    // PDFs can be previewed in modern browsers
    if (contentType === 'application/pdf') return true
    
    // Plain text files
    if (contentType === 'text/plain' || extension === 'txt') return true
    
    return false
  }

  const renderPreview = () => {
    const { contentType, fileUrl, filename } = document
    
    if (previewError) {
      return (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="p-4 rounded-full bg-gray-100">
            {getFileIcon(contentType, filename)}
          </div>
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-2">Preview not available</p>
            <p className="text-xs text-muted-foreground">
              Click &quot;Open&quot; to view this file in a new tab
            </p>
          </div>
        </div>
      )
    }

    // Image preview
    if (contentType.startsWith('image/')) {
      return (
        <div className="flex justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={fileUrl} 
            alt={filename}
            className="max-w-full max-h-[500px] object-contain rounded-lg shadow-sm"
            onError={() => setPreviewError(true)}
          />
        </div>
      )
    }

    // PDF preview
    if (contentType === 'application/pdf') {
      return (
        <div className="w-full h-[600px]">
          <iframe
            src={`${fileUrl}#view=FitH`}
            className="w-full h-full border rounded-lg"
            title={filename}
            onError={() => setPreviewError(true)}
          />
        </div>
      )
    }

    // Text file preview
    if (contentType === 'text/plain') {
      return (
        <div className="p-4">
          <iframe
            src={fileUrl}
            className="w-full h-96 border rounded-lg"
            title={filename}
            onError={() => setPreviewError(true)}
          />
        </div>
      )
    }

    // Default: No preview available
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <div className="p-6 rounded-full bg-gray-100">
          {getFileIcon(contentType, filename)}
        </div>
        <div className="text-center">
          <p className="font-medium mb-1">{filename}</p>
          <p className="text-sm text-muted-foreground mb-4">
            Preview not available for this file type
          </p>
          <Button 
            variant="outline" 
            onClick={() => window.open(fileUrl, '_blank')}
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Open in New Tab
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getFileIcon(document.contentType, document.filename)}
              <div>
                <DialogTitle className="text-lg">{document.filename}</DialogTitle>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(document.status)}>
                    {document.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {formatFileSize(document.fileSize)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {canPreviewInBrowser(document.contentType, document.filename) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(document.fileUrl, '_blank')}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const link = window.document.createElement('a')
                  link.href = document.fileUrl
                  link.download = document.filename
                  link.click()
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
          {document.description && (
            <p className="text-sm text-muted-foreground mt-2">
              {document.description}
            </p>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          {renderPreview()}
        </div>
      </DialogContent>
    </Dialog>
  )
}