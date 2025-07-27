// components/ui/enhanced-document-upload.tsx
'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { DocumentQualityResult } from '@/lib/document-validation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  CheckCircle, 
  AlertCircle, 
  Upload, 
  FileText, 
  X,
  Eye,
  RotateCcw,
  AlertTriangle,
  Info
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DocumentRequirement {
  id: string
  stageId?: string
  documentName: string
  description: string
  category: 'personal' | 'financial' | 'legal' | 'medical' | 'investment'
  isRequired: boolean
  isClientUploadable: boolean
  acceptedFormats: string[]
  maxFileSizeMB: number
  expirationMonths: number | null
  displayGroup: string
  helpText: string
  sortOrder: number
  status: 'pending' | 'uploaded' | 'under_review' | 'approved' | 'rejected' | 'expired'
  uploadedAt?: string
  reviewedAt?: string
  rejectionReason?: string
  fileName?: string
  fileSize?: number
  expiresAt?: string
}

interface EnhancedDocumentUploadProps {
  requirement: DocumentRequirement
  onUpload: (file: File, validationResult: DocumentQualityResult) => Promise<void>
  onView?: () => void
  canUpload?: boolean
  className?: string
}

export function EnhancedDocumentUpload({
  requirement,
  onUpload,
  onView,
  canUpload = true,
  className
}: EnhancedDocumentUploadProps) {
  const [uploadMode, setUploadMode] = useState<'select' | 'validate' | 'upload'>('select')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationResult, setValidationResult] = useState<DocumentQualityResult | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const handleFileSelect = useCallback(() => {
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = requirement.acceptedFormats.map(f => `.${f}`).join(',')
    
    fileInput.onchange = (event) => {
      const target = event.target as HTMLInputElement
      const files = target.files
      if (files && files.length > 0) {
        setSelectedFile(files[0])
        setUploadMode('validate')
        setUploadError(null)
      }
    }
    
    fileInput.click()
  }, [requirement.acceptedFormats])

  const handleValidationComplete = useCallback((result: DocumentQualityResult) => {
    setValidationResult(result)
  }, [])

  // Auto-validate when file is selected
  useEffect(() => {
    if (selectedFile && uploadMode === 'validate' && !validationResult) {
      const validateFile = async () => {
        try {
          const formData = new FormData()
          formData.append('file', selectedFile)
          formData.append('documentType', requirement.documentName)

          const response = await fetch('/api/documents/validate', {
            method: 'POST',
            body: formData
          })

          if (response.ok) {
            const data = await response.json()
            handleValidationComplete(data.validation)
          } else {
            console.error('Validation failed:', response.status)
            // Create fallback validation result
            handleValidationComplete({
              isValid: false,
              quality: 'poor',
              issues: [{
                type: 'readability',
                severity: 'warning',
                message: 'Unable to validate document quality',
                suggestion: 'Please ensure the file is not corrupted'
              }],
              recommendations: ['Try a different file format or rescan the document'],
              metadata: {
                fileSize: selectedFile.size,
                format: selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown'
              }
            })
          }
        } catch (error) {
          console.error('Validation error:', error)
          // Create fallback validation result
          handleValidationComplete({
            isValid: false,
            quality: 'poor',
            issues: [{
              type: 'readability',
              severity: 'warning',
              message: 'Validation service unavailable',
              suggestion: 'Document will be uploaded without quality validation'
            }],
            recommendations: ['Manual review recommended'],
            metadata: {
              fileSize: selectedFile.size,
              format: selectedFile.name.split('.').pop()?.toLowerCase() || 'unknown'
            }
          })
        }
      }
      validateFile()
    }
  }, [selectedFile, uploadMode, validationResult, requirement.documentName, handleValidationComplete])

  const handleUpload = useCallback(async () => {
    if (!selectedFile || !validationResult) return

    setIsUploading(true)
    setUploadError(null)

    try {
      await onUpload(selectedFile, validationResult)
      setUploadMode('select')
      setSelectedFile(null)
      setValidationResult(null)
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [selectedFile, validationResult, onUpload])

  const handleCancel = useCallback(() => {
    setUploadMode('select')
    setSelectedFile(null)
    setValidationResult(null)
    setUploadError(null)
  }, [])

  const getStatusDisplay = () => {
    switch (requirement.status) {
      case 'approved':
        return {
          icon: <CheckCircle className="w-5 h-5 text-green-600" />,
          badge: 'Approved',
          badgeClass: 'bg-green-100 text-green-800'
        }
      case 'under_review':
        return {
          icon: <AlertCircle className="w-5 h-5 text-yellow-600" />,
          badge: 'Under Review',
          badgeClass: 'bg-yellow-100 text-yellow-800'
        }
      case 'rejected':
        return {
          icon: <AlertCircle className="w-5 h-5 text-red-600" />,
          badge: 'Rejected',
          badgeClass: 'bg-red-100 text-red-800'
        }
      case 'uploaded':
        return {
          icon: <FileText className="w-5 h-5 text-blue-600" />,
          badge: 'Uploaded',
          badgeClass: 'bg-blue-100 text-blue-800'
        }
      default:
        return {
          icon: <FileText className="w-5 h-5 text-gray-400" />,
          badge: requirement.isRequired ? 'Required' : 'Optional',
          badgeClass: requirement.isRequired ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-blue-700'
        }
    }
  }

  const status = getStatusDisplay()

  return (
    <Card className={cn('border-l-4', {
      'border-l-green-500': requirement.status === 'approved',
      'border-l-yellow-500': requirement.status === 'under_review',
      'border-l-red-500': requirement.status === 'rejected',
      'border-l-blue-500': requirement.status === 'uploaded',
      'border-l-gray-300': requirement.status === 'pending'
    }, className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3">
            {status.icon}
            <div className="flex-1">
              <CardTitle className="text-base font-medium">
                {requirement.documentName}
                {requirement.isRequired && <span className="text-red-500 ml-1">*</span>}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">{requirement.description}</p>
              
              {/* File details if uploaded */}
              {requirement.fileName && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                  <span>{requirement.fileName}</span>
                  {requirement.fileSize && (
                    <span>{(requirement.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  {requirement.uploadedAt && (
                    <span>Uploaded {new Date(requirement.uploadedAt).toLocaleDateString()}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Badge className={status.badgeClass}>
              {status.badge}
            </Badge>
            {requirement.category && (
              <Badge variant="outline" className="text-xs">
                {requirement.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {uploadError && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              {uploadError}
            </AlertDescription>
          </Alert>
        )}

        {uploadMode === 'select' && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              {canUpload && (
                <Button
                  onClick={handleFileSelect}
                  variant="outline"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Upload className="w-4 h-4" />
                  <span>{requirement.status === 'pending' ? 'Upload' : 'Replace'}</span>
                </Button>
              )}
              
              {onView && requirement.status !== 'pending' && (
                <Button
                  onClick={onView}
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2"
                >
                  <Eye className="w-4 h-4" />
                  <span>View</span>
                </Button>
              )}
            </div>

            {/* Format and size info */}
            <div className="text-xs text-gray-500 space-y-1">
              <p>Accepted formats: {requirement.acceptedFormats.join(', ').toUpperCase()}</p>
              <p>Maximum size: {requirement.maxFileSizeMB}MB</p>
            </div>
          </div>
        )}

        {uploadMode === 'validate' && selectedFile && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Document Quality Check</h4>
              <Button
                onClick={handleCancel}
                variant="ghost"
                size="sm"
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Run validation immediately when file is selected */}
            {!validationResult && (
              <div className="text-center p-4">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-600">Analyzing document quality...</p>
              </div>
            )}


            {validationResult && (
              <div className="space-y-4">
                {/* Quality Summary */}
                <div className={`p-4 rounded-lg border ${
                  validationResult.quality === 'excellent' ? 'text-green-600 bg-green-50 border-green-200' :
                  validationResult.quality === 'good' ? 'text-blue-600 bg-blue-50 border-blue-200' :
                  validationResult.quality === 'fair' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                  'text-red-600 bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center space-x-3">
                    {validationResult.isValid ? (
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    ) : (
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    )}
                    <div>
                      <h4 className="font-medium">
                        Document Quality: {validationResult.quality.charAt(0).toUpperCase() + validationResult.quality.slice(1)}
                      </h4>
                      <p className="text-sm opacity-75">
                        {validationResult.isValid ? 
                          'Document meets minimum requirements' : 
                          'Document has issues that need attention'
                        }
                      </p>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {validationResult.issues.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900">Issues Found:</h5>
                    {validationResult.issues.map((issue, index) => (
                      <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                        {issue.severity === 'critical' ? (
                          <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                        ) : issue.severity === 'warning' ? (
                          <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5" />
                        ) : (
                          <Info className="w-4 h-4 text-blue-500 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                          <p className="text-sm text-gray-600 mt-1">{issue.suggestion}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="sm"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Select Different File
                  </Button>

                  <Button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="flex items-center space-x-2"
                    size="sm"
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>
                      {isUploading ? 'Uploading...' : 'Upload Document'}
                    </span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quality summary for uploaded documents */}
        {requirement.status !== 'pending' && uploadMode === 'select' && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="text-xs text-gray-600">
              <p className="font-medium mb-1">Document Information:</p>
              <div className="space-y-1">
                <p>Format: {requirement.fileName?.split('.').pop()?.toUpperCase()}</p>
                <p>Status: {status.badge}</p>
                {requirement.uploadedAt && (
                  <p>Uploaded: {new Date(requirement.uploadedAt).toLocaleDateString()}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}