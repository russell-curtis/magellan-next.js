// components/ui/document-quality-checker.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { DocumentQualityResult, DocumentQualityIssue, getDocumentGuidelines } from '@/lib/document-validation'
import { AlertCircle, CheckCircle, AlertTriangle, Info, FileText, Camera, Lightbulb } from 'lucide-react'

interface DocumentQualityCheckerProps {
  documentType: string
  onValidationComplete?: (result: DocumentQualityResult) => void
  showGuidelines?: boolean
}

export function DocumentQualityChecker({ 
  documentType, 
  onValidationComplete,
  showGuidelines = true
}: DocumentQualityCheckerProps) {
  const [validationResult, setValidationResult] = useState<DocumentQualityResult | null>(null)
  const [isValidating, setIsValidating] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const guidelines = getDocumentGuidelines(documentType)

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file) return

    setIsValidating(true)
    setValidationResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('documentType', documentType)

      const response = await fetch('/api/documents/validate', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        throw new Error('Validation failed')
      }

      const data = await response.json()
      const result = data.validation as DocumentQualityResult

      setValidationResult(result)
      onValidationComplete?.(result)

    } catch (error) {
      console.error('Document validation error:', error)
      const errorResult: DocumentQualityResult = {
        isValid: false,
        quality: 'poor',
        issues: [{
          type: 'readability',
          severity: 'critical',
          message: 'Unable to validate document',
          suggestion: 'Please try again or contact support'
        }],
        recommendations: ['Try uploading the file again'],
        metadata: {
          fileSize: file.size,
          format: file.name.split('.').pop()?.toLowerCase() || 'unknown'
        }
      }
      setValidationResult(errorResult)
      onValidationComplete?.(errorResult)
    } finally {
      setIsValidating(false)
    }
  }, [documentType, onValidationComplete])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = e.dataTransfer.files
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      handleFileSelect(files[0])
    }
  }, [handleFileSelect])

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600 bg-green-50 border-green-200'
      case 'good': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'fair': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'poor': return 'text-red-600 bg-red-50 border-red-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      case 'info': return <Info className="w-4 h-4 text-blue-500" />
      default: return <Info className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
          ${isValidating ? 'pointer-events-none opacity-50' : 'hover:border-gray-400'}
        `}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center space-y-4">
          <div className="p-3 bg-white rounded-full shadow-sm">
            {isValidating ? (
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-8 h-8 text-gray-400" />
            )}
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-medium text-gray-900">
              {isValidating ? 'Analyzing Document...' : 'Upload Document for Quality Check'}
            </h3>
            <p className="text-sm text-gray-600">
              {isValidating ? 
                'Please wait while we analyze your document quality' :
                'Drag and drop your file here, or click to select'
              }
            </p>
          </div>

          {!isValidating && (
            <div>
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileInputChange}
              />
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer transition-colors duration-200"
              >
                <FileText className="w-4 h-4 mr-2" />
                Select File
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Validation Results */}
      {validationResult && (
        <div className="space-y-4">
          {/* Quality Summary */}
          <div className={`p-4 rounded-lg border ${getQualityColor(validationResult.quality)}`}>
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
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Issues Found:</h5>
              {validationResult.issues.map((issue, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-md">
                  {getIssueIcon(issue.severity)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                    <p className="text-sm text-gray-600 mt-1">{issue.suggestion}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Recommendations */}
          {validationResult.recommendations.length > 0 && (
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900">Recommendations:</h5>
              <div className="space-y-2">
                {validationResult.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <Lightbulb className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-700">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-600">File Size</p>
              <p className="text-sm text-gray-900">
                {(validationResult.metadata.fileSize / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Format</p>
              <p className="text-sm text-gray-900 uppercase">
                {validationResult.metadata.format}
              </p>
            </div>
            {validationResult.metadata.dimensions && (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolution</p>
                  <p className="text-sm text-gray-900">
                    {validationResult.metadata.dimensions.width} × {validationResult.metadata.dimensions.height}
                  </p>
                </div>
                {validationResult.metadata.resolution && (
                  <div>
                    <p className="text-sm font-medium text-gray-600">DPI</p>
                    <p className="text-sm text-gray-900">
                      {validationResult.metadata.resolution}
                    </p>
                  </div>
                )}
              </>
            )}
            {validationResult.metadata.pageCount && (
              <div>
                <p className="text-sm font-medium text-gray-600">Pages</p>
                <p className="text-sm text-gray-900">
                  {validationResult.metadata.pageCount}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Document Guidelines */}
      {showGuidelines && (
        <div className="border rounded-lg p-6 bg-blue-50 border-blue-200">
          <h4 className="font-medium text-blue-900 mb-4">{guidelines.title}</h4>
          
          <div className="space-y-4">
            <div>
              <h5 className="text-sm font-medium text-blue-800 mb-2">Requirements:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                {guidelines.requirements.map((requirement, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{requirement}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h5 className="text-sm font-medium text-blue-800 mb-2">Tips:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                {guidelines.tips.map((tip, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <span className="text-blue-500 mt-1">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}