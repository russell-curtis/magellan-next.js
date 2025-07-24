import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { tasks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
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
    
    // Only validate and process fields that are actually present in the request
    const fieldsToUpdate = Object.keys(body)
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

    // Prepare update data - only include fields that were actually sent in the request
    const updateData: Record<string, unknown> = {}
    
    if (fieldsToUpdate.includes('title') && validatedData.title !== undefined) {
      updateData.title = validatedData.title
    }
    if (fieldsToUpdate.includes('description') && validatedData.description !== undefined) {
      updateData.description = validatedData.description
    }
    if (fieldsToUpdate.includes('priority') && validatedData.priority !== undefined) {
      updateData.priority = validatedData.priority
    }
    if (fieldsToUpdate.includes('status') && validatedData.status !== undefined) {
      updateData.status = validatedData.status
    }
    if (fieldsToUpdate.includes('dueDate') && validatedData.dueDate !== undefined) {
      updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null
    }
    if (fieldsToUpdate.includes('reminderAt') && validatedData.reminderAt !== undefined) {
      updateData.reminderAt = validatedData.reminderAt ? new Date(validatedData.reminderAt) : null
    }
    if (fieldsToUpdate.includes('taskType') && validatedData.taskType !== undefined) {
      updateData.taskType = validatedData.taskType
    }
    if (fieldsToUpdate.includes('assignedToId') && validatedData.assignedToId !== undefined) {
      updateData.assignedToId = validatedData.assignedToId
    }
    if (fieldsToUpdate.includes('completedAt') && validatedData.completedAt !== undefined) {
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