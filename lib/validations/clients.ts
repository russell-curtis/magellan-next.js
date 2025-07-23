import { z } from 'zod'
import { CLIENT_STATUSES } from '@/db/schema'

export const createClientSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().email('Invalid email address').optional()
  ),
  phone: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().max(50).optional()
  ),
  nationality: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().max(100).optional()
  ),
  dateOfBirth: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  passportNumber: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().max(100).optional()
  ),
  netWorthEstimate: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  investmentBudget: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  preferredPrograms: z.preprocess(
    (val) => val === null || val === undefined ? [] : val,
    z.array(z.string()).default([])
  ),
  sourceOfFunds: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  status: z.enum(CLIENT_STATUSES).default('prospect'),
  notes: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  tags: z.preprocess(
    (val) => val === null || val === undefined ? [] : val,
    z.array(z.string()).default([])
  ),
  assignedAdvisorId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().uuid().optional()
  )
})

export const updateClientSchema = createClientSchema.partial()

export const clientQuerySchema = z.object({
  page: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional().transform(val => val ? parseInt(val, 10) : 1)
  ),
  limit: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional().transform(val => val ? parseInt(val, 10) : 50)
  ),
  search: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  status: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(CLIENT_STATUSES).optional()
  ),
  advisorId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().uuid().optional()
  )
})

export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientQueryParams = z.infer<typeof clientQuerySchema>