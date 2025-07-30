// Progress Calculation Utilities
// Provides consistent progress calculation across application views

export interface ApplicationProgressData {
  status: string
  submittedAt: string | null
  workflowProgress?: number
  completedStages?: number
  totalStages?: number
  documentsApproved?: number
  totalDocuments?: number
}

/**
 * Calculate application progress based on status and additional data
 * Returns a consistent progress percentage across the application
 */
export function calculateApplicationProgress(data: ApplicationProgressData): {
  progress: number
  stage: string
  description: string
} {
  const { status, workflowProgress, completedStages, totalStages, documentsApproved, totalDocuments } = data

  // If we have detailed workflow progress, use that
  if (workflowProgress !== undefined) {
    return {
      progress: Math.max(0, Math.min(100, workflowProgress)),
      stage: getStatusDisplayName(status),
      description: getProgressDescription(status, completedStages, totalStages)
    }
  }

  // If we have stage completion data, calculate based on that
  if (completedStages !== undefined && totalStages !== undefined && totalStages > 0) {
    const stageProgress = Math.round((completedStages / totalStages) * 100)
    return {
      progress: stageProgress,
      stage: getStatusDisplayName(status),
      description: `${completedStages} of ${totalStages} stages completed`
    }
  }

  // If we have document completion data, factor that in
  if (documentsApproved !== undefined && totalDocuments !== undefined && totalDocuments > 0) {
    const docProgress = Math.round((documentsApproved / totalDocuments) * 100)
    // Adjust status-based progress with document completion
    const baseProgress = getStatusBasedProgress(status)
    const adjustedProgress = Math.max(baseProgress, Math.min(baseProgress + 20, docProgress))
    
    return {
      progress: adjustedProgress,
      stage: getStatusDisplayName(status),
      description: `${documentsApproved} of ${totalDocuments} documents approved`
    }
  }

  // Fallback to status-based progression with more accurate percentages
  const progress = getStatusBasedProgress(status)
  return {
    progress,
    stage: getStatusDisplayName(status),
    description: getProgressDescription(status)
  }
}

/**
 * Get progress percentage based purely on application status
 * Updated to be more accurate and realistic
 */
function getStatusBasedProgress(status: string): number {
  switch (status) {
    case 'draft':
      return 0 // Not started yet
    case 'started':
      return 5 // Just begun, very early stage
    case 'submitted':
      return 45 // Internal review complete, ready for government
    case 'ready_for_submission':
      return 60 // Prepared for government submission
    case 'submitted_to_government':
      return 75 // Submitted to government, awaiting review
    case 'under_review':
      return 85 // Government is reviewing
    case 'approved':
      return 100 // Complete success
    case 'rejected':
      return 0 // Back to start for revisions
    case 'archived':
      return 0 // Not active
    default:
      return 0
  }
}

/**
 * Get user-friendly display name for status
 */
function getStatusDisplayName(status: string): string {
  switch (status) {
    case 'draft':
      return 'Draft'
    case 'started':
      return 'In Progress'
    case 'submitted':
      return 'Internal Review Complete'
    case 'ready_for_submission':
      return 'Ready for Government'
    case 'submitted_to_government':
      return 'Submitted to Government'
    case 'under_review':
      return 'Government Review'
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Requires Revision'
    case 'archived':
      return 'Archived'
    default:
      return 'Unknown'
  }
}

/**
 * Get descriptive text for progress
 */
function getProgressDescription(status: string, completedStages?: number, totalStages?: number): string {
  if (completedStages !== undefined && totalStages !== undefined) {
    return `${completedStages} of ${totalStages} stages completed`
  }

  switch (status) {
    case 'draft':
      return 'Application not yet started'
    case 'started':
      return 'Document preparation in progress'
    case 'submitted':
      return 'Internal review completed'
    case 'ready_for_submission':
      return 'Prepared for government submission'
    case 'submitted_to_government':
      return 'Submitted to government portal'
    case 'under_review':
      return 'Under government review'
    case 'approved':
      return 'Application approved'
    case 'rejected':
      return 'Requires revisions'
    default:
      return 'Contact your advisor for status'
  }
}

/**
 * Get the next step description for the current status
 */
export function getNextStepDescription(status: string): string {
  switch (status) {
    case 'draft':
      return 'Waiting for advisor to start application'
    case 'started':
      return 'Submit required documents'
    case 'submitted':
      return 'Awaiting government submission preparation'
    case 'ready_for_submission':
      return 'Awaiting government submission'
    case 'submitted_to_government':
      return 'Government processing and review'
    case 'under_review':
      return 'Due diligence and background checks'
    case 'approved':
      return 'Congratulations! Application approved'
    case 'rejected':
      return 'Review feedback and address requirements'
    default:
      return 'Contact your advisor for next steps'
  }
}