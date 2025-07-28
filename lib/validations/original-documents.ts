// Original Document Validation Schemas
// Handles validation for physical document tracking and status flow

import { z } from 'zod'

// ============================================================================
// ORIGINAL DOCUMENT STATUS VALIDATION
// ============================================================================

export const originalDocumentStatusSchema = z.enum([
  'digital_approved',
  'originals_requested', 
  'originals_shipped',
  'originals_received',
  'originals_verified',
  'ready_for_government'
])

export const documentConditionSchema = z.enum([
  'excellent',
  'good', 
  'acceptable',
  'damaged'
])

export const courierServiceSchema = z.enum([
  'DHL',
  'FedEx', 
  'UPS',
  'USPS',
  'Royal Mail',
  'Other'
])

// ============================================================================
// ORIGINAL DOCUMENT REQUEST VALIDATION
// ============================================================================

export const requestOriginalDocumentSchema = z.object({
  applicationId: z.string().uuid(),
  documentRequirementId: z.string().uuid(),
  digitalDocumentId: z.string().uuid().optional(),
  clientInstructions: z.string().optional(),
  deadline: z.string().datetime().optional(),
  isUrgent: z.boolean().default(false),
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  internalNotes: z.string().optional()
})

// ============================================================================
// SHIPPING INFORMATION VALIDATION
// ============================================================================

export const updateShippingInfoSchema = z.object({
  courierService: courierServiceSchema,
  trackingNumber: z.string().min(3, 'Tracking number is required'),
  shippedAt: z.string().datetime().optional(),
  clientReference: z.string().optional(),
  expectedDeliveryDate: z.string().datetime().optional()
})

// ============================================================================
// RECEIPT CONFIRMATION VALIDATION
// ============================================================================

export const confirmReceiptSchema = z.object({
  receivedAt: z.string().datetime().optional(),
  documentCondition: documentConditionSchema,
  qualityNotes: z.string().optional(),
  isAuthenticated: z.boolean().default(false),
  authenticationDetails: z.string().optional(),
  internalNotes: z.string().optional()
})

// ============================================================================
// VERIFICATION COMPLETION VALIDATION
// ============================================================================

export const completeVerificationSchema = z.object({
  verificationStatus: z.enum(['verified', 'rejected']),
  verificationNotes: z.string().optional(),
  isAuthenticated: z.boolean().default(false),
  authenticationDetails: z.string().optional(),
  internalNotes: z.string().optional()
})

// ============================================================================
// STATUS UPDATE VALIDATION
// ============================================================================

export const updateOriginalDocumentStatusSchema = z.object({
  status: originalDocumentStatusSchema,
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
})

// ============================================================================
// BULK OPERATIONS VALIDATION
// ============================================================================

export const bulkRequestOriginalDocumentsSchema = z.object({
  applicationId: z.string().uuid(),
  documentRequirementIds: z.array(z.string().uuid()).min(1),
  clientInstructions: z.string().optional(),
  deadline: z.string().datetime().optional(),
  isUrgent: z.boolean().default(false),
  shippingAddress: z.string().min(10, 'Shipping address is required'),
  internalNotes: z.string().optional()
})

// ============================================================================
// QUERY FILTERS VALIDATION
// ============================================================================

export const originalDocumentFiltersSchema = z.object({
  applicationId: z.string().uuid().optional(),
  status: originalDocumentStatusSchema.optional(),
  isUrgent: z.boolean().optional(),
  courierService: courierServiceSchema.optional(),
  documentCondition: documentConditionSchema.optional(),
  receivedDateFrom: z.string().datetime().optional(),
  receivedDateTo: z.string().datetime().optional(),
  deadlineFrom: z.string().datetime().optional(),
  deadlineTo: z.string().datetime().optional()
})

// ============================================================================
// STATUS TRANSITION VALIDATION
// ============================================================================

/**
 * Get valid status transitions for original documents
 */
export function getValidOriginalDocumentTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    'digital_approved': ['originals_requested'],
    'originals_requested': ['originals_shipped', 'digital_approved'], // Can go back if cancelled
    'originals_shipped': ['originals_received', 'originals_requested'], // Can go back if lost/returned
    'originals_received': ['originals_verified', 'originals_shipped'], // Can go back if rejected
    'originals_verified': ['ready_for_government', 'originals_received'], // Can go back if issues found
    'ready_for_government': [] // Final state for original document tracking
  }

  return transitions[currentStatus] || []
}

/**
 * Validate status transition for original documents
 */
export function validateOriginalDocumentStatusTransition(
  currentStatus: string,
  newStatus: string
): { valid: boolean; error?: string } {
  const validTransitions = getValidOriginalDocumentTransitions(currentStatus)
  
  if (!validTransitions.includes(newStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from '${currentStatus}' to '${newStatus}'. Valid transitions: ${validTransitions.join(', ')}`
    }
  }

  return { valid: true }
}

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OriginalDocumentStatus = z.infer<typeof originalDocumentStatusSchema>
export type DocumentCondition = z.infer<typeof documentConditionSchema>
export type CourierService = z.infer<typeof courierServiceSchema>
export type RequestOriginalDocumentInput = z.infer<typeof requestOriginalDocumentSchema>
export type UpdateShippingInfoInput = z.infer<typeof updateShippingInfoSchema>
export type ConfirmReceiptInput = z.infer<typeof confirmReceiptSchema>
export type CompleteVerificationInput = z.infer<typeof completeVerificationSchema>
export type UpdateOriginalDocumentStatusInput = z.infer<typeof updateOriginalDocumentStatusSchema>
export type BulkRequestOriginalDocumentsInput = z.infer<typeof bulkRequestOriginalDocumentsSchema>
export type OriginalDocumentFilters = z.infer<typeof originalDocumentFiltersSchema>