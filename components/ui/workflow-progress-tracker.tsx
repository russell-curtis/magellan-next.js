'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { CheckCircle, Circle, Clock, AlertCircle, Package, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface WorkflowStage {
  id: string
  stageOrder: number
  stageName: string
  description: string
  estimatedDays: number
  isRequired: boolean
  canSkip: boolean
  autoProgress: boolean
  status: 'pending' | 'in_progress' | 'completed' | 'blocked'
  startedAt?: string
  completedAt?: string
  progress?: number // 0-100 for in_progress stages
  documentCount?: number
  completedDocuments?: number
}

export interface WorkflowProgressTrackerProps {
  stages: WorkflowStage[]
  currentStageId?: string
  showTimeline?: boolean
  compact?: boolean
  className?: string
  onOriginalDocumentsClick?: () => void // Callback for navigating to Original Documents tab
}

export function WorkflowProgressTracker({
  stages,
  currentStageId,
  showTimeline = true,
  compact = false,
  className,
  onOriginalDocumentsClick
}: WorkflowProgressTrackerProps) {
  const [expandedStage, setExpandedStage] = useState<string | null>(null)

  const getStageIcon = (stage: WorkflowStage) => {
    switch (stage.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'blocked':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStageStatus = (stage: WorkflowStage) => {
    switch (stage.status) {
      case 'completed':
        return { label: 'Completed', color: 'bg-green-100 text-green-800' }
      case 'in_progress':
        return { label: 'In Progress', color: 'bg-blue-100 text-blue-800' }
      case 'blocked':
        return { label: 'Blocked', color: 'bg-red-100 text-red-800' }
      default:
        return { label: 'Pending', color: 'bg-gray-100 text-gray-800' }
    }
  }

  const getOverallProgress = () => {
    const completedStages = stages.filter(s => s.status === 'completed').length
    return Math.round((completedStages / stages.length) * 100)
  }

  const getCurrentStage = () => {
    return stages.find(s => s.id === currentStageId) || 
           stages.find(s => s.status === 'in_progress') ||
           stages.find(s => s.status === 'pending')
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  if (compact) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Workflow Progress</CardTitle>
            <Badge variant="secondary" className="text-sm">
              {getOverallProgress()}% Complete
            </Badge>
          </div>
          <Progress value={getOverallProgress()} className="w-full" />
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span>Current Stage:</span>
            <span className="font-medium text-foreground">
              {getCurrentStage()?.stageName || 'Not Started'}
            </span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Application Workflow Progress</CardTitle>
            <CardDescription>
              Track progress through all required stages for this citizenship application
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">{getOverallProgress()}%</div>
            <div className="text-sm text-muted-foreground">Complete</div>
          </div>
        </div>
        <Progress value={getOverallProgress()} className="w-full mt-4" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {stages.map((stage, index) => {
            const status = getStageStatus(stage)
            const isExpanded = expandedStage === stage.id
            const isActive = stage.id === currentStageId || stage.status === 'in_progress'
            
            return (
              <div key={stage.id} className="relative">
                {/* Timeline connector */}
                {showTimeline && index < stages.length - 1 && (
                  <div className="absolute left-6 top-12 h-8 w-px bg-gray-200" />
                )}
                
                <div
                  className={cn(
                    "flex items-start space-x-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50",
                    isActive && "bg-blue-50 border-blue-200",
                    isExpanded && "bg-gray-50"
                  )}
                  onClick={() => setExpandedStage(isExpanded ? null : stage.id)}
                >
                  {/* Stage Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getStageIcon(stage)}
                  </div>
                  
                  {/* Stage Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">
                          {stage.stageOrder}. {stage.stageName}
                        </h3>
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                        <span>{stage.estimatedDays} days</span>
                        {stage.documentCount !== undefined && (
                          <span>
                            • {stage.completedDocuments || 0}/{stage.documentCount} docs
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{stage.description}</p>
                    
                    {/* Special handling for Original Documents Collection stage */}
                    {stage.stageName === 'Original Documents Collection' && onOriginalDocumentsClick && (
                      <div className="mb-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation() // Prevent stage expansion
                            onOriginalDocumentsClick()
                          }}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                          <Package className="mr-2 h-4 w-4" />
                          View Original Documents
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    
                    {/* Progress bar for in-progress stages */}
                    {stage.status === 'in_progress' && stage.progress !== undefined && (
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Stage Progress</span>
                          <span>{stage.progress}%</span>
                        </div>
                        <Progress value={stage.progress} className="w-full h-2" />
                      </div>
                    )}
                    
                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Required:</span>
                            <span className="ml-2 font-medium">
                              {stage.isRequired ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Can Skip:</span>
                            <span className="ml-2 font-medium">
                              {stage.canSkip ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Auto Progress:</span>
                            <span className="ml-2 font-medium">
                              {stage.autoProgress ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Estimated Duration:</span>
                            <span className="ml-2 font-medium">
                              {stage.estimatedDays} {stage.estimatedDays === 1 ? 'day' : 'days'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Dates */}
                        {(stage.startedAt || stage.completedAt) && (
                          <div className="pt-2 border-t border-gray-100">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              {stage.startedAt && (
                                <div>
                                  <span className="text-muted-foreground">Started:</span>
                                  <span className="ml-2 font-medium">
                                    {formatDate(stage.startedAt)}
                                  </span>
                                </div>
                              )}
                              {stage.completedAt && (
                                <div>
                                  <span className="text-muted-foreground">Completed:</span>
                                  <span className="ml-2 font-medium">
                                    {formatDate(stage.completedAt)}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}