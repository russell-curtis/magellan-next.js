import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES, TASK_TYPES } from '@/db/schema'

export const createTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Title too long'),
  description: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  priority: z.enum(TASK_PRIORITIES).default('medium'),
  status: z.enum(TASK_STATUSES).default('pending'),
  taskType: z.enum(TASK_TYPES).optional(),
  dueDate: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  reminderAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  assignedToId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  clientId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().uuid().nullable().optional()
  ),
  applicationId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().uuid().nullable().optional()
  )
})

export const updateTaskSchema = z.object({
  title: z.string().min(1, 'Task title is required').max(255, 'Title too long').optional(),
  description: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  priority: z.enum(TASK_PRIORITIES).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  taskType: z.enum(TASK_TYPES).optional(),
  dueDate: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  reminderAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  assignedToId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  completedAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  )
})

export const taskFilterSchema = z.object({
  status: z.enum([...TASK_STATUSES, 'all']).default('all'),
  priority: z.enum([...TASK_PRIORITIES, 'all']).default('all'),
  taskType: z.enum([...TASK_TYPES, 'all']).default('all'),
  assignedToId: z.string().optional(),
  clientId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  dueAfter: z.string().optional(),
  dueBefore: z.string().optional(),
  sortBy: z.enum(['dueDate', 'priority', 'status', 'createdAt', 'title']).default('dueDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  limit: z.preprocess(
    (val) => val ? parseInt(String(val)) : 50,
    z.number().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    (val) => val ? parseInt(String(val)) : 0,
    z.number().min(0).default(0)
  )
})

export type CreateTaskData = z.infer<typeof createTaskSchema>
export type UpdateTaskData = z.infer<typeof updateTaskSchema>
export type TaskFilterData = z.infer<typeof taskFilterSchema>