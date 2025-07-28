// Original Document Notification Service
// Handles sending notifications to clients when original documents are requested

import { db } from '@/db/drizzle'
import { conversations, messages, applications, clients, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

interface OriginalDocumentNotificationData {
  applicationId: string
  documentName: string
  deadline?: string | null
  isUrgent: boolean
  shippingAddress: string
  clientInstructions?: string | null
  requestedBy: string
  firmId: string
}

export class OriginalDocumentNotificationService {
  /**
   * Send notification to client when original documents are requested
   */
  async notifyClientOfOriginalDocumentRequest(data: OriginalDocumentNotificationData): Promise<boolean> {
    try {
      console.log('📧 Starting original document notification process...')
      console.log('📧 Notification data:', {
        applicationId: data.applicationId,
        documentName: data.documentName,
        deadline: data.deadline,
        isUrgent: data.isUrgent,
        shippingAddress: data.shippingAddress,
        clientInstructions: data.clientInstructions,
        requestedBy: data.requestedBy,
        firmId: data.firmId
      })

      // Get application details
      console.log('🔍 Querying application with ID:', data.applicationId)
      const applicationResults = await db
        .select({
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          clientId: applications.clientId,
          firmId: applications.firmId,
          assignedAdvisorId: applications.assignedAdvisorId
        })
        .from(applications)
        .where(eq(applications.id, data.applicationId))
        .limit(1)

      console.log('🔍 Application query results:', applicationResults)
      
      if (!applicationResults || applicationResults.length === 0) {
        console.error('❌ Application not found for notification:', data.applicationId)
        return false
      }

      const application = applicationResults[0]

      console.log('✅ Application found:', {
        id: application.id,
        number: application.applicationNumber,
        clientId: application.clientId,
        firmId: application.firmId
      })

      // Get advisor details
      console.log('🔍 Querying advisor with ID:', data.requestedBy)
      let advisorResults
      try {
        // Try a simpler query first to isolate the issue
        console.log('🔍 Attempting simplified advisor query...')
        advisorResults = await db
          .select()
          .from(users)
          .where(eq(users.id, data.requestedBy))
          .limit(1)
          
        console.log('🔍 Advisor query results:', advisorResults)
        console.log('🔍 Advisor query results type:', typeof advisorResults)
        console.log('🔍 Advisor query results length:', advisorResults ? advisorResults.length : 'undefined')
        
        if (advisorResults && advisorResults.length > 0) {
          console.log('🔍 First advisor result:', advisorResults[0])
        }
      } catch (advisorQueryError) {
        console.error('❌ Error during advisor query:', advisorQueryError)
        console.error('❌ Error stack:', advisorQueryError.stack)
        return false
      }
      
      if (!advisorResults || advisorResults.length === 0) {
        console.error('❌ Advisor not found for notification:', data.requestedBy)
        return false
      }

      const advisor = advisorResults[0]
      console.log('🔍 Advisor object:', advisor)

      console.log('✅ Advisor found:', {
        id: advisor.id,
        name: advisor.name || 'Unknown User',
        email: advisor.email
      })

      // Find or create conversation for this application
      console.log('🔍 Looking for existing conversation...')
      const conversationResults = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.applicationId, data.applicationId),
          eq(conversations.clientId, application.clientId)
        ))
        .limit(1)

      console.log('🔍 Conversation search results:', conversationResults)
      let conversation = conversationResults && conversationResults.length > 0 ? conversationResults[0] : null
      console.log('🔍 Conversation search result:', conversation ? 'found existing conversation' : 'no conversation found')

      if (!conversation) {
        // Create new conversation
        console.log('📝 No existing conversation found. Creating new conversation for original document request')
        console.log('📝 Creating conversation with data:', {
          firmId: data.firmId,
          clientId: application.clientId,
          applicationId: data.applicationId,
          title: `Application ${application.applicationNumber} - Documents`,
          status: 'active',
          priority: data.isUrgent ? 'urgent' : 'normal',
          assignedAdvisorId: application.assignedAdvisorId,
        })
        
        const newConversationResults = await db
          .insert(conversations)
          .values({
            firmId: data.firmId,
            clientId: application.clientId,
            applicationId: data.applicationId,
            title: `Application ${application.applicationNumber} - Documents`,
            status: 'active',
            priority: data.isUrgent ? 'urgent' : 'normal',
            assignedAdvisorId: application.assignedAdvisorId,
            lastMessageAt: new Date(),
          })
          .returning()

        console.log('📝 New conversation creation results:', newConversationResults)
        
        if (!newConversationResults || newConversationResults.length === 0) {
          console.error('❌ Failed to create new conversation')
          return false
        }
        
        conversation = newConversationResults[0]
        console.log('✅ New conversation created with ID:', conversation.id)
      } else {
        // Update existing conversation
        console.log('📝 Updating existing conversation:', conversation.id)
        await db
          .update(conversations)
          .set({
            lastMessageAt: new Date(),
            priority: data.isUrgent ? 'urgent' : 'normal'
          })
          .where(eq(conversations.id, conversation.id))
        console.log('✅ Existing conversation updated')
      }

      // Create notification message
      const urgentPrefix = data.isUrgent ? '🚨 URGENT: ' : ''
      const deadlineText = data.deadline 
        ? `\n\n⏰ **Deadline:** ${new Date(data.deadline).toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })}`
        : ''

      const instructionsText = data.clientInstructions 
        ? `\n\n📋 **Special Instructions:**\n${data.clientInstructions}`
        : ''

      const messageContent = `${urgentPrefix}📄 **Original Document Request**

Hello! We need you to send us the physical original of the following document for your application:

**Document:** ${data.documentName}
**Application:** ${application.applicationNumber}${deadlineText}

📮 **Shipping Address:**
${data.shippingAddress}${instructionsText}

Please send the original document via a trackable courier service (DHL, FedEx, UPS, etc.) and provide us with the tracking number once shipped.

If you have any questions, please reply to this message.

Best regards,
${advisor.name || 'Your Advisory Team'}`

      // Insert the message
      console.log('💬 About to insert notification message...')
      console.log('💬 Message data:', {
        conversationId: conversation.id,
        messageType: 'system',
        senderType: 'system',
        senderAdvisorId: data.requestedBy,
        contentLength: messageContent.length
      })
      
      await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          content: messageContent,
          messageType: 'system',
          senderType: 'system',
          senderAdvisorId: data.requestedBy,
        })

      console.log('✅ Message inserted successfully')
      console.log('✅ Original document notification sent successfully')
      return true

    } catch (error) {
      console.error('❌ Error sending original document notification:', error)
      return false
    }
  }

  /**
   * Send notification when original documents are received
   */
  async notifyClientOfDocumentReceived(
    applicationId: string,
    documentName: string,
    condition: string,
    receivedBy: string
  ): Promise<boolean> {
    try {
      // Get application and conversation
      const [application] = await db
        .select({
          applicationNumber: applications.applicationNumber,
          clientId: applications.clientId
        })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1)

      if (!application) return false

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.applicationId, applicationId),
          eq(conversations.clientId, application.clientId)
        ))
        .limit(1)

      if (!conversation) return false

      // Get advisor details
      const [advisor] = await db
        .select({
          firstName: users.firstName,
          lastName: users.lastName
        })
        .from(users)
        .where(eq(users.id, receivedBy))
        .limit(1)

      const messageContent = `✅ **Document Received**

We have successfully received your original document:

**Document:** ${documentName}
**Application:** ${application.applicationNumber}
**Condition:** ${condition.charAt(0).toUpperCase() + condition.slice(1)}
**Received by:** ${advisor?.firstName} ${advisor?.lastName}

Your document is now being processed for government submission. We'll keep you updated on the progress.

Thank you for sending the original document promptly!`

      await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          content: messageContent,
          messageType: 'system',
          senderType: 'system',
          senderAdvisorId: receivedBy,
        })

      // Update conversation
      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversation.id))

      return true
    } catch (error) {
      console.error('Error sending document received notification:', error)
      return false
    }
  }

  /**
   * Send notification when original documents are verified and ready for government
   */
  async notifyClientOfDocumentVerified(
    applicationId: string,
    documentName: string,
    verifiedBy: string
  ): Promise<boolean> {
    try {
      // Similar implementation to received notification
      const [application] = await db
        .select({
          applicationNumber: applications.applicationNumber,
          clientId: applications.clientId
        })
        .from(applications)
        .where(eq(applications.id, applicationId))
        .limit(1)

      if (!application) return false

      const [conversation] = await db
        .select()
        .from(conversations)
        .where(and(
          eq(conversations.applicationId, applicationId),
          eq(conversations.clientId, application.clientId)
        ))
        .limit(1)

      if (!conversation) return false

      const messageContent = `🎉 **Document Verified & Ready**

Great news! Your original document has been verified and is ready for government submission:

**Document:** ${documentName}
**Application:** ${application.applicationNumber}
**Status:** Verified and Ready for Government Submission

Your application is now progressing to the next stage. We'll continue to keep you updated on the government submission process.

Thank you for your cooperation throughout this process!`

      await db
        .insert(messages)
        .values({
          conversationId: conversation.id,
          content: messageContent,
          messageType: 'system', 
          senderType: 'system',
          senderAdvisorId: verifiedBy,
        })

      await db
        .update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, conversation.id))

      return true
    } catch (error) {
      console.error('Error sending document verified notification:', error)
      return false
    }
  }
}

export const originalDocumentNotificationService = new OriginalDocumentNotificationService()