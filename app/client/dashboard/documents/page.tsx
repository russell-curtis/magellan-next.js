'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  FileText, 
  RefreshCw, 
  Download,
  Share2
} from 'lucide-react'
import { DocumentTemplates } from '@/components/ui/document-templates'

interface AgentResource {
  id: string
  title: string
  description: string
  category: string
  fileUrl: string
  fileName: string
  uploadedAt: string
  programRelevant: boolean
}

export default function ClientDocumentsPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()
  
  const [agentResources, setAgentResources] = useState<AgentResource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('templates')

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  const fetchAgentResources = useCallback(async () => {
    if (!client) return
    
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const response = await fetch('/api/client/documents/resources', { headers })
      
      if (response.ok) {
        const data = await response.json()
        setAgentResources(data.resources || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load resources')
      }
    } catch (err) {
      console.error('Error fetching agent resources:', err)
      setError('Network error while loading resources')
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    if (client) {
      fetchAgentResources()
    }
  }, [client, fetchAgentResources])

  const handleResourceDownload = async (resource: AgentResource) => {
    try {
      window.open(resource.fileUrl, '_blank')
    } catch (error) {
      console.error('Error downloading resource:', error)
      alert('Error downloading resource. Please try again.')
    }
  }

  if (isLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading resources...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Resource Library</h1>
          <p className="mt-1 text-sm text-gray-600">
            Access document templates and resources shared by your advisory team
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button onClick={fetchAgentResources} variant="outline" disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>


      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">Document Templates</TabsTrigger>
          <TabsTrigger value="resources">Agent Resources</TabsTrigger>
        </TabsList>


        <TabsContent value="templates" className="space-y-6">
          <DocumentTemplates 
            clientId={client?.id}
            onTemplateDownload={(templateId, downloadUrl) => {
              console.log(`Downloading template ${templateId} from ${downloadUrl}`)
              window.open(downloadUrl, '_blank')
            }}
          />
        </TabsContent>

        <TabsContent value="resources" className="space-y-6">
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <div className="h-5 w-5 text-red-600">⚠️</div>
                  <p className="text-red-800">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={fetchAgentResources}
                    className="ml-auto"
                  >
                    Try Again
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {agentResources.length === 0 && !error ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Share2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Resources Shared Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Your advisory team will share helpful resources and documents here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {agentResources.map((resource) => (
                <Card key={resource.id} className="hover:shadow-sm transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg mb-2">{resource.title}</CardTitle>
                        <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <FileText className="h-3 w-3" />
                            {resource.fileName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {new Date(resource.uploadedAt).toLocaleDateString()}
                          </div>
                          {resource.programRelevant && (
                            <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                              Program Relevant
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        onClick={() => handleResourceDownload(resource)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

    </div>
  )
}