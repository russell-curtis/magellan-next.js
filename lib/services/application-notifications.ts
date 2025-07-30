// Application Notification Service
// Handles automatic notifications to clients when applications are created/updated

import { db } from '@/db/drizzle'
import { conversations, messages, messageParticipants, clients, users, crbiPrograms } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface ApplicationNotificationContext {
  applicationId: string
  applicationNumber: string
  advisorId: string
  clientId: string
  firmId: string
  programId: string
}

export interface NotificationResult {
  success: boolean
  conversationId?: string
  messageId?: string
  error?: string
}

// ============================================================================
// APPLICATION NOTIFICATION SERVICE
// ============================================================================

export class ApplicationNotificationService {
  
  /**
   * Notify client when a new application is created
   */
  static async notifyClientApplicationCreated(context: ApplicationNotificationContext): Promise<NotificationResult> {
    try {
      console.log('🔔 Notifying client of new application:', context.applicationNumber)
      
      // Get client and program details for the message
      const [clientData, programData] = await Promise.all([
        this.getClientData(context.clientId),
        this.getProgramData(context.programId)
      ])
      
      if (!clientData || !programData) {
        throw new Error('Failed to fetch client or program data')
      }
      
      // Find or create conversation for this client-advisor pair
      const conversationId = await this.findOrCreateConversation(
        context.advisorId,
        context.clientId,
        context.firmId,
        context.applicationId
      )
      
      // Create the notification message
      const messageContent = this.generateApplicationCreatedMessage(
        context.applicationNumber,
        programData.programName,
        programData.countryName,
        clientData.firstName
      )
      
      // Send the message
      const messageId = await this.sendSystemMessage(
        conversationId,
        messageContent,
        context.advisorId
      )
      
      console.log('✅ Successfully notified client about new application')
      
      return {
        success: true,
        conversationId,
        messageId
      }
      
    } catch (error) {
      console.error('❌ Failed to notify client of new application:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Get client data for personalized messaging
   */
  private static async getClientData(clientId: string) {
    const result = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        email: clients.email
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)
    
    return result[0] || null
  }
  
  /**
   * Get program data for context in the message
   */
  private static async getProgramData(programId: string) {
    const result = await db
      .select({
        id: crbiPrograms.id,
        programName: crbiPrograms.programName,
        countryName: crbiPrograms.countryName,
        countryCode: crbiPrograms.countryCode,
        programType: crbiPrograms.programType
      })
      .from(crbiPrograms)
      .where(eq(crbiPrograms.id, programId))
      .limit(1)
    
    return result[0] || null
  }
  
  /**
   * Find existing conversation or create new one
   */
  private static async findOrCreateConversation(
    advisorId: string,
    clientId: string,
    firmId: string,
    applicationId?: string
  ): Promise<string> {
    
    // First, try to find an existing active conversation for this client-advisor pair
    const existingConversation = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(
        and(
          eq(conversations.clientId, clientId),
          eq(conversations.assignedAdvisorId, advisorId),
          eq(conversations.status, 'active')
        )
      )
      .limit(1)
    
    if (existingConversation.length > 0) {
      console.log('📞 Using existing conversation:', existingConversation[0].id)
      return existingConversation[0].id
    }
    
    // Create new conversation
    console.log('📞 Creating new conversation for client notification')
    
    const [newConversation] = await db
      .insert(conversations)
      .values({
        firmId,
        clientId,
        applicationId: applicationId || null,
        title: 'Application Updates',
        priority: 'normal',
        assignedAdvisorId: advisorId,
        status: 'active',
      })
      .returning({ id: conversations.id })
    
    // Create participants (advisor and client)
    await Promise.all([
      // Add advisor as participant
      db.insert(messageParticipants).values({
        conversationId: newConversation.id,
        participantType: 'advisor',
        advisorId: advisorId,
        isActive: true,
      }),
      // Add client as participant
      db.insert(messageParticipants).values({
        conversationId: newConversation.id,
        participantType: 'client',
        clientId: clientId,
        isActive: true,
      }),
    ])
    
    console.log('✅ Created new conversation:', newConversation.id)
    return newConversation.id
  }
  
  /**
   * Send system message to the conversation
   */
  private static async sendSystemMessage(
    conversationId: string,
    content: string,
    senderAdvisorId: string
  ): Promise<string> {
    
    const [newMessage] = await db
      .insert(messages)
      .values({
        conversationId,
        content,
        messageType: 'system',
        senderType: 'advisor',
        senderAdvisorId,
        metadata: {
          automated: true,
          type: 'application_created',
          timestamp: new Date().toISOString()
        }
      })
      .returning({ id: messages.id })
    
    // Update conversation last message time
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        lastMessageId: newMessage.id,
        updatedAt: new Date()
      })
      .where(eq(conversations.id, conversationId))
    
    console.log('💬 Sent system message:', newMessage.id)
    return newMessage.id
  }
  
