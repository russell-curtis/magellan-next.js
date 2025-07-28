import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { 
  applications, 
  programWorkflowTemplates,
  workflowStages,
  documentRequirements,
  applicationDocuments
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'
import { getOriginalDocumentsProgress, ORIGINAL_DOCUMENTS_STAGE_ORDER } from '@/lib/services/original-documents-workflow'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const resolvedParams = await params
  console.log('=== AGENT WORKFLOW API CALLED ===')
  console.log('Application ID:', resolvedParams.id)
  
  try {
    // Require agent authentication
    const user = await requireAuth()
    console.log('Agent authenticated:', user.id)
    const applicationId = resolvedParams.id
    console.log('Processing application:', applicationId)

    // Get application details (agents can access any application)
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      console.log('Application not found for ID:', applicationId)
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get the active workflow template for this program
    const [workflowTemplate] = await db
      .select()
      .from(programWorkflowTemplates)
      .where(and(
        eq(programWorkflowTemplates.programId, application.programId),
        eq(programWorkflowTemplates.isActive, true)
      ))
      .orderBy(desc(programWorkflowTemplates.version))
      .limit(1)

    if (!workflowTemplate) {
      console.log('No workflow template found for program:', application.programId)
      return NextResponse.json({ 
        error: 'No workflow template found for this program' 
      }, { status: 404 })
    }

    // Get workflow stages
    const stages = await db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.templateId, workflowTemplate.id))
      .orderBy(workflowStages.stageOrder)

    // Get document requirements for this application's program
    const documentReqs = await db
      .select()
      .from(documentRequirements)
      .where(eq(documentRequirements.programId, application.programId))

    // Get uploaded documents for this application
    const uploadedDocs = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))

    console.log(`Found ${documentReqs.length} document requirements`)
    console.log(`Found ${uploadedDocs.length} uploaded documents`)

    // Get original documents progress for the Original Documents Collection stage
    const originalDocsProgress = await getOriginalDocumentsProgress(applicationId)

    // Create workflow response with calculated progress
    const stagesWithProgress = await Promise.all(stages.map(async (stage) => {
      // Handle Original Documents Collection stage specially
      if (stage.stageOrder === ORIGINAL_DOCUMENTS_STAGE_ORDER && stage.stageName === 'Original Documents Collection') {
        console.log(`Original Documents Collection stage: ${originalDocsProgress.verified}/${originalDocsProgress.totalRequested} documents verified, progress: ${originalDocsProgress.completionPercentage}%`)
        
        return {
          id: stage.id,
          stageOrder: stage.stageOrder,
          stageName: stage.stageName,
          description: stage.description,
          estimatedDays: stage.estimatedDays,
          isRequired: stage.isRequired,
          canSkip: stage.canSkip,
          autoProgress: stage.autoProgress,
          status: originalDocsProgress.status,
          progress: originalDocsProgress.completionPercentage,
          startedAt: originalDocsProgress.status !== 'pending' ? new Date().toISOString() : null,
          completedAt: originalDocsProgress.status === 'completed' ? new Date().toISOString() : null,
          documentCount: originalDocsProgress.totalRequested,
          completedDocuments: originalDocsProgress.verified
        }
      }

      // Handle regular document-based stages
      const stageRequirements = documentReqs.filter(req => req.stageId === stage.id)
      
      // Get uploaded docs for this stage's requirements
      const stageUploadedDocs = uploadedDocs.filter(doc => 
        stageRequirements.some(req => req.id === doc.documentRequirementId)
      )
      
      // Count approved documents for this stage
      const approvedDocs = stageUploadedDocs.filter(doc => doc.status === 'approved')
      const totalRequiredDocs = stageRequirements.filter(req => req.isRequired).length
      const totalDocs = stageRequirements.length
      
      // Count only approved documents that fulfill required requirements
      const approvedRequiredDocs = approvedDocs.filter(doc => {
        const requirement = stageRequirements.find(req => req.id === doc.documentRequirementId)
        return requirement?.isRequired === true
      })
      
      // Calculate stage progress
      let stageProgress = 0
      let stageStatus = 'pending'
      
      if (totalRequiredDocs > 0) {
        stageProgress = Math.round((approvedRequiredDocs.length / totalRequiredDocs) * 100)
        
        if (approvedRequiredDocs.length === totalRequiredDocs) {
          stageStatus = 'completed'
          stageProgress = 100
        } else if (stageUploadedDocs.length > 0) {
          stageStatus = 'in_progress'
        } else if (stage.stageOrder === 1) {
          stageStatus = 'in_progress'
        }
      } else if (stage.stageOrder === 1) {
        stageStatus = 'in_progress'
        stageProgress = 50
      }

      console.log(`Stage ${stage.stageName}: ${approvedRequiredDocs.length}/${totalRequiredDocs} required docs approved, progress: ${stageProgress}%`)

      return {
        id: stage.id,
        stageOrder: stage.stageOrder,
        stageName: stage.stageName,
        description: stage.description,
        estimatedDays: stage.estimatedDays,
        isRequired: stage.isRequired,
        canSkip: stage.canSkip,
        autoProgress: stage.autoProgress,
        status: stageStatus,
        progress: stageProgress,
        startedAt: stageStatus !== 'pending' ? new Date().toISOString() : null,
        completedAt: stageStatus === 'completed' ? new Date().toISOString() : null,
        documentCount: totalDocs,
        completedDocuments: approvedDocs.length
      }
    }))

    // Find current stage and calculate overall progress
    const currentStage = stagesWithProgress.find(s => s.status === 'in_progress') || stagesWithProgress[0]
    const completedStages = stagesWithProgress.filter(s => s.status === 'completed').length
    const overallProgress = Math.round((completedStages / stages.length) * 100)
    
    // Determine overall workflow status
    let workflowStatus = 'in_progress'
    if (completedStages === stages.length) {
      workflowStatus = 'completed'
    } else if (completedStages === 0 && !currentStage) {
      workflowStatus = 'pending'
    }

    console.log('Workflow response:', {
      templateName: workflowTemplate.templateName,
      totalStages: stages.length,
      completedStages,
      overallProgress: overallProgress,
      currentStageId: currentStage?.id,
      workflowStatus
    })

    return NextResponse.json({
      id: `workflow-${applicationId}`,
      templateName: workflowTemplate.templateName,
      description: workflowTemplate.description,
      totalStages: stages.length,
      estimatedTimeMonths: workflowTemplate.estimatedTimeMonths,
      currentStageId: currentStage?.id,
      overallProgress: overallProgress,
      status: workflowStatus,
      startedAt: new Date().toISOString(),
      completedAt: workflowStatus === 'completed' ? new Date().toISOString() : null,
      stages: stagesWithProgress
    })

  } catch (error) {
    console.error('Error fetching agent workflow:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}