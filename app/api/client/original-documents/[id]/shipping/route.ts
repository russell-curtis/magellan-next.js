// Client Shipping Update API
// Allows clients to provide shipping/tracking information for original documents

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { originalDocuments, applications } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { requireClientAuth } from '@/lib/client-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: originalDocumentId } = await params
    const body = await request.json()
    const { courierService, trackingNumber, shippedAt, clientReference } = body

    // Authenticate client
    let client
    try {
      client = await requireClientAuth()
      console.log('✅ Client authenticated for shipping update:', {
        clientId: client.id,
        authId: client.authId,
        email: client.email
      })
    } catch (authError) {
      console.error('❌ Client authentication failed:', authError)
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Validate required fields
    if (!courierService?.trim()) {
      return NextResponse.json(
        { error: 'Courier service is required' },
        { status: 400 }
      )
    }

    if (!trackingNumber?.trim()) {
      return NextResponse.json(
        { error: 'Tracking number is required' },
        { status: 400 }
      )
    }

    // Get original document and verify client ownership
    console.log('🔍 Looking up original document:', originalDocumentId)
    const originalDoc = await db
      .select({
        id: originalDocuments.id,
        status: originalDocuments.status,
        applicationId: originalDocuments.applicationId,
        clientId: applications.clientId
      })
      .from(originalDocuments)
      .leftJoin(applications, eq(originalDocuments.applicationId, applications.id))
      .where(eq(originalDocuments.id, originalDocumentId))
      .limit(1)

    console.log('📋 Original document query results:', originalDoc)

    if (!originalDoc.length) {
      console.error('❌ Original document not found:', originalDocumentId)
      return NextResponse.json(
        { error: 'Original document not found' },
        { status: 404 }
      )
    }

    const doc = originalDoc[0]
    console.log('📄 Document details:', {
      id: doc.id,
      status: doc.status,
      clientId: doc.clientId,
      requestingClientId: client.id
    })

    // Verify client ownership
    if (doc.clientId !== client.id) {
      return NextResponse.json(
        { error: 'Unauthorized access to this document' },
        { status: 403 }
      )
    }

    // Verify document is in correct status for shipping update
    if (doc.status !== 'originals_requested') {
      return NextResponse.json(
        { error: 'Document is not in a state that allows shipping updates' },
        { status: 400 }
      )
    }

    // Update shipping information
    console.log('📦 Updating shipping information:', {
      originalDocumentId,
      courierService: courierService.trim(),
      trackingNumber: trackingNumber.trim(),
      shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
      clientReference: clientReference?.trim() || null
    })

    await db
      .update(originalDocuments)
      .set({
        status: 'originals_shipped',
        courierService: courierService.trim(),
        trackingNumber: trackingNumber.trim(),
        shippedAt: shippedAt ? new Date(shippedAt) : new Date(),
        clientReference: clientReference?.trim() || null,
        updatedAt: new Date()
      })
      .where(eq(originalDocuments.id, originalDocumentId))

    console.log('✅ Shipping information updated successfully')

    return NextResponse.json({
      success: true,
      message: 'Shipping information updated successfully'
    })

  } catch (error) {
    console.error('Error updating shipping information:', error)
    return NextResponse.json(
      { error: 'Failed to update shipping information' },
      { status: 500 }
    )
  }
}