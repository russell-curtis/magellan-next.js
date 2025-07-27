// app/api/applications/[id]/delete/route.ts - Application Deletion with Cascading Cleanup

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { 
  applications, 
  activityLogs, 
  clients, 
  crbiPrograms,
  applicationDocuments,
  documentReviews,
  applicationWorkflowProgress,
  stageProgress,
  tasks,
  communications,
  conversations,
  messages,
  messageParticipants,
  messageNotifications,
  customDocumentRequirements
} from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'
import { requireAuth } from '@/lib/auth-utils'
import { batchDeleteFromR2 } from '@/lib/r2-storage'

// Delete application with comprehensive cleanup
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  console.log('=== DELETE APPLICATION API CALLED ===')
  try {
    console.log('1. Getting user authentication...')
    const user = await requireAuth()
    console.log('2. User authenticated:', { id: user.id, role: user.role, firmId: user.firmId })
    
    const { id: applicationId } = await params
    console.log('3. Application ID:', applicationId)
    
    // Verify application exists and user has access
    const applicationCheck = await db
      .select({
        id: applications.id,
        firmId: applications.firmId,
        clientId: applications.clientId,
        applicationNumber: applications.applicationNumber,
        status: applications.status,
        assignedAdvisorId: applications.assignedAdvisorId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          email: clients.email
        },
        program: {
          id: crbiPrograms.id,
          countryName: crbiPrograms.countryName,
          programName: crbiPrograms.programName
        }
      })
      .from(applications)
      .leftJoin(clients, eq(applications.clientId, clients.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!applicationCheck.length) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    const application = applicationCheck[0]

    // Check access permissions
    if (application.firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Business rules for deletion
    const canDelete = checkDeletionPermissions(application.status, user.role, application.assignedAdvisorId, user.id)
    if (!canDelete.allowed) {
      return NextResponse.json(
        { error: canDelete.reason },
        { status: 403 }
      )
    }

    // Log the deletion action before starting transaction (for audit trail)
    await db.insert(activityLogs).values({
      firmId: user.firmId,
      userId: user.id,
      clientId: application.clientId,
      applicationId: applicationId,
      action: 'application_deleted',
      entityType: 'application',
      entityId: applicationId,
      oldValues: {
        applicationNumber: application.applicationNumber,
        status: application.status,
        clientName: application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown',
        programName: application.program?.programName || 'Unknown'
      },
      newValues: {
        deletedBy: user.name,
        deletedAt: new Date().toISOString(),
        reason: 'Application deleted by agent'
      }
    })

    // Get documents to delete before transaction
    console.log('4. Getting documents to delete...')
    const documentsToDelete = await db
      .select({
        id: applicationDocuments.id,
        filePath: applicationDocuments.filePath,
        filename: applicationDocuments.filename
      })
      .from(applicationDocuments)
      .where(eq(applicationDocuments.applicationId, applicationId))
    
    console.log(`5. Found ${documentsToDelete.length} documents to delete`)

    // Perform cascading deletion without transactions (Neon HTTP doesn't support transactions)
    console.log('6. Starting cascading deletion...')
    
    try {
      // 1. Get conversation IDs for this application
      console.log('7. Getting conversations...')
      const conversationIds = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.applicationId, applicationId))
      
      console.log(`8. Found ${conversationIds.length} conversations`)

      if (conversationIds.length > 0) {
        const convIds = conversationIds.map(c => c.id)
        
        // Get message IDs from these conversations
        const messageIds = await db
          .select({ id: messages.id })
          .from(messages)
          .where(inArray(messages.conversationId, convIds))

        if (messageIds.length > 0) {
          const msgIds = messageIds.map(m => m.id)
          
          // Delete message notifications
          console.log('9. Deleting message notifications...')
          await db.delete(messageNotifications)
            .where(inArray(messageNotifications.messageId, msgIds))
        }

        // Delete message participants
        console.log('10. Deleting message participants...')
        await db.delete(messageParticipants)
          .where(inArray(messageParticipants.conversationId, convIds))

        // Delete messages
        console.log('11. Deleting messages...')
        await db.delete(messages)
          .where(inArray(messages.conversationId, convIds))
      }

      // 2. Delete conversations
      console.log('12. Deleting conversations...')
      await db.delete(conversations)
        .where(eq(conversations.applicationId, applicationId))

      // 3. Delete document reviews for this application's documents
      console.log('13. Deleting document reviews...')
      if (documentsToDelete.length > 0) {
        const docIds = documentsToDelete.map(d => d.id)
        await db.delete(documentReviews)
          .where(inArray(documentReviews.documentId, docIds))
      }

      // 4. Delete application documents
      console.log('14. Deleting application documents...')
      await db.delete(applicationDocuments)
        .where(eq(applicationDocuments.applicationId, applicationId))

      // 5. Delete custom document requirements
      console.log('15. Deleting custom document requirements...')
      await db.delete(customDocumentRequirements)
        .where(eq(customDocumentRequirements.applicationId, applicationId))

      // 6. Delete stage progress
      console.log('16. Deleting stage progress...')
      await db.delete(stageProgress)
        .where(eq(stageProgress.applicationId, applicationId))

      // 7. Delete workflow progress
      console.log('17. Deleting workflow progress...')
      await db.delete(applicationWorkflowProgress)
        .where(eq(applicationWorkflowProgress.applicationId, applicationId))

      // 8. Delete tasks
      console.log('18. Deleting tasks...')
      await db.delete(tasks)
        .where(eq(tasks.applicationId, applicationId))

      // 9. Delete communications
      console.log('19. Deleting communications...')
      await db.delete(communications)
        .where(eq(communications.applicationId, applicationId))

      // 10. Delete all other activity logs related to this application
      console.log('20. Deleting activity logs...')
      await db.delete(activityLogs)
        .where(eq(activityLogs.applicationId, applicationId))

      // 11. Finally, delete the application itself
      console.log('21. Deleting application...')
      await db.delete(applications)
        .where(eq(applications.id, applicationId))

      console.log('22. Database deletion completed successfully')
      
      // 12. Clean up files from R2 storage (after successful DB deletion)
      if (documentsToDelete.length > 0) {
        try {
          console.log('23. Cleaning up files from R2...')
          const filePaths = documentsToDelete
            .map(doc => doc.filePath)
            .filter(Boolean)
          
          console.log(`24. Found ${filePaths.length} file paths to delete`)
          
          if (filePaths.length > 0) {
            await batchDeleteFromR2(filePaths)
            console.log('25. R2 file cleanup completed')
          }
        } catch (fileError) {
          console.error('Error deleting files from R2:', fileError)
          // Don't fail the deletion for file cleanup errors
          // Files can be cleaned up later via maintenance tasks
        }
      }
      
      console.log('26. Deletion completed successfully')
      
    } catch (deletionError) {
      console.error('Error during deletion process:', deletionError)
      throw deletionError // Re-throw to be caught by main error handler
    }

    return NextResponse.json({
      success: true,
      message: `Application ${application.applicationNumber} has been permanently deleted`,
      deletionInfo: {
        applicationId,
        applicationNumber: application.applicationNumber,
        clientName: application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown',
        programName: application.program?.programName || 'Unknown',
        deletedBy: user.name,
        deletedAt: new Date().toISOString(),
        filesDeleted: documentsToDelete.length
      }
    })

  } catch (error) {
    console.error('Error deleting application:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    
    if (error instanceof Error && error.message.includes('authentication')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Return more detailed error information for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Detailed error message:', errorMessage)
    
    return NextResponse.json(
      { 
        error: 'Failed to delete application. Please try again.',
        details: errorMessage,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Helper function to check deletion permissions
function checkDeletionPermissions(
  status: string, 
  userRole: string, 
  assignedAdvisorId: string | null, 
  userId: string
): { allowed: boolean; reason?: string } {
  
  // Approved applications should be archived, not deleted
  if (status === 'approved') {
    return {
      allowed: false,
      reason: 'Approved applications cannot be deleted. Use archive functionality instead.'
    }
  }

  // Draft and started applications can be deleted by assigned advisor or admin
  if (status === 'draft' || status === 'started') {
    if (userRole === 'admin' || assignedAdvisorId === userId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'Only the assigned advisor or admin can delete draft or started applications.'
    }
  }

  // Submitted/Under Review applications require admin permission
  if (status === 'submitted' || status === 'under_review') {
    if (userRole === 'admin') {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'Only administrators can delete submitted or under-review applications.'
    }
  }

  // Rejected applications can be deleted by assigned advisor or admin
  if (status === 'rejected') {
    if (userRole === 'admin' || assignedAdvisorId === userId) {
      return { allowed: true }
    }
    return {
      allowed: false,
      reason: 'Only the assigned advisor or admin can delete rejected applications.'
    }
  }

  return {
    allowed: false,
    reason: 'Application cannot be deleted in its current status.'
  }
}

