'use client'

import { useState, useCallback, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

export interface UploadFile {
  file: File
  id: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  errorMessage?: string
}

export interface DocumentUploadZoneProps {
  acceptedFormats: string[]
  maxFileSizeMB: number
  multiple?: boolean
  disabled?: boolean
  className?: string
  onFilesSelected?: (files: File[]) => void
  onUpload?: (files: UploadFile[]) => Promise<void>
  onFileRemove?: (fileId: string) => void
  children?: React.ReactNode
}

export function DocumentUploadZone({
  acceptedFormats,
  maxFileSizeMB,
  multiple = false,
  disabled = false,
  className,
  onFilesSelected,
  onUpload,
  onFileRemove,
  children
}: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxFileSizeMB) {
      return `File size (${fileSizeMB.toFixed(1)}MB) exceeds maximum allowed size of ${maxFileSizeMB}MB`
    }

    // Check file format
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (fileExtension && !acceptedFormats.includes(fileExtension)) {
      return `File format .${fileExtension} is not supported. Accepted formats: ${acceptedFormats.join(', ')}`
    }

    return null
  }, [acceptedFormats, maxFileSizeMB])

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase()
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(extension || '')) {
      return <Image className="h-5 w-5 text-blue-600" />
    } else if (['pdf'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-red-600" />
    } else if (['doc', 'docx'].includes(extension || '')) {
      return <FileText className="h-5 w-5 text-blue-700" />
    } else {
      return <File className="h-5 w-5 text-gray-600" />
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`
  }

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newUploadFiles: UploadFile[] = []
    const validFiles: File[] = []

    fileArray.forEach((file) => {
      const validationError = validateFile(file)
      const uploadFile: UploadFile = {
        file,
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        progress: 0,
        status: validationError ? 'error' : 'pending',
        errorMessage: validationError || undefined
      }
      
      newUploadFiles.push(uploadFile)
      
      if (!validationError) {
        validFiles.push(file)
      }
    })

    setUploadFiles(prev => multiple ? [...prev, ...newUploadFiles] : newUploadFiles)
    
    if (validFiles.length > 0) {
      onFilesSelected?.(validFiles)
    }
  }, [validateFile, multiple, onFilesSelected])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }, [disabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFiles(files)
    }
  }, [disabled, handleFiles])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFiles(files)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [handleFiles])

  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }, [disabled])

  const handleUpload = async () => {
    if (!onUpload) return

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending')
    if (pendingFiles.length === 0) return

    // Set files to uploading status
    setUploadFiles(prev => prev.map(f => 
      f.status === 'pending' ? { ...f, status: 'uploading' as const } : f
    ))

    try {
      await onUpload(pendingFiles)
      
      // Mark as completed
      setUploadFiles(prev => prev.map(f => 
        pendingFiles.find(pf => pf.id === f.id) 
          ? { ...f, status: 'completed' as const, progress: 100 }
          : f
      ))
    } catch {
      // Mark as error
      setUploadFiles(prev => prev.map(f => 
        pendingFiles.find(pf => pf.id === f.id)
          ? { ...f, status: 'error' as const, errorMessage: 'Upload failed' }
          : f
      ))
    }
  }

  const removeFile = useCallback((fileId: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== fileId))
    onFileRemove?.(fileId)
  }, [onFileRemove])

  const acceptString = acceptedFormats.map(format => `.${format}`).join(',')
  const hasValidFiles = uploadFiles.some(f => f.status === 'pending' || f.status === 'completed')
  const hasPendingFiles = uploadFiles.some(f => f.status === 'pending')
  const hasUploadingFiles = uploadFiles.some(f => f.status === 'uploading')

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload Zone */}
      <Card
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragOver && !disabled && "border-blue-500 bg-blue-50",
          disabled && "opacity-50 cursor-not-allowed",
          !isDragOver && !disabled && "border-gray-300 hover:border-gray-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
      >
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center space-y-4">
            <div className={cn(
              "p-4 rounded-full",
              isDragOver ? "bg-blue-100" : "bg-gray-100"
            )}>
              <Upload className={cn(
                "h-8 w-8",
                isDragOver ? "text-blue-600" : "text-gray-600"
              )} />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-medium text-gray-900">
                {isDragOver ? 'Drop files here' : 'Upload Documents'}
              </h3>
              <p className="text-sm text-gray-600">
                Drag and drop files here, or click to browse
              </p>
              <div className="text-xs text-gray-500 space-y-1">
                <div>Accepted formats: {acceptedFormats.join(', ').toUpperCase()}</div>
                <div>Maximum file size: {maxFileSizeMB}MB</div>
                {multiple && <div>Multiple files allowed</div>}
              </div>
            </div>

            {children && (
              <div className="mt-4">
                {children}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptString}
        multiple={multiple}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Selected Files</h4>
          <div className="space-y-2">
            {uploadFiles.map((uploadFile) => (
              <div
                key={uploadFile.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border",
                  uploadFile.status === 'completed' && "bg-green-50 border-green-200",
                  uploadFile.status === 'error' && "bg-red-50 border-red-200",
                  uploadFile.status === 'uploading' && "bg-blue-50 border-blue-200",
                  uploadFile.status === 'pending' && "bg-gray-50 border-gray-200"
                )}
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getFileIcon(uploadFile.file.name)}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {uploadFile.file.name}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({formatFileSize(uploadFile.file.size)})
                      </span>
                    </div>
                    
                    {uploadFile.errorMessage && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertCircle className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-600">{uploadFile.errorMessage}</span>
                      </div>
                    )}
                    
                    {uploadFile.status === 'uploading' && (
                      <div className="mt-2">
                        <Progress value={uploadFile.progress} className="w-full h-2" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {uploadFile.status === 'uploading' && (
                    <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  )}
                  {uploadFile.status === 'completed' && (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  )}
                  {uploadFile.status === 'error' && (
                    <AlertCircle className="h-4 w-4 text-red-600" />
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadFile.id)}
                    disabled={uploadFile.status === 'uploading'}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {hasValidFiles && onUpload && (
        <div className="flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!hasPendingFiles || hasUploadingFiles || disabled}
            className="flex items-center space-x-2"
          >
            {hasUploadingFiles ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>Upload Files</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}