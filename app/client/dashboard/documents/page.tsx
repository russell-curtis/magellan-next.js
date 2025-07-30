'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FileText, Download, Eye, Search, Calendar, User } from 'lucide-react'

export default function ClientDocumentsPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  // Placeholder data for documents
  const documents = [
    {
      id: '1',
      name: 'Investment Portfolio Summary',
      type: 'Financial Document',
      size: '2.4 MB',
      sharedBy: 'John Smith',
      sharedAt: '2024-07-20',
      category: 'investment',
      status: 'current',
    },
    {
      id: '2',
      name: 'Quebec Investor Program Application',
      type: 'Application Form',
      size: '1.8 MB',
      sharedBy: 'Sarah Johnson',
      sharedAt: '2024-07-18',
      category: 'application',
      status: 'current',
    },
    {
      id: '3',
      name: 'Due Diligence Checklist',
      type: 'Process Document',
      size: '456 KB',
      sharedBy: 'Michael Brown',
      sharedAt: '2024-07-15',
      category: 'process',
      status: 'current',
    },
    {
      id: '4',
      name: 'Immigration Timeline',
      type: 'Process Document',
      size: '234 KB',
      sharedBy: 'Sarah Johnson',
      sharedAt: '2024-07-10',
      category: 'process',
      status: 'current',
    },
    {
      id: '5',
      name: 'Tax Implications Guide',
      type: 'Information Document',
      size: '1.2 MB',
      sharedBy: 'John Smith',
      sharedAt: '2024-07-05',
      category: 'information',
      status: 'current',
    },
  ]

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'investment':
        return 'bg-green-100 text-green-800'
      case 'application':
        return 'bg-blue-100 text-blue-800'
      case 'process':
        return 'bg-purple-100 text-purple-800'
      case 'information':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCategory = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Documents</h1>
          <p className="mt-1" style={{color: '#00000080'}}>
            Access documents shared by your advisory team
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search documents..."
              className="pl-10 w-64"
            />
          </div>
        </div>
      </div>

      {/* Document Categories */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <FileText className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Investment</p>
                <p className="text-lg font-bold text-gray-900">
                  {documents.filter(doc => doc.category === 'investment').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Applications</p>
                <p className="text-lg font-bold text-gray-900">
                  {documents.filter(doc => doc.category === 'application').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FileText className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Process</p>
                <p className="text-lg font-bold text-gray-900">
                  {documents.filter(doc => doc.category === 'process').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileText className="h-5 w-5 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Information</p>
                <p className="text-lg font-bold text-gray-900">
                  {documents.filter(doc => doc.category === 'information').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {documents.map((document) => (
              <div key={document.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {document.name}
                    </h4>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-600">{document.type}</p>
                      <p className="text-sm text-gray-500">{document.size}</p>
                      <div className="flex items-center text-sm text-gray-500">
                        <User className="h-3 w-3 mr-1" />
                        {document.sharedBy}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(document.sharedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <Badge className={getCategoryColor(document.category)}>
                    {formatCategory(document.category)}
                  </Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}