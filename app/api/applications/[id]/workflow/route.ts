import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  applications, 
  programWorkflowTemplates, 
  workflowStages, 
  documentRequirements,
  applicationWorkflowProgress,
  stageProgress,
  applicationDocuments,
  documentReviews
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    console.log('Fetching workflow for application:', applicationId)

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)
    
    console.log('Found application:', application ? 'Yes' : 'No')

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if user has access to this application
    // TODO: Add proper authorization logic based on user role and firm

    // Get workflow template for this application's program
    console.log('Looking for workflow template for program:', application.programId)
    const [workflowTemplate] = await db
      .select()
      .from(programWorkflowTemplates)
      .where(and(
        eq(programWorkflowTemplates.programId, application.programId),
        eq(programWorkflowTemplates.isActive, true)
      ))
      .orderBy(desc(programWorkflowTemplates.version))
      .limit(1)
    
    console.log('Found workflow template:', workflowTemplate ? workflowTemplate.templateName : 'None')

    if (!workflowTemplate) {
      return NextResponse.json({ 
        error: 'No workflow template found for this program' 
      }, { status: 404 })
    }

    // Get all workflow stages for this template
    const stages = await db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.templateId, workflowTemplate.id))
      .orderBy(workflowStages.stageOrder)

    // Get application workflow progress
    const [workflowProgress] = await db
      .select()
      .from(applicationWorkflowProgress)
      .where(eq(applicationWorkflowProgress.applicationId, applicationId))
      .limit(1)

    // Get stage progress for each stage
    const stageProgressData = await db
      .select()
      .from(stageProgress)
      .where(eq(stageProgress.applicationId, applicationId))

    // Get document requirements for each stage
    const documentReqs = await db
      .select()
      .from(documentRequirements)
      .where(eq(documentRequirements.programId, application.programId))

    // Get uploaded documents for this application
    const uploadedDocs = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))

    // Get document reviews (join with application_documents since reviews don't have applicationId directly)
    const docReviews = await db
      .select({
        id: documentReviews.id,
        documentId: documentReviews.documentId,
        reviewResult: documentReviews.reviewResult,
        reviewedAt: documentReviews.reviewedAt,
        reviewNotes: documentReviews.reviewNotes
      })
      .from(documentReviews)
      .innerJoin(applicationDocuments, eq(documentReviews.documentId, applicationDocuments.id))
      .where(eq(applicationDocuments.applicationId, applicationId))

    // Combine stage data with progress and document info
    const enrichedStages = stages.map(stage => {
      const progress = stageProgressData.find(sp => sp.stageId === stage.id)
      const stageDocuments = documentReqs.filter(dr => dr.stageId === stage.id)
      
      // Calculate document completion for this stage
      const uploadedStageDocuments = uploadedDocs.filter(doc => 
        stageDocuments.some(req => req.id === doc.documentRequirementId)
      )
      
      const approvedDocuments = uploadedStageDocuments.filter(doc => {
        const review = docReviews.find(rev => rev.documentId === doc.id)
        return review?.reviewResult === 'approved'
      })

      const requiredDocuments = stageDocuments.filter(doc => doc.isRequired)
      const requiredApproved = approvedDocuments.filter(doc => {
        const requirement = stageDocuments.find(req => req.id === doc.documentRequirementId)
        return requirement?.isRequired
      })

      // Determine stage status based on progress and document completion
      let stageStatus: 'pending' | 'in_progress' | 'completed' | 'blocked' = 'pending'
      let stageProgress = 0

      if (progress) {
        stageStatus = progress.status as 'pending' | 'in_progress' | 'completed' | 'blocked'
        stageProgress = progress.completionPercentage || 0
      } else if (requiredDocuments.length > 0 && requiredApproved.length === requiredDocuments.length) {
        stageStatus = 'completed'
        stageProgress = 100
      } else if (uploadedStageDocuments.length > 0) {
        stageStatus = 'in_progress'
        stageProgress = Math.round((approvedDocuments.length / stageDocuments.length) * 100)
      }

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
        startedAt: progress?.startedAt,
        completedAt: progress?.completedAt,
        documentCount: stageDocuments.length,
        completedDocuments: approvedDocuments.length,
        requiredDocuments: requiredDocuments.length,
        requiredCompleted: requiredApproved.length
      }
    })

    // Calculate overall workflow progress
    const completedStages = enrichedStages.filter(s => s.status === 'completed').length
    const overallProgress = Math.round((completedStages / stages.length) * 100)

    // Get current stage
    const currentStage = enrichedStages.find(s => s.status === 'in_progress') ||
                        enrichedStages.find(s => s.status === 'pending')

    const workflowData = {
      id: workflowTemplate.id,
      templateName: workflowTemplate.templateName,
      description: workflowTemplate.description,
      totalStages: workflowTemplate.totalStages,
      estimatedTimeMonths: workflowTemplate.estimatedTimeMonths,
      currentStageId: currentStage?.id,
      overallProgress,
      status: workflowProgress?.status || 'not_started',
      startedAt: workflowProgress?.startedAt,
      completedAt: workflowProgress?.actualCompletionAt,
      stages: enrichedStages
    }

    return NextResponse.json(workflowData)

  } catch (error) {
    console.error('Error fetching application workflow:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { 
        error: 'Failed to fetch workflow data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Update workflow stage progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const applicationId = params.id
    const body = await request.json()
    const { stageId, status, progress, notes } = body

    // Validate input
    if (!stageId || !status) {
      return NextResponse.json(
        { error: 'stageId and status are required' },
        { status: 400 }
      )
    }

    // Get application and verify access
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Check if stage progress already exists
    const [existingProgress] = await db
      .select()
      .from(stageProgress)
      .where(and(
        eq(stageProgress.applicationId, applicationId),
        eq(stageProgress.stageId, stageId)
      ))
      .limit(1)

    const now = new Date()
    const progressData = {
      status,
      completionPercentage: progress || 0,
      notes,
      updatedAt: now,
      ...(status === 'in_progress' && !existingProgress?.startedAt ? { startedAt: now } : {}),
      ...(status === 'completed' ? { completedAt: now } : {})
    }

    if (existingProgress) {
      // Update existing progress
      await db
        .update(stageProgress)
        .set(progressData)
        .where(eq(stageProgress.id, existingProgress.id))
    } else {
      // Create new progress record
      await db
        .insert(stageProgress)
        .values({
          applicationId,
          stageId,
          ...progressData,
          startedAt: status === 'in_progress' ? now : null
        })
    }

    // Update overall workflow progress if needed
    const [workflowProgressRecord] = await db
      .select()
      .from(applicationWorkflowProgress)
      .where(eq(applicationWorkflowProgress.applicationId, applicationId))
      .limit(1)

    if (!workflowProgressRecord) {
      // Create workflow progress record
      await db
        .insert(applicationWorkflowProgress)
        .values({
          applicationId,
          templateId: '', // Will be set properly when we have the template ID
          status: 'in_progress',
          startedAt: now,
          updatedAt: now
        })
    } else {
      // Update workflow progress
      await db
        .update(applicationWorkflowProgress)
        .set({
          status: 'in_progress',
          updatedAt: now
        })
        .where(eq(applicationWorkflowProgress.id, workflowProgressRecord.id))
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error updating workflow progress:', error)
    return NextResponse.json(
      { error: 'Failed to update workflow progress' },
      { status: 500 }
    )
  }
}