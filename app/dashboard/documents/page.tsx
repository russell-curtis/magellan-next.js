'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DocumentUpload } from '../_components/document-upload'
import { DocumentList } from '../_components/document-list'
import { 
  FileText, 
  Upload, 
  BarChart3, 
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface DocumentStats {
  total: number
  pending: number
  approved: number
  rejected: number
  expired: number
}

export default function DocumentsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [showUpload, setShowUpload] = useState(false)

  // Mock stats - in real app, this would come from an API
  const stats: DocumentStats = {
    total: 247,
    pending: 18,
    approved: 201,
    rejected: 12,
    expired: 16
  }

  const handleDocumentUploaded = () => {
    // Refresh the document list when a new document is uploaded
    window.location.reload()
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Document Management</h1>
          <p className="text-muted-foreground">
            Manage, organize, and track all client documents and compliance materials
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4 mr-2" />
          {showUpload ? 'Hide Upload' : 'Upload Documents'}
        </Button>
      </div>

      {/* Document Upload */}
      {showUpload && (
        <DocumentUpload 
          onUploadComplete={handleDocumentUploaded}
          allowMultiple={true}
          showClientSelection={true}
          showApplicationSelection={true}
        />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              Across all clients
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved}</div>
            <p className="text-xs text-muted-foreground">
              Compliance verified
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
            <p className="text-xs text-muted-foreground">
              Need resubmission
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expired}</div>
            <p className="text-xs text-muted-foreground">
              Require renewal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Document Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
        <div className="flex items-center justify-between">
          <TabsList className="grid w-full max-w-md grid-cols-4">
            <TabsTrigger value="all">
              All ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending ({stats.pending})
            </TabsTrigger>
            <TabsTrigger value="approved">
              Approved ({stats.approved})
            </TabsTrigger>
            <TabsTrigger value="issues" className={stats.rejected + stats.expired > 0 ? 'text-red-600' : ''}>
              Issues ({stats.rejected + stats.expired})
            </TabsTrigger>
          </TabsList>
          
          <Button variant="outline" size="sm">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
        </div>

        <TabsContent value="all" className="mt-6">
          <DocumentList showFilters={true} showActions={true} />
        </TabsContent>

        <TabsContent value="pending" className="mt-6">
          <DocumentList showFilters={false} showActions={true} />
        </TabsContent>

        <TabsContent value="approved" className="mt-6">
          <DocumentList showFilters={false} showActions={true} />
        </TabsContent>

        <TabsContent value="issues" className="mt-6">
          <DocumentList showFilters={false} showActions={true} />
        </TabsContent>
      </Tabs>
    </div>
  )
}