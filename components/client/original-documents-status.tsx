'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Package, 
  Truck, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  MapPin,
  Calendar,
  FileText,
  ExternalLink,
  RefreshCw,
  Check,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { UpdateShippingModal } from '@/components/client/update-shipping-modal'

interface OriginalDocumentStatus {
  id: string
  documentName: string
  category: string
  isRequired: boolean
  status: string
  
  // Request details
  requestedAt: string | null
  clientNotifiedAt: string | null
  clientInstructions: string | null
  deadline: string | null
  isUrgent: boolean
  shippingAddress: string | null
  
  // Shipping details
  shippedAt: string | null
  courierService: string | null
  trackingNumber: string | null
  clientReference: string | null
  
  // Receipt details
  receivedAt: string | null
  documentCondition: string | null
  qualityNotes: string | null
  isAuthenticated: boolean
  
  // Verification details
  verifiedAt: string | null
  
  createdAt: string
  updatedAt: string
}

interface OriginalDocumentsStatusProps {
  applicationId: string
}

export function OriginalDocumentsStatus({ applicationId }: OriginalDocumentsStatusProps) {
  const [originalDocuments, setOriginalDocuments] = useState<OriginalDocumentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shippingModalOpen, setShippingModalOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<OriginalDocumentStatus | null>(null)
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)

  const fetchOriginalDocuments = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch(`/api/client/applications/${applicationId}/original-documents`, { headers })
      
      if (response.ok) {
        const data = await response.json()
        setOriginalDocuments(data.originalDocuments || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load original document status')
      }
    } catch (err) {
      console.error('Error fetching original documents:', err)
      setError('Network error while loading original document status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOriginalDocuments()
  }, [applicationId])

  // Get status display information
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'digital_approved':
        return {
          label: 'Digital Approved',
          color: 'bg-blue-100 text-blue-800',
          icon: <FileText className="h-4 w-4" />,
          description: 'Your digital document has been approved. Original may be requested soon.'
        }
      case 'originals_requested':
        return {
          label: 'Originals Requested',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="h-4 w-4" />,
          description: 'Please send your original documents to our office.'
        }
      case 'originals_shipped':
        return {
          label: 'In Transit',
          color: 'bg-purple-100 text-purple-800',
          icon: <Truck className="h-4 w-4" />,
          description: 'Your documents are on the way to our office.'
        }
      case 'originals_received':
        return {
          label: 'Received',
          color: 'bg-orange-100 text-orange-800',
          icon: <Package className="h-4 w-4" />,
          description: 'We have received your documents and are reviewing them.'
        }
      case 'originals_verified':
        return {
          label: 'Verified',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Your documents have been verified and approved.'
        }
      case 'ready_for_government':
        return {
          label: 'Ready for Submission',
          color: 'bg-emerald-100 text-emerald-800',
          icon: <CheckCircle className="h-4 w-4" />,
          description: 'Your documents are ready for government submission.'
        }
      default:
        return {
          label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
          color: 'bg-gray-100 text-gray-800',
          icon: <FileText className="h-4 w-4" />,
          description: 'Document status update'
        }
    }
  }

  // Check if document is overdue
  const isOverdue = (deadline: string | null) => {
    return deadline && new Date(deadline) < new Date()
  }

  // Handle opening shipping modal
  const handleUpdateShipping = (doc: OriginalDocumentStatus) => {
    setSelectedDocument(doc)
    setShippingModalOpen(true)
  }

  // Handle shipping updated
  const handleShippingUpdated = () => {
    fetchOriginalDocuments() // Refresh the list
    setSelectedDocumentIds(new Set()) // Clear selection after update
  }

  // Handle document selection
  const handleDocumentSelection = (documentId: string, checked: boolean) => {
    const newSelection = new Set(selectedDocumentIds)
    if (checked) {
      newSelection.add(documentId)
    } else {
      newSelection.delete(documentId)
    }
    setSelectedDocumentIds(newSelection)
  }

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligibleDocs = originalDocuments.filter(doc => doc.status === 'originals_requested')
      setSelectedDocumentIds(new Set(eligibleDocs.map(doc => doc.id)))
    } else {
      setSelectedDocumentIds(new Set())
    }
  }

  // Handle batch shipping update
  const handleBatchShippingUpdate = () => {
    setBatchMode(true)
    setShippingModalOpen(true)
  }

  // Get eligible documents for batch operations (only 'originals_requested' status)
  const eligibleDocuments = originalDocuments.filter(doc => doc.status === 'originals_requested')
  const selectedEligibleCount = Array.from(selectedDocumentIds).filter(id => 
    eligibleDocuments.some(doc => doc.id === id)
  ).length
  
  // Check if all eligible documents are selected
  const allEligibleSelected = eligibleDocuments.length > 0 && selectedEligibleCount === eligibleDocuments.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading original document status...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50">
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Status</h3>
          <p className="text-red-800 mb-4">{error}</p>
          <Button onClick={fetchOriginalDocuments} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (originalDocuments.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Original Documents Requested Yet
          </h3>
          <p className="text-gray-600 mb-4">
            When your advisor requests original documents, you&apos;ll see the status and instructions here.
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
            <h4 className="font-medium text-blue-900 mb-2">What are Original Documents?</h4>
            <p className="text-sm text-blue-800">
              After your digital documents are approved, we may need the physical originals 
              for government submission. This section will guide you through that process.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with summary and batch controls */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium text-blue-900">Original Documents Status</h3>
          {eligibleDocuments.length > 1 && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="select-all"
                checked={allEligibleSelected}
                onCheckedChange={handleSelectAll}
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="select-all" className="text-sm font-medium text-blue-900 cursor-pointer">
                Select All Eligible
              </label>
            </div>
          )}
        </div>
        <p className="text-sm text-blue-800 mb-3">
          Track the status of your physical documents throughout the submission process.
        </p>
        
        {/* Batch actions */}
        {selectedDocumentIds.size > 0 && (
          <div className="bg-white border border-blue-300 rounded-lg p-3 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">
                  {selectedDocumentIds.size} document{selectedDocumentIds.size > 1 ? 's' : ''} selected
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedDocumentIds(new Set())}
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={handleBatchShippingUpdate}
                  disabled={selectedEligibleCount === 0}
                >
                  <Truck className="h-4 w-4 mr-1" />
                  Update Shipping ({selectedEligibleCount})
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Document cards */}
      <div className="space-y-4">
        {originalDocuments.map((doc) => {
          const statusInfo = getStatusInfo(doc.status)
          const overdue = isOverdue(doc.deadline)
          
          return (
            <Card key={doc.id} className={`transition-all ${
              selectedDocumentIds.has(doc.id) 
                ? 'ring-2 ring-blue-500 bg-blue-50/30 hover:shadow-lg' 
                : 'hover:shadow-md'
            }`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  {/* Selection checkbox for eligible documents */}
                  {doc.status === 'originals_requested' && eligibleDocuments.length > 1 && (
                    <div className="mr-3 mt-1">
                      <Checkbox
                        checked={selectedDocumentIds.has(doc.id)}
                        onCheckedChange={(checked) => handleDocumentSelection(doc.id, checked as boolean)}
                        className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                      />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{doc.documentName}</h3>
                      {doc.isUrgent && (
                        <Badge variant="destructive" className="text-xs">
                          <AlertTriangle className="mr-1 h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      {doc.isRequired && (
                        <Badge variant="outline" className="text-xs">
                          Required
                        </Badge>
                      )}
                      {overdue && (
                        <Badge variant="destructive" className="text-xs">
                          <Clock className="mr-1 h-3 w-3" />
                          Overdue
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className={statusInfo.color}>
                        {statusInfo.icon}
                        <span className="ml-1">{statusInfo.label}</span>
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {statusInfo.description}
                    </p>
                  </div>
                </div>

                {/* Status-specific details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  
                  {/* Request Information */}
                  {doc.requestedAt && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Request Details</h4>
                      <div className="space-y-1 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>Requested: {format(new Date(doc.requestedAt), 'MMM dd, yyyy')}</span>
                        </div>
                        {doc.deadline && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            <span className={overdue ? 'text-red-600' : ''}>
                              Deadline: {format(new Date(doc.deadline), 'MMM dd, yyyy')}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Shipping Information */}
                  {doc.status !== 'originals_requested' && doc.courierService && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Shipping Details</h4>
                      <div className="space-y-1 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Truck className="h-4 w-4 text-gray-400" />
                          <span>{doc.courierService}</span>
                        </div>
                        {doc.trackingNumber && (
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {doc.trackingNumber}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                // Open tracking link (this would need carrier-specific URLs)
                                window.open(`https://www.google.com/search?q=${doc.trackingNumber}+${doc.courierService}+tracking`, '_blank')
                              }}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {doc.shippedAt && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span>Shipped: {format(new Date(doc.shippedAt), 'MMM dd, yyyy')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Receipt Information */}
                  {doc.receivedAt && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Receipt Status</h4>
                      <div className="space-y-1 text-gray-600">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-400" />
                          <span>Received: {format(new Date(doc.receivedAt), 'MMM dd, yyyy')}</span>
                        </div>
                        {doc.documentCondition && (
                          <div className="flex items-center gap-2">
                            <span className="capitalize">Condition: {doc.documentCondition}</span>
                          </div>
                        )}
                        {doc.isAuthenticated && (
                          <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Authenticated</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Verification Information */}
                  {doc.verifiedAt && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Verification</h4>
                      <div className="space-y-1 text-gray-600">
                        <div className="flex items-center gap-2 text-green-600">
                          <CheckCircle className="h-4 w-4" />
                          <span>Verified: {format(new Date(doc.verifiedAt), 'MMM dd, yyyy')}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instructions */}
                {doc.clientInstructions && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <h4 className="font-medium text-gray-900 mb-2">Instructions</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {doc.clientInstructions}
                    </p>
                  </div>
                )}

                {/* Shipping Address */}
                {doc.shippingAddress && doc.status === 'originals_requested' && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                          Send Documents To
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-line bg-blue-50 p-3 rounded mb-3">
                          {doc.shippingAddress}
                        </p>
                        {!selectedDocumentIds.has(doc.id) ? (
                          <Button 
                            onClick={() => handleUpdateShipping(doc)}
                            className="w-full sm:w-auto"
                          >
                            <Truck className="h-4 w-4 mr-2" />
                            Update Shipping Info
                          </Button>
                        ) : (
                          <div className="text-sm text-blue-600 bg-blue-100 px-3 py-2 rounded font-medium">
                            Selected for batch update
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Update Shipping Modal */}
      {(selectedDocument || batchMode) && (
        <UpdateShippingModal
          isOpen={shippingModalOpen}
          onOpenChange={(open) => {
            setShippingModalOpen(open)
            if (!open) {
              setBatchMode(false)
              setSelectedDocument(null)
            }
          }}
          originalDocumentId={batchMode ? '' : selectedDocument?.id || ''}
          documentName={batchMode ? 'Multiple Documents' : selectedDocument?.documentName || ''}
          onShippingUpdated={handleShippingUpdated}
          batchMode={batchMode}
          selectedDocumentIds={batchMode ? selectedDocumentIds : undefined}
        />
      )}
    </div>
  )
}