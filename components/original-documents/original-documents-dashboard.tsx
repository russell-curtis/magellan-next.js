'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  Search, 
  Plus, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Truck,
  FileCheck,
  Building,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  Eye,
  Edit,
  Archive
} from 'lucide-react'
import { StatsCard } from '@/components/ui/stats-card'
import { OriginalDocumentCard } from './original-document-card'
import { RequestOriginalDocumentModal } from './request-original-document-modal'

interface OriginalDocument {
  id: string
  applicationId: string
  documentRequirementId: string
  digitalDocumentId: string | null
  status: string
  documentName: string
  category: string | null
  isRequired: boolean
  
  // Shipping & Logistics
  shippedAt: string | null
  courierService: string | null
  trackingNumber: string | null
  shippingAddress: string | null
  clientReference: string | null
  
  // Receipt & Verification
  receivedAt: string | null
  receivedBy: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  
  // Document Condition & Quality
  documentCondition: string | null
  qualityNotes: string | null
  isAuthenticated: boolean
  authenticationDetails: string | null
  
  // Deadlines & Communication
  deadline: string | null
  isUrgent: boolean
  governmentDeadline: string | null
  requestedAt: string | null
  requestedBy: string | null
  clientNotifiedAt: string | null
  remindersSent: number
  
  // Notes
  internalNotes: string | null
  clientInstructions: string | null
  
  // Related Data
  application: {
    applicationNumber: string
    status: string
  }
  documentRequirement: {
    documentName: string
    category: string
    isRequired: boolean
  }
  
  createdAt: string
  updatedAt: string
}

interface OriginalDocumentStats {
  total: number
  digitalApproved: number
  originalsRequested: number
  originalsShipped: number
  originalsReceived: number
  originalsVerified: number
  readyForGovernment: number
  urgent: number
  overdue: number
}

interface OriginalDocumentsDashboardProps {
  applicationId?: string
  showApplicationFilter?: boolean
}

