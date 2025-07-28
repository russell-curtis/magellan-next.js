// Client Original Documents API Endpoint
// Provides client access to view their original document status

import { NextRequest, NextResponse } from 'next/server'
import { requireClientAuth } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { applications, originalDocuments, documentRequirements } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// ============================================================================
// GET - Get original documents for client's application
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: applicationId } = await params
    console.log('🔍 Client original documents API called for application:', applicationId)
    
    // Authenticate client
    const client = await requireClientAuth()
    console.log('✅ Client authenticated:', {
      clientId: client.id,
      authId: client.authId,
      email: client.email
    })
    
    // Verify the application belongs to this client
    const [application] = await db
      .select({ id: applications.id, clientId: applications.clientId })
      .from(applications)
      .where(and(
        eq(applications.id, applicationId),
        eq(applications.clientId, client.id)
      ))
      .limit(1)

    if (!application) {
      console.log('❌ Application not found or access denied for:', applicationId, 'client:', client.id)
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      )
    }
    
    console.log('✅ Application access verified:', application.id)

    // Get original documents for this application with document requirement details
    console.log('🔍 Querying original documents for application:', applicationId)
    
    try {
      // Simple query first - just get original documents without joins to isolate issues
      const originalDocumentsList = await db
        .select()
        .from(originalDocuments)
        .where(eq(originalDocuments.applicationId, applicationId))

      console.log('📊 Found original documents (basic query):', originalDocumentsList.length)

      // If we have original documents, get the full data with document requirements
      if (originalDocumentsList.length > 0) {
        const fullDocumentsList = await db
          .select({
            // Original document fields
            id: originalDocuments.id,
            applicationId: originalDocuments.applicationId,
            documentRequirementId: originalDocuments.documentRequirementId,
            digitalDocumentId: originalDocuments.digitalDocumentId,
            status: originalDocuments.status,
            
            // Request details
            requestedAt: originalDocuments.requestedAt,
            clientNotifiedAt: originalDocuments.clientNotifiedAt,
            clientInstructions: originalDocuments.clientInstructions,
            deadline: originalDocuments.deadline,
            isUrgent: originalDocuments.isUrgent,
            shippingAddress: originalDocuments.shippingAddress,
            
            // Shipping details
            shippedAt: originalDocuments.shippedAt,
            courierService: originalDocuments.courierService,
            trackingNumber: originalDocuments.trackingNumber,
            clientReference: originalDocuments.clientReference,
            
            // Receipt details
            receivedAt: originalDocuments.receivedAt,
            documentCondition: originalDocuments.documentCondition,
            qualityNotes: originalDocuments.qualityNotes,
            isAuthenticated: originalDocuments.isAuthenticated,
            
            // Verification details
            verifiedAt: originalDocuments.verifiedAt,
            
            // Metadata
            createdAt: originalDocuments.createdAt,
            updatedAt: originalDocuments.updatedAt,
            
            // Document requirement details
            documentName: documentRequirements.documentName,
            category: documentRequirements.category,
            isRequired: documentRequirements.isRequired
          })
          .from(originalDocuments)
          .innerJoin(
            documentRequirements,
            eq(originalDocuments.documentRequirementId, documentRequirements.id)
          )
          .where(eq(originalDocuments.applicationId, applicationId))

        console.log('📊 Full documents with requirements:', fullDocumentsList.length)

        // Process the documents to ensure proper date formatting
        const processedDocuments = fullDocumentsList.map(doc => ({
          ...doc,
          // Convert all date fields to strings for JSON serialization
          requestedAt: doc.requestedAt ? new Date(doc.requestedAt).toISOString() : null,
          clientNotifiedAt: doc.clientNotifiedAt ? new Date(doc.clientNotifiedAt).toISOString() : null,
          deadline: doc.deadline ? new Date(doc.deadline).toISOString() : null,
          shippedAt: doc.shippedAt ? new Date(doc.shippedAt).toISOString() : null,
          receivedAt: doc.receivedAt ? new Date(doc.receivedAt).toISOString() : null,
          verifiedAt: doc.verifiedAt ? new Date(doc.verifiedAt).toISOString() : null,
          createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
          updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
        }))

        return NextResponse.json({
          applicationId,
          originalDocuments: processedDocuments,
          totalCount: processedDocuments.length
        })
      } else {
        // No original documents found - return empty array
        console.log('📊 No original documents found for application')
        return NextResponse.json({
          applicationId,
          originalDocuments: [],
          totalCount: 0
        })
      }
    } catch (dbError) {
      console.error('❌ Database error in original documents query:', dbError)
      // Return empty array on database errors rather than failing
      return NextResponse.json({
        applicationId,
        originalDocuments: [],
        totalCount: 0
      })
    }

  } catch (error) {
    console.error('Error fetching client original documents:', error)
    
    // Handle authentication errors specifically
    if (error instanceof Error && error.message === 'Client authentication required') {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch original document status' },
      { status: 500 }
    )
  }
}