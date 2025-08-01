'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  FileText,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  User,
  DollarSign,
  Briefcase,
  FileCheck,
  RefreshCw
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentTemplate {
  id: string
  name: string
  description: string
  category: string
  downloadUrl: string
  requirements: string[]
  isRelevant?: boolean
}

interface DocumentTemplatesProps {
  applicationId?: string
  clientId?: string
  onTemplateDownload?: (templateId: string, downloadUrl: string) => void
  className?: string
}

export function DocumentTemplates({ 
  applicationId, 
  clientId,
  onTemplateDownload,
  className 
}: DocumentTemplatesProps) {
  const [templates, setTemplates] = useState<Record<string, DocumentTemplate[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [downloadingTemplate, setDownloadingTemplate] = useState<string | null>(null)

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const token = localStorage.getItem('clientToken')
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {}
      
      const url = new URL('/api/client/documents/templates', window.location.origin)
      if (applicationId) {
        url.searchParams.set('applicationId', applicationId)
      }
      
      const response = await fetch(url.toString(), { headers })
      
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || {})
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load templates')
      }
    } catch (err) {
      console.error('Error fetching templates:', err)
      setError('Network error while loading templates')
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'personal':
        return <User className="h-5 w-5 text-purple-600" />
      case 'financial':
        return <DollarSign className="h-5 w-5 text-green-600" />
      case 'professional':
        return <Briefcase className="h-5 w-5 text-blue-600" />
      case 'investment':
        return <DollarSign className="h-5 w-5 text-emerald-600" />
      case 'application':
        return <FileCheck className="h-5 w-5 text-indigo-600" />
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
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

  const getCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
  }

  const handleDownloadTemplate = async (template: DocumentTemplate) => {
    try {
      setDownloadingTemplate(template.id)
      
      const token = localStorage.getItem('clientToken')
      const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
      
      const response = await fetch('/api/client/documents/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ templateId: template.id })
      })
      
      if (response.ok) {
        const data = await response.json()
        
        // Trigger download
        if (onTemplateDownload) {
          onTemplateDownload(template.id, data.downloadUrl)
        } else {
          // Default download behavior
          window.open(data.downloadUrl, '_blank')
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Download failed' }))
        alert(`Failed to download template: ${errorData.error}`)
      }
    } catch (err) {
      console.error('Error downloading template:', err)
      alert('Error downloading template. Please try again.')
    } finally {
      setDownloadingTemplate(null)
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading templates...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn("border-red-200 bg-red-50", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
            <Button onClick={fetchTemplates} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const categoryKeys = Object.keys(templates)
  if (categoryKeys.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Templates Available</h3>
          <p className="text-gray-600">Templates will be available based on your application requirements.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {categoryKeys.map((category) => {
        const categoryTemplates = templates[category] || []
        const relevantTemplates = categoryTemplates.filter(t => t.isRelevant)
        const otherTemplates = categoryTemplates.filter(t => !t.isRelevant)
        
        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {getCategoryIcon(category)}
                <span>{getCategoryLabel(category)} Documents</span>
                <Badge variant="outline" className={getCategoryColor(category)}>
                  {categoryTemplates.length} template{categoryTemplates.length !== 1 ? 's' : ''}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Relevant Templates First */}
                {relevantTemplates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4 bg-blue-50 border-blue-200">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-gray-900">{template.name}</h4>
                          <Badge className="bg-blue-100 text-blue-800 text-xs">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Recommended
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="text-xs text-gray-500">
                          <strong>Requirements:</strong> {template.requirements.slice(0, 2).join(', ')}
                          {template.requirements.length > 2 && ` and ${template.requirements.length - 2} more`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleDownloadTemplate(template)}
                          disabled={downloadingTemplate === template.id}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {downloadingTemplate === template.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(template.downloadUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Other Templates */}
                {otherTemplates.map((template) => (
                  <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                        <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                        <div className="text-xs text-gray-500">
                          <strong>Requirements:</strong> {template.requirements.slice(0, 2).join(', ')}
                          {template.requirements.length > 2 && ` and ${template.requirements.length - 2} more`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownloadTemplate(template)}
                          disabled={downloadingTemplate === template.id}
                        >
                          {downloadingTemplate === template.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <Download className="h-4 w-4 mr-1" />
                          )}
                          Download
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => window.open(template.downloadUrl, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}