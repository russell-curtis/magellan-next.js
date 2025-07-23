import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { tasks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { updateTaskSchema } from '@/lib/validations/tasks'

export async function PUT(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()

    const params = await props.params
    const taskId = params.id
    const body = await request.json()
    const validatedData = updateTaskSchema.parse(body)

    // Check if task exists and belongs to user's firm
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ))
      .limit(1)

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}
    
    if (validatedData.title !== undefined) updateData.title = validatedData.title
    if (validatedData.description !== undefined) updateData.description = validatedData.description
    if (validatedData.priority !== undefined) updateData.priority = validatedData.priority
    if (validatedData.status !== undefined) updateData.status = validatedData.status
    if (validatedData.dueDate !== undefined) updateData.dueDate = new Date(validatedData.dueDate)
    if (validatedData.assignedToId !== undefined) updateData.assignedToId = validatedData.assignedToId
    if (validatedData.completedAt !== undefined) {
      updateData.completedAt = validatedData.completedAt ? new Date(validatedData.completedAt) : null
    }

    updateData.updatedAt = new Date()

    const [updatedTask] = await db
      .update(tasks)
      .set(updateData)
      .where(eq(tasks.id, taskId))
      .returning()

    return NextResponse.json({ task: updatedTask })

  } catch (error) {
    console.error('Task update error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to update task' },
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
    const taskId = params.id

    // Check if task exists and belongs to user's firm
    const [existingTask] = await db
      .select()
      .from(tasks)
      .where(and(
        eq(tasks.id, taskId),
        eq(tasks.firmId, user.firmId)
      ))
      .limit(1)

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await db
      .delete(tasks)
      .where(eq(tasks.id, taskId))

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Task deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}