export function OriginalDocumentsDashboard({ 
  applicationId,
  showApplicationFilter = true 
}: OriginalDocumentsDashboardProps) {
  const [originalDocuments, setOriginalDocuments] = useState<OriginalDocument[]>([])
  const [stats, setStats] = useState<OriginalDocumentStats>({
    total: 0,
    digitalApproved: 0,
    originalsRequested: 0,
    originalsShipped: 0,
    originalsReceived: 0,
    originalsVerified: 0,
    readyForGovernment: 0,
    urgent: 0,
    overdue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [urgentFilter, setUrgentFilter] = useState<boolean | null>(null)
  const [requestModalOpen, setRequestModalOpen] = useState(false)

  const fetchOriginalDocuments = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const endpoint = applicationId 
        ? `/api/applications/${applicationId}/original-documents`
        : '/api/original-documents'
      
      const response = await fetch(endpoint)
      
      if (response.ok) {
        const data = await response.json()
        setOriginalDocuments(data.originalDocuments || [])
        setStats(data.stats || stats)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load original documents')
      }
    } catch (err) {
      console.error('Error fetching original documents:', err)
      setError('Network error while loading original documents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOriginalDocuments()
  }, [applicationId])

  // Filter original documents
  const filteredDocuments = originalDocuments.filter(doc => {
    const matchesSearch = 
      doc.documentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.application.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.trackingNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.courierService?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || doc.status === statusFilter
    const matchesUrgent = urgentFilter === null || doc.isUrgent === urgentFilter

    return matchesSearch && matchesStatus && matchesUrgent
  })

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'digital_approved':
        return 'bg-blue-100 text-blue-800'
      case 'originals_requested':
        return 'bg-yellow-100 text-yellow-800'
      case 'originals_shipped':
        return 'bg-purple-100 text-purple-800'
      case 'originals_received':
        return 'bg-orange-100 text-orange-800'
      case 'originals_verified':
        return 'bg-green-100 text-green-800'
      case 'ready_for_government':
        return 'bg-emerald-100 text-emerald-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'digital_approved':
        return <FileCheck className="h-4 w-4" />
      case 'originals_requested':
        return <Clock className="h-4 w-4" />
      case 'originals_shipped':
        return <Truck className="h-4 w-4" />
      case 'originals_received':
        return <Package className="h-4 w-4" />
      case 'originals_verified':
        return <CheckCircle className="h-4 w-4" />
      case 'ready_for_government':
        return <Building className="h-4 w-4" />
      default:
        return <FileCheck className="h-4 w-4" />
    }
  }

  // Format status text
  const formatStatusText = (status: string) => {
    switch (status) {
      case 'digital_approved':
        return 'Digital Approved'
      case 'originals_requested':
        return 'Originals Requested'
      case 'originals_shipped':
        return 'Originals Shipped'
      case 'originals_received':
        return 'Originals Received'
      case 'originals_verified':
        return 'Originals Verified'
      case 'ready_for_government':
        return 'Ready for Government'
      default:
        return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading original documents...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Original Documents</h2>
          <p className="text-gray-600 mt-1">
            Track physical documents through shipping, receipt, and verification
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchOriginalDocuments} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {applicationId && (
            <Button onClick={() => setRequestModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Request Originals
            </Button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="In Progress"
          value={stats.originalsRequested + stats.originalsShipped + stats.originalsReceived}
          icon={<Clock />}
          description="Documents being processed"
          color="blue"
          onClick={() => setStatusFilter('originals_requested')}
          badge={stats.urgent > 0 ? { text: `${stats.urgent} Urgent`, variant: 'destructive' } : undefined}
        />

        <StatsCard
          title="In Transit"
          value={stats.originalsShipped}
          icon={<Truck />}
          description="Documents shipped to office"
          color="purple"
          onClick={() => setStatusFilter('originals_shipped')}
        />

        <StatsCard
          title="Received"
          value={stats.originalsReceived}
          icon={<Package />}
          description="Documents received, pending verification"
          color="orange"
          onClick={() => setStatusFilter('originals_received')}
        />

        <StatsCard
          title="Verified"
          value={stats.originalsVerified + stats.readyForGovernment}
          icon={<CheckCircle />}
          description="Documents verified and ready"
          color="green"
          onClick={() => setStatusFilter('originals_verified')}
          trend={stats.readyForGovernment > 0 ? { 
            value: stats.readyForGovernment, 
            label: 'ready for government',
            isPositive: true 
          } : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-lg border">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search documents, applications, tracking numbers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            All Status
          </Button>
          <Button
            variant={statusFilter === 'originals_requested' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('originals_requested')}
          >
            Requested
          </Button>
          <Button
            variant={statusFilter === 'originals_shipped' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('originals_shipped')}
          >
            Shipped
          </Button>
          <Button
            variant={statusFilter === 'originals_received' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('originals_received')}
          >
            Received
          </Button>
          <Button
            variant={urgentFilter === true ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => setUrgentFilter(urgentFilter === true ? null : true)}
          >
            <AlertTriangle className="mr-1 h-3 w-3" />
            Urgent
          </Button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchOriginalDocuments}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents List */}
      {filteredDocuments.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || urgentFilter !== null
                ? 'No matching original documents found' 
                : 'No original documents yet'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' || urgentFilter !== null
                ? 'Try adjusting your search or filters'
                : 'Original document tracking will appear here when requested'
              }
            </p>
            {applicationId && (
              <Button onClick={() => setRequestModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Request Original Documents
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredDocuments.map((document) => (
            <OriginalDocumentCard
              key={document.id}
              document={document}
              onStatusUpdate={fetchOriginalDocuments}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              formatStatusText={formatStatusText}
            />
          ))}
        </div>
      )}

      {/* Request Original Document Modal */}
      {applicationId && (
        <RequestOriginalDocumentModal
          applicationId={applicationId}
          open={requestModalOpen}
          onOpenChange={setRequestModalOpen}
          onDocumentRequested={fetchOriginalDocuments}
        />
      )}
    </div>
  )
}