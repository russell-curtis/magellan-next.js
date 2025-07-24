import { z } from 'zod'

export const documentUploadSchema = z.object({
  clientId: z.string().uuid().optional().nullable(),
  applicationId: z.string().uuid().optional().nullable(),
  documentType: z.string().min(1, 'Document type is required'),
  category: z.string().optional().nullable(),
  description: z.string().optional().nullable()
})

export const documentUpdateSchema = z.object({
  documentType: z.string().optional(),
  category: z.string().optional().nullable(),
  status: z.enum(['uploaded', 'verified', 'rejected', 'expired', 'deleted']).optional(),
  complianceStatus: z.enum(['pending_review', 'approved', 'rejected', 'requires_update']).optional(),
  complianceNotes: z.string().optional().nullable(),
  expiresAt: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? null : val,
    z.string().nullable().optional()
  )
})

export const documentFilterSchema = z.object({
  clientId: z.string().uuid().optional(),
  applicationId: z.string().uuid().optional(),
  documentType: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['uploaded', 'verified', 'rejected', 'expired', 'deleted', 'all']).default('all'),
  complianceStatus: z.enum(['pending_review', 'approved', 'rejected', 'requires_update', 'all']).default('all'),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'filename', 'documentType', 'fileSize']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  limit: z.preprocess(
    (val) => val ? parseInt(String(val)) : 50,
    z.number().min(1).max(100).default(50)
  ),
  offset: z.preprocess(
    (val) => val ? parseInt(String(val)) : 0,
    z.number().min(0).default(0)
  )
})

// Document type categories for organization
export const DOCUMENT_CATEGORIES = {
  identity: 'Identity Documents',
  financial: 'Financial Documents', 
  legal: 'Legal Documents',
  medical: 'Medical Documents',
  education: 'Education Documents',
  property: 'Property Documents',
  business: 'Business Documents',
  other: 'Other Documents'
} as const

// Document types for CRBI applications
export const DOCUMENT_TYPES = {
  // Identity Documents
  passport: 'Passport',
  national_id: 'National ID Card',
  birth_certificate: 'Birth Certificate',
  marriage_certificate: 'Marriage Certificate',
  divorce_certificate: 'Divorce Certificate',
  
  // Financial Documents
  bank_statement: 'Bank Statement',
  proof_of_funds: 'Proof of Funds',
  tax_return: 'Tax Return',
  salary_certificate: 'Salary Certificate',
  audited_financials: 'Audited Financial Statements',
  source_of_wealth: 'Source of Wealth Declaration',
  
  // Legal Documents
  police_clearance: 'Police Clearance Certificate',
  court_records: 'Court Records',
  power_of_attorney: 'Power of Attorney',
  notarized_document: 'Notarized Document',
  
  // Medical Documents
  medical_certificate: 'Medical Certificate',
  health_insurance: 'Health Insurance',
  medical_exam: 'Medical Examination Report',
  
  // Education Documents
  degree_certificate: 'Degree Certificate',
  transcript: 'Academic Transcript',
  professional_license: 'Professional License',
  
  // Property Documents
  property_deed: 'Property Deed',
  property_valuation: 'Property Valuation',
  rental_agreement: 'Rental Agreement',
  
  // Business Documents
  business_registration: 'Business Registration',
  business_license: 'Business License',
  company_financials: 'Company Financial Statements',
  
  // Application Specific
  application_form: 'Application Form',
  government_form: 'Government Form',
  supporting_letter: 'Supporting Letter',
  
  // Other
  photo: 'Photograph',
  other: 'Other Document'
} as const

export const DOCUMENT_STATUSES = ['uploaded', 'verified', 'rejected', 'expired', 'deleted'] as const
export const COMPLIANCE_STATUSES = ['pending_review', 'approved', 'rejected', 'requires_update'] as const

export const ALLOWED_FILE_TYPES = [
  // Images
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
  // Documents  
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'text/plain',
  'text/csv'
] as const

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB

export type DocumentUploadData = z.infer<typeof documentUploadSchema>
export type DocumentUpdateData = z.infer<typeof documentUpdateSchema>
export type DocumentFilterData = z.infer<typeof documentFilterSchema>
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES
export type DocumentType = keyof typeof DOCUMENT_TYPES
export type DocumentStatus = typeof DOCUMENT_STATUSES[number]
export type ComplianceStatus = typeof COMPLIANCE_STATUSES[number]