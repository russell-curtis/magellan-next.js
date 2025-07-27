import { NextRequest, NextResponse } from 'next/server'
import { requireClientAuth } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { 
  applications, 
  workflowStages, 
  documentRequirements,
  programWorkflowTemplates,
  applicationDocuments
} from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log('=== CLIENT REQUIREMENTS API CALLED ===')
  console.log('Application ID:', params.id)
  
  try {
    const client = await requireClientAuth()
    console.log('Client authenticated:', client.id)
    const applicationId = params.id

    // Get application and verify client access
    console.log('Client auth data:', {
      clientId: client.id,
      authId: client.authId,
      email: client.email,
      clientIdFromClient: client.clientId
    })
    
    const [application] = await db
      .select()
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.id) // Use client.id, not client.clientId
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

    // Get uploaded documents for this application
    const uploadedDocs = await db
      .select()
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))

    console.log(`Found ${uploadedDocs.length} uploaded documents for application ${applicationId}`)
    uploadedDocs.forEach(doc => {
      console.log(`- Document: ${doc.filename} for requirement: ${doc.documentRequirementId}`)
    })

    // Group requirements by stage and merge with uploaded documents
    const stagesWithRequirements = stages.map(stage => {
      const requirements = documentReqs.filter(req => req.stageId === stage.id)
      return {
        id: stage.id,
        stageOrder: stage.stageOrder,
        stageName: stage.stageName,
        description: stage.description,
        estimatedDays: stage.estimatedDays,
        requirements: requirements.map(req => {
          // Find uploaded document for this requirement
          const uploadedDoc = uploadedDocs.find(doc => doc.documentRequirementId === req.id)
          
          return {
            id: req.id,
            stageId: req.stageId,
            documentName: req.documentName,
            description: req.description,
            category: req.category,
            isRequired: req.isRequired,
            isClientUploadable: req.isClientUploadable,
            acceptedFormats: req.acceptedFormats,
            maxFileSizeMB: req.maxFileSizeMB,
            expirationMonths: req.expirationMonths,
            displayGroup: req.category,
            helpText: req.description,
            sortOrder: req.sortOrder,
            // Update status based on uploaded document
            status: uploadedDoc ? (uploadedDoc.status || 'under_review') : 'pending',
            // Add uploaded document information if available
            fileName: uploadedDoc?.filename,
            fileSize: uploadedDoc?.fileSize,
            uploadedAt: uploadedDoc?.uploadedAt?.toISOString(),
            examples: req.examples,
            validationRules: req.validationRules
          }
        })
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