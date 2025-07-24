'use client'

import { useState, useCallback, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Upload, 
  File, 
  X, 
  CheckCircle, 
  AlertCircle,
  FileText,
  FileSpreadsheet,
  FileImage
} from 'lucide-react'
import { 
  DOCUMENT_TYPES, 
  DOCUMENT_CATEGORIES, 
  MAX_FILE_SIZE 
} from '@/lib/validations/documents'

interface Client {
  id: string
  firstName: string
  lastName: string
  email?: string
}

interface Application {
  id: string
  applicationNumber: string
  program: {
    countryName: string
    programName: string
  }
  client: {
    firstName: string
    lastName: string
  }
}

interface DocumentUploadProps {
  clientId?: string
  applicationId?: string
  onUploadComplete?: (document: { id: string; filename: string; fileUrl: string; contentType: string; fileSize: number }) => void
  allowMultiple?: boolean
  showClientSelection?: boolean
  showApplicationSelection?: boolean
  className?: string
}

interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
  documentType: string
  category: string
  description: string
  clientId: string
  applicationId: string
}

export function DocumentUpload({ 
  clientId, 
  applicationId, 
  onUploadComplete, 
  allowMultiple = true,
  showClientSelection = false,
  showApplicationSelection = false,
  className 
}: DocumentUploadProps) {
  const [files, setFiles] = useState<UploadFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loadingData, setLoadingData] = useState(false)
  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      status: 'pending',
      progress: 0,
      documentType: 'other',
      category: 'other',
      description: '',
      clientId: clientId || 'none',
      applicationId: applicationId || 'none'
    }))

    if (allowMultiple) {
      setFiles(prev => [...prev, ...newFiles])
    } else {
      setFiles(newFiles.slice(0, 1))
    }
  }, [allowMultiple, clientId, applicationId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/gif': ['.gif'],
      'image/webp': ['.webp'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    } satisfies Record<string, string[]>,
    maxSize: MAX_FILE_SIZE,
    multiple: allowMultiple
  })

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId))
  }

  const updateFileMetadata = (fileId: string, field: string, value: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, [field]: value } : f
    ))
  }

  const fetchData = useCallback(async () => {
    if (!showClientSelection && !showApplicationSelection) return
    
    setLoadingData(true)
    try {
      const requests = []
      
      if (showClientSelection) {
        requests.push(fetch('/api/clients'))
      }
      
      if (showApplicationSelection) {
        // If we have a clientId, filter applications for that client
        const applicationsUrl = clientId 
          ? `/api/applications?clientId=${clientId}`
          : '/api/applications'
        requests.push(fetch(applicationsUrl))
      }
      
      const responses = await Promise.all(requests)
      
      let responseIndex = 0
      
      if (showClientSelection && responses[responseIndex]?.ok) {
        const clientsData = await responses[responseIndex].json()
        setClients(clientsData.clients || [])
        responseIndex++
      }
      
      if (showApplicationSelection && responses[responseIndex]?.ok) {
        const applicationsData = await responses[responseIndex].json()
        setApplications(applicationsData.applications || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoadingData(false)
    }
  }, [showClientSelection, showApplicationSelection, clientId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData()
    formData.append('file', uploadFile.file)
    
    // Use client and application from file metadata or props
    const finalClientId = uploadFile.clientId !== 'none' ? uploadFile.clientId : (clientId || null)
    const finalApplicationId = uploadFile.applicationId !== 'none' ? uploadFile.applicationId : (applicationId || null)
    
    if (finalClientId) formData.append('clientId', finalClientId)
    if (finalApplicationId) formData.append('applicationId', finalApplicationId)
    formData.append('documentType', uploadFile.documentType)
    formData.append('category', uploadFile.category)
    if (uploadFile.description) formData.append('description', uploadFile.description)

    // Update file status to uploading
    setFiles(prev => prev.map(f => 
      f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
    ))

    try {
      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      // Update file status to success
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
      ))

      onUploadComplete?.(result.document)
      
      toast({
        title: 'Success',
        description: `${uploadFile.file.name} uploaded successfully`
      })

    } catch (error) {
      console.error('Upload error:', error)
      
      // Update file status to error
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { 
          ...f, 
          status: 'error', 
          progress: 0,
          error: error instanceof Error ? error.message : 'Upload failed'
        } : f
      ))

      toast({
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      })
    }
  }

  const uploadAllFiles = async () => {
    if (files.length === 0) return

    setIsUploading(true)
    
    // Upload files sequentially to avoid overwhelming the server
    for (const file of files.filter(f => f.status === 'pending')) {
      await uploadFile(file)
    }
    
    setIsUploading(false)
  }

  const getFileIcon = (file: File) => {
    const type = file.type
    if (type.startsWith('image/')) return <FileImage className="h-5 w-5" />
    if (type === 'application/pdf') return <FileText className="h-5 w-5" />
    if (type.includes('spreadsheet') || type.includes('excel')) return <FileSpreadsheet className="h-5 w-5" />
    return <File className="h-5 w-5" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const pendingFiles = files.filter(f => f.status === 'pending')
  const hasFiles = files.length > 0

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Drop Zone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-sm text-gray-400">
                PDF, DOC, DOCX, XLS, XLSX, Images, TXT, CSV (max 25MB)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {hasFiles && (
          <div className="space-y-3">
            {files.map((uploadFile) => (
              <div key={uploadFile.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFileIcon(uploadFile.file)}
                    <div>
                      <p className="font-medium">{uploadFile.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(uploadFile.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {uploadFile.status === 'success' && (
                      <Badge className="bg-green-100 text-green-800">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Uploaded
                      </Badge>
                    )}
                    {uploadFile.status === 'error' && (
                      <Badge variant="destructive">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Error
                      </Badge>
                    )}
                    {uploadFile.status === 'uploading' && (
                      <Badge className="bg-blue-100 text-blue-800">
                        Uploading...
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      disabled={uploadFile.status === 'uploading'}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {uploadFile.status === 'uploading' && (
                  <Progress value={uploadFile.progress} className="w-full" />
                )}

                {uploadFile.status === 'error' && uploadFile.error && (
                  <p className="text-sm text-red-600">{uploadFile.error}</p>
                )}

                {uploadFile.status === 'pending' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor={`docType-${uploadFile.id}`}>Document Type *</Label>
                      <Select
                        value={uploadFile.documentType}
                        onValueChange={(value) => updateFileMetadata(uploadFile.id, 'documentType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENT_TYPES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`category-${uploadFile.id}`}>Category</Label>
                      <Select
                        value={uploadFile.category}
                        onValueChange={(value) => updateFileMetadata(uploadFile.id, 'category', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOCUMENT_CATEGORIES).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`desc-${uploadFile.id}`}>Description</Label>
                      <Input
                        id={`desc-${uploadFile.id}`}
                        placeholder="Optional description"
                        value={uploadFile.description}
                        onChange={(e) => updateFileMetadata(uploadFile.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* Client Selection */}
                    {showClientSelection && (
                      <div className="space-y-2">
                        <Label htmlFor={`client-${uploadFile.id}`}>Assign to Client</Label>
                        <Select
                          value={uploadFile.clientId}
                          onValueChange={(value) => updateFileMetadata(uploadFile.id, 'clientId', value)}
                          disabled={loadingData}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingData ? "Loading clients..." : "Select client (optional)"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No client assigned</SelectItem>
                            {clients.map((client) => (
                              <SelectItem key={client.id} value={client.id}>
                                {client.firstName} {client.lastName}
                                {client.email && (
                                  <span className="text-xs text-gray-500 ml-2">({client.email})</span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Application Selection */}
                    {showApplicationSelection && (
                      <div className="space-y-2">
                        <Label htmlFor={`app-${uploadFile.id}`}>Assign to Application</Label>
                        <Select
                          value={uploadFile.applicationId}
                          onValueChange={(value) => updateFileMetadata(uploadFile.id, 'applicationId', value)}
                          disabled={loadingData}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder={loadingData ? "Loading applications..." : "Select application (optional)"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No application assigned</SelectItem>
                            {applications.map((app) => (
                              <SelectItem key={app.id} value={app.id}>
                                {app.applicationNumber} - {app.program.countryName} 
                                <span className="text-xs text-gray-500 ml-2">
                                  ({app.client.firstName} {app.client.lastName})
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload Button */}
        {pendingFiles.length > 0 && (
          <Button 
            onClick={uploadAllFiles} 
            disabled={isUploading}
            className="w-full"
          >
            {isUploading ? 'Uploading...' : `Upload ${pendingFiles.length} File${pendingFiles.length !== 1 ? 's' : ''}`}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}