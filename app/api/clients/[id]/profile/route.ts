import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { 
  clients, 
  applications, 
  documents, 
  communications, 
  tasks, 
  users, 
  crbiPrograms,
  familyMembers
} from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const params = await props.params
    const clientId = params.id

    // Get client basic information with assigned advisor
    const [clientResult] = await db
      .select({
        client: clients,
        assignedAdvisor: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        }
      })
      .from(clients)
      .leftJoin(users, eq(clients.assignedAdvisorId, users.id))
      .where(and(
        eq(clients.id, clientId),
        eq(clients.firmId, currentUser.firmId)
      ))
      .limit(1)

    if (!clientResult) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    const { client, assignedAdvisor } = clientResult

    // Get client applications with program information
    const clientApplications = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        priority: applications.priority,
        assignedAdvisorId: applications.assignedAdvisorId,
        investmentAmount: applications.investmentAmount,
        investmentType: applications.investmentType,
        submittedAt: applications.submittedAt,
        decisionExpectedAt: applications.decisionExpectedAt,
        decidedAt: applications.decidedAt,
        notes: applications.notes,
        internalNotes: applications.internalNotes,
        programId: applications.programId,
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        programType: crbiPrograms.programType,
        minInvestment: crbiPrograms.minInvestment,
        processingTimeMonths: crbiPrograms.processingTimeMonths
      })
      .from(applications)
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.clientId, clientId))

    // Get client family members
    const clientFamilyMembers = await db
      .select()
      .from(familyMembers)
      .where(eq(familyMembers.clientId, clientId))

    // Get client documents
    const clientDocuments = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        documentType: documents.documentType,
        status: documents.status,
        uploadedAt: documents.createdAt
      })
      .from(documents)
      .where(eq(documents.clientId, clientId))

    // Get client communications
    const clientCommunications = await db
      .select({
        id: communications.id,
        type: communications.type,
        subject: communications.subject,
        content: communications.content,
        direction: communications.direction,
        occurredAt: communications.occurredAt
      })
      .from(communications)
      .where(eq(communications.clientId, clientId))

    // Get client tasks with assigned user information
    const clientTasks = await db
      .select({
        task: tasks,
        assignedToName: users.name
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .where(eq(tasks.clientId, clientId))

    // If no real data exists, provide sample data for demo
    const sampleApplications = clientApplications.length === 0 ? [
      {
        id: 'sample-app-1',
        applicationNumber: 'APP-SAMPLE-001',
        status: 'draft',
        priority: 'medium',
        assignedAdvisorId: currentUser.id,
        investmentAmount: '500000',
        investmentType: 'real_estate',
        submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        decisionExpectedAt: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
        decidedAt: null,
        notes: 'Sample application for demonstration',
        internalNotes: null,
        program: {
          id: 'sample-program-1',
          countryName: 'Cyprus',
          programName: 'Cyprus Permanent Residency',
          programType: 'residency',
          minInvestment: '300000',
          processingTimeMonths: 3
        }
      },
      {
        id: 'sample-app-2',
        applicationNumber: 'APP-SAMPLE-002',
        status: 'approved',
        priority: 'high',
        assignedAdvisorId: currentUser.id,
        investmentAmount: '280000',
        investmentType: 'real_estate',
        submittedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        decisionExpectedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        decidedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        notes: 'Successfully completed application',
        internalNotes: 'Fast-tracked due to complete documentation',
        program: {
          id: 'sample-program-2',
          countryName: 'Portugal',
          programName: 'Portugal Golden Visa',
          programType: 'residency',
          minInvestment: '500000',
          processingTimeMonths: 6
        }
      }
    ] : clientApplications.map(app => ({
      id: app.id,
      applicationNumber: app.applicationNumber,
      status: app.status,
      priority: app.priority,
      assignedAdvisorId: app.assignedAdvisorId,
      investmentAmount: app.investmentAmount?.toString() || null,
      investmentType: app.investmentType,
      submittedAt: app.submittedAt?.toISOString() || null,
      decisionExpectedAt: app.decisionExpectedAt?.toISOString() || null,
      decidedAt: app.decidedAt?.toISOString() || null,
      notes: app.notes,
      internalNotes: app.internalNotes,
      program: {
        id: app.programId,
        countryName: app.countryName,
        programName: app.programName,
        programType: app.programType,
        minInvestment: app.minInvestment,
        processingTimeMonths: app.processingTimeMonths
      }
    }))

    const sampleDocuments = clientDocuments.length === 0 ? [
      {
        id: 'sample-doc-1',
        filename: 'passport_scan.pdf',
        documentType: 'passport',
        status: 'verified',
        uploadedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-doc-2',
        filename: 'bank_statement_2024.pdf',
        documentType: 'financial',
        status: 'pending_review',
        uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-doc-3',
        filename: 'proof_of_funds.pdf',
        documentType: 'financial',
        status: 'verified',
        uploadedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
      }
    ] : clientDocuments.map(doc => ({
      ...doc,
      uploadedAt: doc.uploadedAt?.toISOString() || new Date().toISOString()
    }))

    const sampleCommunications = clientCommunications.length === 0 ? [
      {
        id: 'sample-comm-1',
        type: 'email',
        subject: 'Welcome to our CRBI Program',
        content: 'Thank you for choosing our services. We look forward to helping you with your citizenship application.',
        direction: 'outbound' as const,
        occurredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-comm-2',
        type: 'call',
        subject: 'Initial consultation call',
        content: 'Discussed program options and requirements. Client expressed interest in Cyprus citizenship program.',
        direction: 'inbound' as const,
        occurredAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'sample-comm-3',
        type: 'email',
        subject: 'Document requirements',
        content: 'Please find attached the complete list of required documents for your application.',
        direction: 'outbound' as const,
        occurredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
      }
    ] : clientCommunications.map(comm => ({
      ...comm,
      occurredAt: comm.occurredAt?.toISOString() || new Date().toISOString()
    }))

    const sampleTasks = clientTasks.length === 0 ? [
      {
        id: 'sample-task-1',
        title: 'Collect additional passport documentation',
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: currentUser.name
      },
      {
        id: 'sample-task-2',
        title: 'Review investment verification documents',
        status: 'in_progress',
        priority: 'medium',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: currentUser.name
      },
      {
        id: 'sample-task-3',
        title: 'Schedule compliance review meeting',
        status: 'completed',
        priority: 'low',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        assignedTo: currentUser.name
      }
    ] : clientTasks.map(taskRow => ({
      id: taskRow.task.id,
      title: taskRow.task.title,
      status: taskRow.task.status,
      priority: taskRow.task.priority,
      dueDate: taskRow.task.dueDate?.toISOString() || new Date().toISOString(),
      assignedTo: taskRow.assignedToName
    }))

    // Format the response
    const clientProfile = {
      id: client.id,
      firstName: client.firstName,
      lastName: client.lastName,
      email: client.email,
      phone: client.phone,
      alternativePhone: client.alternativePhone,
      preferredContactMethod: client.preferredContactMethod,
      dateOfBirth: client.dateOfBirth ? new Date(client.dateOfBirth).toISOString() : null,
      placeOfBirth: client.placeOfBirth,
      currentCitizenships: client.currentCitizenships,
      currentResidency: client.currentResidency,
      passportNumber: client.passportNumber,
      passportExpiryDate: client.passportExpiryDate ? new Date(client.passportExpiryDate).toISOString() : null,
      passportIssuingCountry: client.passportIssuingCountry,
      additionalPassports: client.additionalPassports,
      languagesSpoken: client.languagesSpoken,
      educationLevel: client.educationLevel,
      educationDetails: client.educationDetails,
      currentProfession: client.currentProfession,
      industry: client.industry,
      employmentStatus: client.employmentStatus,
      workExperience: client.workExperience,
      primaryGoals: client.primaryGoals,
      preferredPrograms: client.preferredPrograms,
      geographicPreferences: client.geographicPreferences,
      desiredTimeline: client.desiredTimeline,
      urgencyLevel: client.urgencyLevel,
      budgetRange: client.budgetRange,
      liquidityTimeline: client.liquidityTimeline,
      sourceOfFundsReadiness: client.sourceOfFundsReadiness,
      riskTolerance: client.riskTolerance,
      previousRejections: client.previousRejections,
      complianceHistory: client.complianceHistory,
      sanctionsScreening: client.sanctionsScreening,
      programQualificationScore: client.programQualificationScore,
      status: client.status,
      notes: client.notes,
      tags: client.tags,
      lastContactDate: client.lastContactDate ? new Date(client.lastContactDate).toISOString() : null,
      nextFollowUpDate: client.nextFollowUpDate ? new Date(client.nextFollowUpDate).toISOString() : null,
      // Legacy compatibility fields
      nationality: client.nationality,
      netWorthEstimate: client.netWorthEstimate?.toString() || null,
      investmentBudget: client.investmentBudget?.toString() || null,
      sourceOfFunds: client.sourceOfFunds,
      createdAt: client.createdAt?.toISOString() || new Date().toISOString(),
      assignedAdvisor: assignedAdvisor?.id ? {
        id: assignedAdvisor.id,
        name: assignedAdvisor.name,
        email: assignedAdvisor.email,
        role: assignedAdvisor.role
      } : null,
      applications: sampleApplications,
      documents: sampleDocuments,
      communications: sampleCommunications,
      tasks: sampleTasks,
      familyMembers: clientFamilyMembers
    }

    return NextResponse.json({ client: clientProfile })

  } catch (error) {
    console.error('Client profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch client profile' },
      { status: 500 }
    )
  }
}