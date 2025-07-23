import { z } from 'zod'

export const createApplicationSchema = z.object({
  clientId: z.string().uuid('Invalid client ID'),
  programId: z.string().uuid('Invalid program ID'),
  investmentAmount: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return undefined
      const parsed = parseFloat(String(val))
      return isNaN(parsed) ? undefined : parsed
    },
    z.number().min(0, 'Investment amount must be positive')
  ),
  investmentType: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  decisionExpectedAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  notes: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  )
})

export const updateApplicationSchema = z.object({
  status: z.enum(['draft', 'submitted', 'under_review', 'approved', 'rejected']).optional(),
  investmentAmount: z.preprocess(
    (val) => {
      if (val === null || val === undefined || val === '') return undefined
      const parsed = parseFloat(String(val))
      return isNaN(parsed) ? undefined : parsed
    },
    z.number().min(0, 'Investment amount must be positive').optional()
  ),
  investmentType: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  decisionExpectedAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  notes: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  ),
  internalNotes: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  )
})

export type CreateApplicationData = z.infer<typeof createApplicationSchema>
export type UpdateApplicationData = z.infer<typeof updateApplicationSchema>