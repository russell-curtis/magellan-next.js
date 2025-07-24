import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { documents } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { documentUpdateSchema } from '@/lib/validations/documents'

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const params = await props.params
    const documentId = params.id

    // Fetch document
    const [document] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.firmId, user.firmId)
      ))
      .limit(1)

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json({ document })

  } catch (error) {
    console.error('Document fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch document' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const params = await props.params
    const documentId = params.id
    const body = await request.json()
    
    const validatedData = documentUpdateSchema.parse(body)

    // Check if document exists and belongs to user's firm
    const [existingDocument] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.firmId, user.firmId)
      ))
      .limit(1)

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    if (validatedData.documentType !== undefined) {
      updateData.documentType = validatedData.documentType
    }
    if (validatedData.category !== undefined) {
      updateData.category = validatedData.category
    }
    if (validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (validatedData.complianceStatus !== undefined) {
      updateData.complianceStatus = validatedData.complianceStatus
    }
    if (validatedData.complianceNotes !== undefined) {
      updateData.complianceNotes = validatedData.complianceNotes
    }
    if (validatedData.expiresAt !== undefined) {
      updateData.expiresAt = validatedData.expiresAt ? new Date(validatedData.expiresAt) : null
    }

    updateData.updatedAt = new Date()

    const [updatedDocument] = await db
      .update(documents)
      .set(updateData)
      .where(eq(documents.id, documentId))
      .returning()

    return NextResponse.json({ document: updatedDocument })

  } catch (error) {
    console.error('Document update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update document' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const params = await props.params
    const documentId = params.id

    // Check if document exists and belongs to user's firm
    const [existingDocument] = await db
      .select()
      .from(documents)
      .where(and(
        eq(documents.id, documentId),
        eq(documents.firmId, user.firmId)
      ))
      .limit(1)

    if (!existingDocument) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Soft delete by updating status
    await db
      .update(documents)
      .set({
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(eq(documents.id, documentId))

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Document deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}