import { z } from 'zod'
import { CLIENT_STATUSES } from '@/db/schema'

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().max(50).optional().or(z.literal('')),
  nationality: z.string().max(100).optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  passportNumber: z.string().max(100).optional().or(z.literal('')),
  netWorthEstimate: z.string().optional().or(z.literal('')),
  investmentBudget: z.string().optional().or(z.literal('')),
  preferredPrograms: z.array(z.string()).optional().default([]),
  sourceOfFunds: z.string().optional().or(z.literal('')),
  status: z.enum(CLIENT_STATUSES).default('prospect'),
  notes: z.string().optional().or(z.literal('')),
  tags: z.array(z.string()).optional().default([]),
  assignedAdvisorId: z.string().uuid().optional().or(z.literal(''))
})

export const updateClientSchema = createClientSchema.partial()

export const clientQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
  search: z.string().optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  advisorId: z.string().uuid().optional()
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientQueryParams = z.infer<typeof clientQuerySchema>