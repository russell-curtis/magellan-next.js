'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircle, 
  Circle, 
  Upload, 
  Eye, 
  AlertCircle, 
  Clock, 
  FileText,
  HelpCircle,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

export interface DocumentRequirement {
  id: string
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

export interface DocumentChecklistCardProps {
  requirements: DocumentRequirement[]
  stageTitle: string
  stageDescription?: string
  isCurrentStage?: boolean
  canUpload?: boolean
  onUpload?: (requirementId: string) => void
  onView?: (requirementId: string) => void
  className?: string
}

export function DocumentChecklistCard({
  requirements,
  stageTitle,
  stageDescription,
  isCurrentStage = false,
  canUpload = true,
  onUpload,
  onView,
  className
}: DocumentChecklistCardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  const toggleGroup = useCallback((groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev)
      if (newSet.has(groupName)) {
        newSet.delete(groupName)
      } else {
        newSet.add(groupName)
      }
      return newSet
    })
  }, [])

  const getStatusIcon = (requirement: DocumentRequirement) => {
    switch (requirement.status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'uploaded':
      case 'under_review':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'rejected':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      case 'expired':
        return <AlertCircle className="h-4 w-4 text-orange-600" />
      default:
        return <Circle className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusBadge = (requirement: DocumentRequirement) => {
    switch (requirement.status) {
      case 'approved':
        return { label: 'Approved', color: 'bg-green-100 text-green-800' }
      case 'uploaded':
        return { label: 'Uploaded', color: 'bg-blue-100 text-blue-800' }
      case 'under_review':
        return { label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' }
      case 'rejected':
        return { label: 'Rejected', color: 'bg-red-100 text-red-800' }
      case 'expired':
        return { label: 'Expired', color: 'bg-orange-100 text-orange-800' }
      default:
        return { label: requirement.isRequired ? 'Required' : 'Optional', 
                 color: requirement.isRequired ? 'bg-gray-100 text-gray-800' : 'bg-blue-50 text-blue-700' }
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal':
        return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'financial':
        return 'bg-green-50 text-green-700 border-green-200'
      case 'legal':
        return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'medical':
        return 'bg-red-50 text-red-700 border-red-200'
      case 'investment':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return mb < 1 ? `${(bytes / 1024).toFixed(1)} KB` : `${mb.toFixed(1)} MB`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const isExpiringSoon = (requirement: DocumentRequirement) => {
    if (!requirement.expiresAt) return false
    const daysUntilExpiry = Math.ceil(
      (new Date(requirement.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  }

  // Group requirements by displayGroup
  const groupedRequirements = requirements.reduce((groups, req) => {
    const group = req.displayGroup
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(req)
    return groups
  }, {} as Record<string, DocumentRequirement[]>)

  // Sort requirements within each group
  Object.values(groupedRequirements).forEach(group => {
    group.sort((a, b) => a.sortOrder - b.sortOrder)
  })

  // Calculate progress
  const totalRequired = requirements.filter(r => r.isRequired).length
  const completedRequired = requirements.filter(r => r.isRequired && r.status === 'approved').length
  const progressPercentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0

  return (
    <Card className={cn(
      "w-full",
      isCurrentStage && "border-blue-200 bg-blue-50/30",
      className
    )}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center space-x-2">
              <span>{stageTitle}</span>
              {isCurrentStage && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  Current Stage
                </Badge>
              )}
            </CardTitle>
            {stageDescription && (
              <CardDescription className="mt-2">{stageDescription}</CardDescription>
            )}
          </div>
          
          <div className="text-right">
            <div className="text-lg font-semibold text-primary">
              {completedRequired}/{totalRequired}
            </div>
            <div className="text-sm text-muted-foreground">Required</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Required Documents Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {Object.entries(groupedRequirements).map(([groupName, groupRequirements]) => {
          const isExpanded = expandedGroups.has(groupName)
          const groupCompleted = groupRequirements.filter(r => r.status === 'approved').length
          const groupTotal = groupRequirements.length

          return (
            <Collapsible key={groupName} open={isExpanded} onOpenChange={() => toggleGroup(groupName)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                    <span className="font-medium text-gray-900">{groupName}</span>
                    <Badge variant="outline" className="text-xs">
                      {groupCompleted}/{groupTotal}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {Math.round((groupCompleted / groupTotal) * 100)}% complete
                  </div>
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-2">
                <div className="space-y-3 pl-4 border-l-2 border-gray-100">
                  {groupRequirements.map((requirement) => {
                    const status = getStatusBadge(requirement)
                    
                    return (
                      <div
                        key={requirement.id}
                        className={cn(
                          "p-4 rounded-lg border",
                          requirement.status === 'approved' && "bg-green-50 border-green-200",
                          requirement.status === 'rejected' && "bg-red-50 border-red-200",
                          requirement.status === 'expired' && "bg-orange-50 border-orange-200",
                          (requirement.status === 'uploaded' || requirement.status === 'under_review') && "bg-blue-50 border-blue-200",
                          requirement.status === 'pending' && "bg-white border-gray-200"
                        )}
                      >
                        {/* Document Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start space-x-3 flex-1">
                            {getStatusIcon(requirement)}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900">
                                  {requirement.documentName}
                                </h4>
                                <Badge variant="outline" className={getCategoryColor(requirement.category)}>
                                  {requirement.category}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-2">
                                {requirement.description}
                              </p>
                            </div>
                          </div>
                          
                          <Badge variant="secondary" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>

                        {/* File Info */}
                        {requirement.fileName && (
                          <div className="mb-3 p-2 bg-white rounded border">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-4 w-4 text-gray-500" />
                              <span className="text-sm font-medium">{requirement.fileName}</span>
                              {requirement.fileSize && (
                                <span className="text-xs text-muted-foreground">
                                  ({formatFileSize(requirement.fileSize)})
                                </span>
                              )}
                            </div>
                            {requirement.uploadedAt && (
                              <div className="text-xs text-muted-foreground mt-1">
                                Uploaded {formatDate(requirement.uploadedAt)}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Rejection Reason */}
                        {requirement.status === 'rejected' && requirement.rejectionReason && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
                            <div className="flex items-start space-x-2">
                              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                              <div>
                                <div className="text-sm font-medium text-red-800">Rejection Reason</div>
                                <div className="text-sm text-red-700">{requirement.rejectionReason}</div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Expiration Warning */}
                        {isExpiringSoon(requirement) && (
                          <div className="mb-3 p-2 bg-orange-50 border border-orange-200 rounded">
                            <div className="flex items-center space-x-2">
                              <Clock className="h-4 w-4 text-orange-600" />
                              <span className="text-sm text-orange-800">
                                Expires {formatDate(requirement.expiresAt!)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Document Requirements */}
                        <div className="mb-3 text-xs text-muted-foreground space-y-1">
                          <div>Formats: {requirement.acceptedFormats.join(', ').toUpperCase()}</div>
                          <div>Max size: {requirement.maxFileSizeMB}MB</div>
                          {requirement.expirationMonths && (
                            <div>Valid for: {requirement.expirationMonths} months</div>
                          )}
                        </div>

                        {/* Help Text */}
                        {requirement.helpText && (
                          <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                            <div className="flex items-start space-x-2">
                              <HelpCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                              <span className="text-sm text-blue-800">{requirement.helpText}</span>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          {requirement.isClientUploadable && canUpload && (
                            <Button
                              variant={requirement.status === 'pending' ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => onUpload?.(requirement.id)}
                              className="flex items-center space-x-1"
                            >
                              <Upload className="h-3 w-3" />
                              <span>
                                {requirement.status === 'pending' ? 'Upload' : 'Replace'}
                              </span>
                            </Button>
                          )}
                          
                          {requirement.fileName && onView && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onView(requirement.id)}
                              className="flex items-center space-x-1"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View</span>
                            </Button>
                          )}

                          {!requirement.isClientUploadable && (
                            <div className="text-xs text-muted-foreground">
                              Managed by advisor
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )
        })}
      </CardContent>
    </Card>
  )
}