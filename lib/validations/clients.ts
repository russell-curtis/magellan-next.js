import { z } from 'zod'
import { CLIENT_STATUSES } from '@/db/schema'

// Helper function for optional string preprocessing
const optionalString = (maxLength?: number) => z.preprocess(
  (val) => val === null || val === undefined || val === '' ? undefined : val,
  maxLength ? z.string().max(maxLength).optional() : z.string().optional()
)

// Helper function for optional array preprocessing
const optionalStringArray = () => z.preprocess(
  (val) => val === null || val === undefined ? [] : val,
  z.array(z.string()).default([])
)

// Enum definitions for validation
const CONTACT_METHODS = ['email', 'phone', 'whatsapp'] as const
const EDUCATION_LEVELS = ['high_school', 'bachelor', 'master', 'phd', 'professional'] as const
const EMPLOYMENT_STATUSES = ['employed', 'self_employed', 'business_owner', 'retired', 'unemployed'] as const
const TIMELINES = ['immediate', '6_months', '1_year', '2_years', 'exploring'] as const
const TRAVEL_FREQUENCIES = ['frequent', 'moderate', 'occasional', 'rare'] as const
const READINESS_LEVELS = ['ready', '1_month', '3_months', '6_months', 'not_ready'] as const
const INVESTMENT_EXPERIENCES = ['none', 'limited', 'moderate', 'extensive'] as const
const SANCTIONS_SCREENING_STATUSES = ['cleared', 'pending', 'flagged'] as const
const BUDGET_RANGES = ['under_500k', '500k_1m', '1m_2m', '2m_plus'] as const
const URGENCY_LEVELS = ['low', 'medium', 'high', 'urgent'] as const
const ENHANCED_CLIENT_STATUSES = ['prospect', 'qualified', 'active', 'approved', 'rejected', 'inactive'] as const

// Family member schema
export const familyMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  relationship: z.enum(['spouse', 'child', 'parent', 'sibling', 'dependent']),
  dateOfBirth: optionalString(),
  placeOfBirth: optionalString(255),
  currentCitizenships: optionalStringArray(),
  passportNumber: optionalString(100),
  passportExpiryDate: optionalString(),
  passportIssuingCountry: optionalString(100),
  includeInApplication: z.boolean().default(true),
  applicationStatus: z.enum(['not_applied', 'included', 'approved', 'rejected']).default('not_applied'),
  education: optionalString(255),
  profession: optionalString(255),
  medicalConditions: optionalString(),
  specialRequirements: optionalString(),
  notes: optionalString(),
})