  /**
   * Generate application created message content
   */
  private static generateApplicationCreatedMessage(
    applicationNumber: string,
    programName: string,
    countryName: string,
    clientFirstName: string
  ): string {
    return `🎉 **New Application Created**

Hello ${clientFirstName}!

Your advisor has created a new application for you.

**Application Details:**
• Application Number: **${applicationNumber}**
• Program: **${programName}**
• Country: **${countryName}**

**Next Steps:**
1. 📋 Review your application in the **Applications** section
2. 📄 Upload required documents when ready
3. 📞 Follow the step-by-step application process

Your advisor will guide you through each stage of the process. Feel free to reach out with any questions!

*You can find your application in the Applications tab of your dashboard.*`
  }
  
  /**
   * Notify client of application status updates
   */
  static async notifyClientApplicationStatusUpdate(
    applicationId: string,
    applicationNumber: string,
    newStatus: string,
    advisorId: string,
    clientId: string,
    notes?: string
  ): Promise<NotificationResult> {
    try {
      console.log('🔔 Notifying client of application status update:', applicationNumber)
      
      // Find existing conversation
      const existingConversation = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.clientId, clientId),
            eq(conversations.assignedAdvisorId, advisorId),
            eq(conversations.status, 'active')
          )
        )
        .limit(1)
      
      if (!existingConversation.length) {
        console.log('⚠️ No active conversation found for status update notification')
        return { success: false, error: 'No active conversation found' }
      }
      
      const conversationId = existingConversation[0].id
      
      // Generate status update message
      const messageContent = this.generateStatusUpdateMessage(
        applicationNumber,
        newStatus,
        notes
      )
      
      // Send the message
      const messageId = await this.sendSystemMessage(
        conversationId,
        messageContent,
        advisorId
      )
      
      console.log('✅ Successfully notified client about status update')
      
      return {
        success: true,
        conversationId,
        messageId
      }
      
    } catch (error) {
      console.error('❌ Failed to notify client of status update:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
  
  /**
   * Generate application status update message
   */
  private static generateStatusUpdateMessage(
    applicationNumber: string,
    newStatus: string,
    notes?: string
  ): string {
    const statusEmojis: Record<string, string> = {
      'draft': '📝',
      'submitted': '📤',
      'under_review': '🔍', 
      'approved': '✅',
      'rejected': '❌',
      'requires_action': '⚠️'
    }
    
    const statusLabels: Record<string, string> = {
      'draft': 'Draft',
      'submitted': 'Submitted',
      'under_review': 'Under Review',
      'approved': 'Approved',
      'rejected': 'Rejected', 
      'requires_action': 'Action Required'
    }
    
    const emoji = statusEmojis[newStatus] || '📋'
    const label = statusLabels[newStatus] || newStatus
    
    let message = `${emoji} **Application Status Update**

Your application **${applicationNumber}** status has been updated to: **${label}**`
    
    if (notes) {
      message += `\n\n**Notes from your advisor:**\n${notes}`
    }
    
    message += `\n\n*Check your Applications section for more details.*`
    
    return message
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Quick function to notify client of new application
 */
export async function notifyClientApplicationCreated(
  applicationId: string,
  applicationNumber: string,
  advisorId: string,
  clientId: string,
  firmId: string,
  programId: string
): Promise<NotificationResult> {
  return ApplicationNotificationService.notifyClientApplicationCreated({
    applicationId,
    applicationNumber,
    advisorId,
    clientId,
    firmId,
    programId
  })
}

/**
 * Quick function to notify client of status update
 */
export async function notifyClientApplicationStatusUpdate(
  applicationId: string,
  applicationNumber: string,
  newStatus: string,
  advisorId: string,
  clientId: string,
  notes?: string
): Promise<NotificationResult> {
  return ApplicationNotificationService.notifyClientApplicationStatusUpdate(
    applicationId,
    applicationNumber,
    newStatus,
    advisorId,
    clientId,
    notes
  )
}