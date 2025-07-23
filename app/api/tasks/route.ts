import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { db } from '@/db/drizzle'
import { tasks, clients, applications, users, crbiPrograms } from '@/db/schema'
import { eq, desc, sql } from 'drizzle-orm'
import { z } from 'zod'
import { createTaskSchema } from '@/lib/validations/tasks'

export async function GET() {
  try {
    const user = await requireAuth()
    
    // TODO: Implement filtering in future iteration
    // const url = new URL(req.url)
    // const filters = taskFilterSchema.parse(Object.fromEntries(url.searchParams))

    // Get tasks with related data
    const tasksWithRelations = await db
      .select({
        task: tasks,
        client: {
          id: clients.id,
          name: sql<string>`concat(${clients.firstName}, ' ', ${clients.lastName})`.as('name')
        },
        assignedTo: {
          id: users.id,
          name: users.name,
          email: users.email
        },
        application: {
          id: applications.id,
          programName: sql<string>`concat(${crbiPrograms.countryName}, ' ', ${crbiPrograms.programType})`.as('programName')
        }
      })
      .from(tasks)
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .leftJoin(users, eq(tasks.assignedToId, users.id))
      .leftJoin(applications, eq(tasks.applicationId, applications.id))
      .leftJoin(crbiPrograms, eq(applications.programId, crbiPrograms.id))
      .where(eq(tasks.firmId, user.firmId))
      .orderBy(desc(tasks.createdAt))
      .limit(50)

    // Transform the results
    const formattedTasks = tasksWithRelations.map((row) => ({
      id: row.task.id,
      title: row.task.title,
      description: row.task.description,
      priority: row.task.priority,
      status: row.task.status,
      dueDate: row.task.dueDate?.toISOString() || new Date().toISOString(),
      taskType: row.task.taskType,
      createdAt: row.task.createdAt?.toISOString() || new Date().toISOString(),
      client: row.client?.id ? {
        id: row.client.id,
        name: row.client.name
      } : null,
      assignedTo: row.assignedTo?.id ? {
        id: row.assignedTo.id,
        name: row.assignedTo.name,
        email: row.assignedTo.email
      } : null,
      application: row.application?.id ? {
        id: row.application.id,
        programName: row.application.programName
      } : null
    }))

    // If no real tasks exist, provide some sample tasks for demo purposes
    if (formattedTasks.length === 0) {
      const sampleTasks = [
        {
          id: 'sample-1',
          title: 'Upload passport documents for Emma Brown',
          description: 'Collect and verify passport documentation for Cyprus citizenship application',
          priority: 'high' as const,
          status: 'pending' as const,
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          taskType: 'document_collection',
          createdAt: new Date().toISOString(),
          client: { id: 'sample-client-1', name: 'Emma Brown' },
          assignedTo: { id: user.id, name: user.name, email: user.email },
          application: { id: 'sample-app-1', programName: 'Cyprus Citizenship' }
        },
        {
          id: 'sample-2',
          title: 'Schedule compliance review for John Smith',
          description: 'Review all documentation and ensure compliance with Portugal residency requirements',
          priority: 'urgent' as const,
          status: 'pending' as const,
          dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // Overdue
          taskType: 'compliance_review',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          client: { id: 'sample-client-2', name: 'John Smith' },
          assignedTo: { id: user.id, name: user.name, email: user.email },
          application: { id: 'sample-app-2', programName: 'Portugal Residency' }
        },
        {
          id: 'sample-3',
          title: 'Follow up on investment verification',
          description: 'Contact bank to verify investment funds for Malta application',
          priority: 'medium' as const,
          status: 'in_progress' as const,
          dueDate: new Date().toISOString(), // Due today
          taskType: 'investment_verification',
          createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          client: { id: 'sample-client-3', name: 'Maria Garcia' },
          assignedTo: null,
          application: { id: 'sample-app-3', programName: 'Malta Residency' }
        },
        {
          id: 'sample-4',
          title: 'Prepare application submission',
          description: 'Final review and submission of complete application package',
          priority: 'high' as const,
          status: 'pending' as const,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          taskType: 'application_submission',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          client: { id: 'sample-client-4', name: 'David Chen' },
          assignedTo: { id: user.id, name: user.name, email: user.email },
          application: { id: 'sample-app-4', programName: 'Cyprus Residency' }
        },
        {
          id: 'sample-5',
          title: 'Client consultation meeting',
          description: 'Initial consultation to discuss program options and requirements',
          priority: 'low' as const,
          status: 'completed' as const,
          dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          taskType: 'client_meeting',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          client: { id: 'sample-client-5', name: 'Sarah Wilson' },
          assignedTo: { id: user.id, name: user.name, email: user.email },
          application: null
        }
      ]

      return NextResponse.json({ tasks: sampleTasks })
    }

    return NextResponse.json({ tasks: formattedTasks })

  } catch (error) {
    console.error('Tasks fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()

    const body = await request.json()
    const validatedData = createTaskSchema.parse(body)

    const [newTask] = await db
      .insert(tasks)
      .values({
        firmId: user.firmId,
        createdById: user.id,
        assignedToId: validatedData.assignedToId || user.id,
        clientId: validatedData.clientId || null,
        applicationId: validatedData.applicationId || null,
        title: validatedData.title,
        description: validatedData.description || null,
        priority: validatedData.priority,
        status: 'pending',
        dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : null,
        reminderAt: validatedData.reminderAt ? new Date(validatedData.reminderAt) : null,
        taskType: validatedData.taskType || null,
        createdAt: new Date(),
        updatedAt: new Date()
      })
      .returning()

    return NextResponse.json({ task: newTask }, { status: 201 })

  } catch (error) {
    console.error('Task creation error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}