export const createClientSchema = z.object({
  // Basic Information
  firstName: z.string().min(1, 'First name is required').max(255),
  lastName: z.string().min(1, 'Last name is required').max(255),
  email: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().email('Invalid email address').optional()
  ),
  phone: optionalString(50),
  alternativePhone: optionalString(50),
  preferredContactMethod: z.enum(CONTACT_METHODS).default('email'),
  
  // Identity & Citizenship
  dateOfBirth: optionalString(),
  placeOfBirth: optionalString(255),
  currentCitizenships: optionalStringArray(),
  currentResidency: optionalString(100),
  passportNumber: optionalString(100),
  passportExpiryDate: optionalString(),
  passportIssuingCountry: optionalString(100),
  additionalPassports: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val,
    z.any().optional()
  ),
  languagesSpoken: optionalStringArray(),
  
  // Professional & Educational Background
  educationLevel: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(EDUCATION_LEVELS).optional()
  ),
  educationDetails: optionalString(),
  currentProfession: optionalString(255),
  industry: optionalString(255),
  employmentStatus: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(EMPLOYMENT_STATUSES).optional()
  ),
  yearsOfExperience: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : Number(val),
    z.number().int().min(0).max(70).optional()
  ),
  currentEmployer: optionalString(255),
  professionalLicenses: optionalStringArray(),
  businessOwnership: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val,
    z.any().optional()
  ),
  
  // Immigration & Travel Goals
  primaryGoals: optionalStringArray(),
  desiredTimeline: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(TIMELINES).optional()
  ),
  geographicPreferences: optionalStringArray(),
  lifestyleRequirements: optionalString(),
  travelFrequency: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(TRAVEL_FREQUENCIES).optional()
  ),
  currentVisaRestrictions: optionalString(),
  
  // Immigration History
  previousApplications: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val,
    z.any().optional()
  ),
  visaDenials: z.boolean().default(false),
  visaDenialDetails: optionalString(),
  immigrationIssues: z.boolean().default(false),
  immigrationIssueDetails: optionalString(),
  
  // Financial & Investment Readiness
  sourceOfFundsReadiness: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(READINESS_LEVELS).optional()
  ),
  sourceOfFundsTypes: optionalStringArray(),
  sourceOfFundsDescription: optionalString(),
  investmentExperience: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(INVESTMENT_EXPERIENCES).optional()
  ),
  investmentPreferences: optionalStringArray(),
  liquidityTimeline: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(READINESS_LEVELS).optional()
  ),
  financialAdvisorsInvolved: z.boolean().default(false),
  
  // Compliance & Background
  isPep: z.boolean().default(false),
  pepDetails: optionalString(),
  sanctionsScreening: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(SANCTIONS_SCREENING_STATUSES).optional()
  ),
  criminalBackground: z.boolean().default(false),
  criminalBackgroundDetails: optionalString(),
  professionalReferences: z.preprocess(
    (val) => val === null || val === undefined ? undefined : val,
    z.any().optional()
  ),
  
  // Program Preferences & Qualification
  preferredPrograms: optionalStringArray(),
  programQualificationScore: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : Number(val),
    z.number().int().min(0).max(100).optional()
  ),
  budgetRange: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(BUDGET_RANGES).optional()
  ),
  urgencyLevel: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(URGENCY_LEVELS).optional()
  ),
  referralSource: optionalString(255),
  
  // Internal Notes & Status
  status: z.enum(ENHANCED_CLIENT_STATUSES).default('prospect'),
  qualificationNotes: optionalString(),
  notes: optionalString(),
  tags: optionalStringArray(),
  lastContactDate: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  nextFollowUpDate: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().optional()
  ),
  
  // Assignment
  assignedAdvisorId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().uuid().optional()
  ),
  
  // Family Members
  familyMembers: z.array(familyMemberSchema).default([])
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
  search: optionalString(),
  status: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(ENHANCED_CLIENT_STATUSES).optional()
  ),
  advisorId: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.string().uuid().optional()
  ),
  urgencyLevel: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(URGENCY_LEVELS).optional()
  ),
  desiredTimeline: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(TIMELINES).optional()
  ),
  budgetRange: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(BUDGET_RANGES).optional()
  ),
  geographicPreferences: optionalStringArray(),
  tags: optionalStringArray(),
  hasFamily: z.preprocess(
    (val) => val === null || val === undefined || val === '' ? undefined : val,
    z.enum(['true', 'false']).optional().transform(val => val === 'true' ? true : val === 'false' ? false : undefined)
  )
})

// Export validation enums for use in components
export const CLIENT_CONTACT_METHODS = CONTACT_METHODS
export const CLIENT_EDUCATION_LEVELS = EDUCATION_LEVELS
export const CLIENT_EMPLOYMENT_STATUSES = EMPLOYMENT_STATUSES
export const CLIENT_TIMELINES = TIMELINES
export const CLIENT_TRAVEL_FREQUENCIES = TRAVEL_FREQUENCIES
export const CLIENT_READINESS_LEVELS = READINESS_LEVELS
export const CLIENT_INVESTMENT_EXPERIENCES = INVESTMENT_EXPERIENCES
export const CLIENT_SANCTIONS_SCREENING_STATUSES = SANCTIONS_SCREENING_STATUSES
export const CLIENT_BUDGET_RANGES = BUDGET_RANGES
export const CLIENT_URGENCY_LEVELS = URGENCY_LEVELS
export const CLIENT_ENHANCED_STATUSES = ENHANCED_CLIENT_STATUSES

// Export schemas and types
export type CreateClientInput = z.infer<typeof createClientSchema>
export type UpdateClientInput = z.infer<typeof updateClientSchema>
export type ClientQueryParams = z.infer<typeof clientQuerySchema>
export type FamilyMemberInput = z.infer<typeof familyMemberSchema>