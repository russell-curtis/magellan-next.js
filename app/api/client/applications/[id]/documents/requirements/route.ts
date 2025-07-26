import { NextRequest, NextResponse } from 'next/server'
import { requireClientAuth } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { 
  applications, 
  workflowStages, 
  documentRequirements,
  programWorkflowTemplates
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const client = await requireClientAuth()
    const applicationId = params.id

    // Get application and verify client access
    const [application] = await db
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.clientId)
      ))
      .limit(1)

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Get workflow template for this application's program
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

    // Get document requirements for each stage
    const documentReqs = await db
      .select()
      .from(documentRequirements)
      .where(eq(documentRequirements.programId, application.programId))

    // Group requirements by stage
    const stagesWithRequirements = stages.map(stage => {
      const requirements = documentReqs.filter(req => req.stageId === stage.id)
      return {
        id: stage.id,
        stageOrder: stage.stageOrder,
        stageName: stage.stageName,
        description: stage.description,
        estimatedDays: stage.estimatedDays,
        requirements: requirements.map(req => ({
          id: req.id,
          documentName: req.documentName,
          description: req.description,
          isRequired: req.isRequired,
          acceptedFormats: req.acceptedFormats,
          maxFileSize: req.maxFileSize,
          examples: req.examples,
          validationRules: req.validationRules
        }))
      }
    })

    return NextResponse.json({
      applicationId,
      programId: application.programId,
      templateId: workflowTemplate.id,
      stages: stagesWithRequirements
    })

  } catch (error) {
    console.error('Error fetching client document requirements:', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch document requirements',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}