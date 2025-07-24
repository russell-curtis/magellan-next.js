'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  FileText, 
  Download, 
  Trash2, 
  Search,
  FileImage,
  FileSpreadsheet,
  File,
  Calendar,
  User,
  ExternalLink
} from 'lucide-react'
import { 
  DOCUMENT_TYPES, 
  DOCUMENT_CATEGORIES,
  DOCUMENT_STATUSES,
  COMPLIANCE_STATUSES
} from '@/lib/validations/documents'

interface Document {
  id: string
  filename: string
  originalFilename: string
  fileUrl: string
  fileSize: number
  contentType: string
  documentType: string
  category?: string | null
  description?: string | null
  status: string
  complianceStatus?: string | null
  complianceNotes?: string | null
  version: number
  isLatestVersion: boolean
  expiresAt?: string | null
  createdAt: string
  updatedAt: string
  client?: {
    id: string
    name: string
    firstName: string
    lastName: string
  } | null
  application?: {
    id: string
    applicationNumber: string
    status: string
  } | null
  uploadedBy?: {
    id: string
    name: string
    email: string
  } | null
}

interface DocumentListProps {
  clientId?: string
  applicationId?: string
  showFilters?: boolean
  showActions?: boolean
  className?: string
}

export function DocumentList({ 
  clientId, 
  applicationId, 
  showFilters = true,
  showActions = true,
  className 
}: DocumentListProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [complianceFilter, setComplianceFilter] = useState('all')
  const { toast } = useToast()

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (clientId) params.append('clientId', clientId)
      if (applicationId) params.append('applicationId', applicationId)
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (complianceFilter !== 'all') params.append('complianceStatus', complianceFilter)

      const response = await fetch(`/api/documents?${params}`)
      if (response.ok) {
        const data = await response.json()
        setDocuments(data.documents || [])
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch documents',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [clientId, applicationId, searchTerm, statusFilter, complianceFilter, toast])

  useEffect(() => {
    fetchDocuments()
  }, [clientId, applicationId, searchTerm, statusFilter, typeFilter, complianceFilter, fetchDocuments])

  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId))
        toast({
          title: 'Success',
          description: 'Document deleted successfully'
        })
      } else {
        throw new Error('Failed to delete document')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete document',
        variant: 'destructive'
      })
    }
  }

  const handleDownload = (document: Document) => {
    window.open(document.fileUrl, '_blank')
  }

  const getFileIcon = (contentType: string) => {
    if (contentType.startsWith('image/')) return <FileImage className="h-4 w-4" />
    if (contentType === 'application/pdf') return <FileText className="h-4 w-4" />
    if (contentType.includes('spreadsheet') || contentType.includes('excel')) return <FileSpreadsheet className="h-4 w-4" />
    return <File className="h-4 w-4" />
  }

  const getStatusBadge = (status: string) => {
    const config = {
      uploaded: { color: 'bg-blue-100 text-blue-800', label: 'Uploaded' },
      verified: { color: 'bg-green-100 text-green-800', label: 'Verified' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      expired: { color: 'bg-yellow-100 text-yellow-800', label: 'Expired' },
      deleted: { color: 'bg-gray-100 text-gray-800', label: 'Deleted' }
    }
    const statusConfig = config[status as keyof typeof config] || config.uploaded
    return <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
  }

  const getComplianceBadge = (status: string | null | undefined) => {
    if (!status) return null
    
    const config = {
      pending_review: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Review' },
      approved: { color: 'bg-green-100 text-green-800', label: 'Approved' },
      rejected: { color: 'bg-red-100 text-red-800', label: 'Rejected' },
      requires_update: { color: 'bg-orange-100 text-orange-800', label: 'Requires Update' }
    }
    const statusConfig = config[status as keyof typeof config]
    return statusConfig ? <Badge className={statusConfig.color}>{statusConfig.label}</Badge> : null
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const filteredDocuments = documents.filter(doc => {
    if (typeFilter !== 'all' && doc.documentType !== typeFilter) return false
    return true
  })

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({filteredDocuments.length})
          </div>
        </CardTitle>
        
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {DOCUMENT_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={complianceFilter} onValueChange={setComplianceFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Compliance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Compliance</SelectItem>
                {COMPLIANCE_STATUSES.map(status => (
                  <SelectItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        {filteredDocuments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria' : 'Upload your first document to get started'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getFileIcon(document.contentType)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium truncate">{document.originalFilename}</h4>
                        {getStatusBadge(document.status)}
                        {getComplianceBadge(document.complianceStatus)}
                      </div>

                      {/* Document Type and Category */}
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {DOCUMENT_TYPES[document.documentType as keyof typeof DOCUMENT_TYPES] || document.documentType}
                        </div>
                        {document.category && (
                          <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            {DOCUMENT_CATEGORIES[document.category as keyof typeof DOCUMENT_CATEGORIES] || document.category.charAt(0).toUpperCase() + document.category.slice(1)}
                          </div>
                        )}
                      </div>

                      {/* Description */}
                      {document.description && (
                        <p className="text-sm text-gray-600 mb-2 italic">
                          &ldquo;{document.description}&rdquo;
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(document.createdAt)}</span>
                      </div>

                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        {document.client && (
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>{document.client.name}</span>
                          </div>
                        )}
                        {document.application && (
                          <div className="flex items-center space-x-1">
                            <FileText className="h-3 w-3" />
                            <span>App: {document.application.applicationNumber}</span>
                          </div>
                        )}
                        {document.uploadedBy && (
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>by {document.uploadedBy.name}</span>
                          </div>
                        )}
                      </div>

                      {document.complianceNotes && (
                        <p className="text-sm text-orange-600 mt-2 p-2 bg-orange-50 rounded">
                          <strong>Compliance Note:</strong> {document.complianceNotes}
                        </p>
                      )}
                    </div>
                  </div>

                  {showActions && (
                    <div className="flex items-center space-x-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(document)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(document.fileUrl, '_blank')}
                        title="View"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDocument(document.id)}
                        title="Delete"
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}