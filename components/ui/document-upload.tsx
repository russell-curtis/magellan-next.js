'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { 
  Upload, 
  X, 
  CheckCircle, 
  AlertCircle,
  File
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DocumentUploadProps {
  clientId: string
  onUploadComplete?: (document: {
    id: string
    filename: string
    fileUrl: string
    contentType: string
    fileSize: number
  }) => void
  onUploadError?: (error: string) => void
}

export function DocumentUpload({ 
  clientId, 
  onUploadComplete, 
  onUploadError 
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [uploadResult, setUploadResult] = useState<{
    success: boolean
    message: string
    document?: {
      id: string
      filename: string
      fileUrl: string
      contentType: string
      fileSize: number
    }
  } | null>(null)

  const { toast } = useToast()

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0])
      setUploadResult(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-powerpoint': ['.ppt'],
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z']
    }
  })

  const handleUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('clientId', clientId)
      if (description) {
        formData.append('description', description)
      }

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90))
      }, 200)

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setUploadResult({
        success: true,
        message: 'Document uploaded successfully',
        document: result.document
      })

      toast({
        title: 'Success',
        description: 'Document uploaded successfully'
      })

      onUploadComplete?.(result.document)

      // Reset form
      setTimeout(() => {
        setSelectedFile(null)
        setDescription('')
        setUploadProgress(0)
        setUploadResult(null)
      }, 2000)

    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      setUploadResult({
        success: false,
        message: errorMessage
      })

      toast({
        title: 'Upload Error',
        description: errorMessage,
        variant: 'destructive'
      })

      onUploadError?.(errorMessage)
    } finally {
      setUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const clearSelection = () => {
    setSelectedFile(null)
    setDescription('')
    setUploadResult(null)
    setUploadProgress(0)
  }

  return (
    <div className="space-y-4">
      {/* File Drop Zone */}
      {!selectedFile && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
            }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          {isDragActive ? (
            <p className="text-lg text-blue-600">Drop the document here...</p>
          ) : (
            <div>
              <p className="text-lg mb-2">Drag & drop a document here, or click to select</p>
              <p className="text-sm text-gray-500">
                Supported: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, images, TXT, CSV, ZIP, RAR, 7Z
              </p>
              <p className="text-xs text-gray-400 mt-1">Maximum file size: 25MB</p>
            </div>
          )}
        </div>
      )}

      {/* Selected File Info */}
      {selectedFile && !uploadResult && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearSelection}
              disabled={uploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Description Input */}
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Add a description for this document..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              className="resize-none"
              rows={3}
            />
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Uploading...</span>
                <span className="text-sm text-gray-600">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Upload Button */}
          <Button 
            onClick={handleUpload} 
            disabled={uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className={`border rounded-lg p-4 ${
          uploadResult.success 
            ? 'border-green-200 bg-green-50' 
            : 'border-red-200 bg-red-50'
        }`}>
          <div className="flex items-center space-x-2">
            {uploadResult.success ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <p className={`font-medium ${
              uploadResult.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {uploadResult.message}
            </p>
          </div>
          {uploadResult.success && uploadResult.document && (
            <p className="text-sm text-green-700 mt-1">
              File: {uploadResult.document.filename}
            </p>
          )}
        </div>
      )}
    </div>
  )
}