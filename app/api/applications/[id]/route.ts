import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications } from '@/db/schema'
import { updateApplicationSchema } from '@/lib/validations/applications'
import { requireAuth } from '@/lib/auth-utils'
import { eq, and } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const applicationId = resolvedParams.id

    const application = await db
      .select()
      .from(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.firmId, user.firmId)
        )
      )
      .limit(1)

    if (application.length === 0) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ application: application[0] })

  } catch (error) {
    console.error('Error fetching application:', error)
    return NextResponse.json(
      { error: 'Failed to fetch application' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const applicationId = resolvedParams.id
    
    const body = await req.json()
    const validatedData = updateApplicationSchema.parse(body)

    const updateData: Record<string, unknown> = {
      updatedAt: new Date()
    }

    if (validatedData.status) {
      updateData.status = validatedData.status
      
      // Update timestamps based on status changes
      if (validatedData.status === 'submitted' && !updateData.submittedAt) {
        updateData.submittedAt = new Date()
      }
      
      if (['approved', 'rejected'].includes(validatedData.status) && !updateData.decidedAt) {
        updateData.decidedAt = new Date()
      }
    }

    if (validatedData.priority) {
      updateData.priority = validatedData.priority
    }

    if (validatedData.investmentAmount !== undefined) {
      updateData.investmentAmount = validatedData.investmentAmount?.toString() || null
    }

    if (validatedData.investmentType !== undefined) {
      updateData.investmentType = validatedData.investmentType
    }

    if (validatedData.decisionExpectedAt !== undefined) {
      updateData.decisionExpectedAt = validatedData.decisionExpectedAt 
        ? new Date(validatedData.decisionExpectedAt) 
        : null
    }

    if (validatedData.notes !== undefined) {
      updateData.notes = validatedData.notes
    }

    if (validatedData.internalNotes !== undefined) {
      updateData.internalNotes = validatedData.internalNotes
    }

    const updatedApplication = await db
      .update(applications)
      .set(updateData)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.firmId, user.firmId)
        )
      )
      .returning()

    if (updatedApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      application: updatedApplication[0],
      message: 'Application updated successfully'
    })

  } catch (error) {
    console.error('Error updating application:', error)
    
    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid input data', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update application' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const resolvedParams = await params
    const applicationId = resolvedParams.id

    const deletedApplication = await db
      .delete(applications)
      .where(
        and(
          eq(applications.id, applicationId),
          eq(applications.firmId, user.firmId)
        )
      )
      .returning()

    if (deletedApplication.length === 0) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      message: 'Application deleted successfully'
    })

  } catch (error) {
    console.error('Error deleting application:', error)
    return NextResponse.json(
      { error: 'Failed to delete application' },
      { status: 500 }
    )
  }
}