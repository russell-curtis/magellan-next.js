// db/schema.ts - Complete CRBI Database Schema for Drizzle ORM

import { 
  pgTable, 
  uuid, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  decimal, 
  integer, 
  jsonb, 
  date,
  bigint,
  inet,
  index
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ============================================================================
// BETTER AUTH TABLES
// ============================================================================

// Better Auth Tables
export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("user_email_idx").on(table.email),
}));

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
}, (table) => ({
  userIdIdx: index("session_user_id_idx").on(table.userId),
  tokenIdx: index("session_token_idx").on(table.token),
}));

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt"),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").notNull().defaultNow(),
  updatedAt: timestamp("updatedAt").notNull().defaultNow(),
});

// Subscription table for Polar webhook data
export const subscription = pgTable("subscription", {
  id: text("id").primaryKey(),
  createdAt: timestamp("createdAt").notNull(),
  modifiedAt: timestamp("modifiedAt"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull(),
  recurringInterval: text("recurringInterval").notNull(),
  status: text("status").notNull(),
  currentPeriodStart: timestamp("currentPeriodStart").notNull(),
  currentPeriodEnd: timestamp("currentPeriodEnd").notNull(),
  cancelAtPeriodEnd: boolean("cancelAtPeriodEnd").notNull().default(false),
  canceledAt: timestamp("canceledAt"),
  startedAt: timestamp("startedAt").notNull(),
  endsAt: timestamp("endsAt"),
  endedAt: timestamp("endedAt"),
  customerId: text("customerId").notNull(),
  productId: text("productId").notNull(),
  discountId: text("discountId"),
  checkoutId: text("checkoutId").notNull(),
  customerCancellationReason: text("customerCancellationReason"),
  customerCancellationComment: text("customerCancellationComment"),
  metadata: text("metadata"), // JSON string
  customFieldData: text("customFieldData"), // JSON string
  userId: text("userId").references(() => user.id),
}, (table) => ({
  userIdIdx: index("subscription_user_id_idx").on(table.userId),
  statusIdx: index("subscription_status_idx").on(table.status),
  userStatusIdx: index("subscription_user_status_idx").on(table.userId, table.status),
}));

// ============================================================================
// CORE ENTITIES
// ============================================================================

// Firms (Multi-tenant isolation)
export const firms = pgTable('firms', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).unique().notNull(),
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('starter'),
  subscriptionStatus: varchar('subscription_status', { length: 50 }).default('trial'),
  settings: jsonb('settings').default({}),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  slugIdx: index('firms_slug_idx').on(table.slug),
}))

// Users (Advisors within firms)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('advisor'), // admin, advisor, junior
  avatarUrl: text('avatar_url'),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('users_firm_id_idx').on(table.firmId),
  emailIdx: index('users_email_idx').on(table.email),
}))

// Clients (HNWIs)
export const clients = pgTable('clients', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  assignedAdvisorId: uuid('assigned_advisor_id').references(() => users.id),
  
  // Personal Information
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  nationality: varchar('nationality', { length: 100 }),
  dateOfBirth: date('date_of_birth'),
  passportNumber: varchar('passport_number', { length: 100 }),
  
  // CRBI Specific
  netWorthEstimate: decimal('net_worth_estimate', { precision: 15, scale: 2 }),
  investmentBudget: decimal('investment_budget', { precision: 15, scale: 2 }),
  preferredPrograms: text('preferred_programs').array(), // ['portugal', 'cyprus', 'malta']
  sourceOfFunds: text('source_of_funds'),
  
  // Status & Notes
  status: varchar('status', { length: 50 }).default('prospect'), // prospect, active, approved, rejected
  notes: text('notes'),
  tags: text('tags').array(),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('clients_firm_id_idx').on(table.firmId),
  advisorIdx: index('clients_advisor_idx').on(table.assignedAdvisorId),
  statusIdx: index('clients_status_idx').on(table.status),
  nameIdx: index('clients_name_idx').on(table.firstName, table.lastName),
}))

// CRBI Programs (Master data)
export const crbiPrograms = pgTable('crbi_programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  countryCode: varchar('country_code', { length: 10 }).notNull(),
  countryName: varchar('country_name', { length: 100 }).notNull(),
  programType: varchar('program_type', { length: 50 }).notNull(), // citizenship, residency
  programName: varchar('program_name', { length: 255 }).notNull(),
  minInvestment: decimal('min_investment', { precision: 15, scale: 2 }).notNull(),
  processingTimeMonths: integer('processing_time_months'),
  requirements: jsonb('requirements'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  countryIdx: index('programs_country_idx').on(table.countryCode),
  typeIdx: index('programs_type_idx').on(table.programType),
}))

// Applications
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => crbiPrograms.id),
  assignedAdvisorId: uuid('assigned_advisor_id').references(() => users.id),
  
  // Application Details
  applicationNumber: varchar('application_number', { length: 100 }),
  status: varchar('status', { length: 50 }).default('draft'), // draft, submitted, under_review, approved, rejected
  priority: varchar('priority', { length: 20 }).default('medium'), // low, medium, high, urgent
  
  // Timeline
  submittedAt: timestamp('submitted_at'),
  decisionExpectedAt: timestamp('decision_expected_at'),
  decidedAt: timestamp('decided_at'),
  
  // Investment Details
  investmentAmount: decimal('investment_amount', { precision: 15, scale: 2 }),
  investmentType: varchar('investment_type', { length: 100 }), // real_estate, government_bonds, business
  
  // Notes
  notes: text('notes'),
  internalNotes: text('internal_notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('applications_firm_id_idx').on(table.firmId),
  clientIdIdx: index('applications_client_id_idx').on(table.clientId),
  statusIdx: index('applications_status_idx').on(table.status),
  advisorStatusIdx: index('applications_advisor_status_idx').on(table.assignedAdvisorId, table.status),
}))

// Application Milestones
export const applicationMilestones = pgTable('application_milestones', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  milestoneName: varchar('milestone_name', { length: 255 }).notNull(),
  description: text('description'),
  dueDate: date('due_date'),
  completedAt: timestamp('completed_at'),
  status: varchar('status', { length: 50 }).default('pending'), // pending, completed, overdue
  orderIndex: integer('order_index').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  applicationIdx: index('milestones_application_idx').on(table.applicationId),
  statusIdx: index('milestones_status_idx').on(table.status),
}))

// Documents
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'cascade' }),
  
  // File Details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: bigint('file_size', { mode: 'number' }),
  contentType: varchar('content_type', { length: 100 }),
  
  // Categorization
  documentType: varchar('document_type', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }),
  
  // Status & Compliance
  status: varchar('status', { length: 50 }).default('uploaded'),
  complianceStatus: varchar('compliance_status', { length: 50 }),
  complianceNotes: text('compliance_notes'),
  
  // Version Control
  version: integer('version').default(1),
  isLatestVersion: boolean('is_latest_version').default(true),
  replacedById: uuid('replaced_by_id').references(() => documents.id),
  
  // Metadata
  uploadedById: uuid('uploaded_by_id').references(() => users.id),
  expiresAt: timestamp('expires_at'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('documents_firm_id_idx').on(table.firmId),
  clientIdIdx: index('documents_client_id_idx').on(table.clientId),
  applicationIdx: index('documents_application_idx').on(table.applicationId, table.documentType),
  typeIdx: index('documents_type_idx').on(table.documentType),
}))

// Document Types (Master data)
export const documentTypes = pgTable('document_types', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: text('description'),
  isRequired: boolean('is_required').default(false),
  validationRules: jsonb('validation_rules'),
  retentionPeriodMonths: integer('retention_period_months'),
  createdAt: timestamp('created_at').defaultNow(),
})

// Tasks & Reminders
export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  createdById: uuid('created_by_id').references(() => users.id),
  assignedToId: uuid('assigned_to_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  applicationId: uuid('application_id').references(() => applications.id),
  
  // Task Details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  status: varchar('status', { length: 50 }).default('pending'), // pending, in_progress, completed, cancelled
  
  // Timeline
  dueDate: timestamp('due_date'),
  completedAt: timestamp('completed_at'),
  reminderAt: timestamp('reminder_at'),
  
  // Task Type
  taskType: varchar('task_type', { length: 50 }),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('tasks_firm_id_idx').on(table.firmId),
  assignedIdx: index('tasks_assigned_due_idx').on(table.assignedToId, table.dueDate),
  clientIdx: index('tasks_client_idx').on(table.clientId),
}))

// Activity Logs (Audit Trail)
export const activityLogs = pgTable('activity_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  applicationId: uuid('application_id').references(() => applications.id),
  
  // Activity Details
  action: varchar('action', { length: 100 }).notNull(),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  
  // Changes
  oldValues: jsonb('old_values'),
  newValues: jsonb('new_values'),
  
  // Context
  ipAddress: inet('ip_address'),
  userAgent: text('user_agent'),
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('activity_logs_firm_id_idx').on(table.firmId),
  entityIdx: index('activity_logs_entity_idx').on(table.entityType, table.entityId),
  userIdx: index('activity_logs_user_idx').on(table.userId),
}))

// Communications
export const communications = pgTable('communications', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id),
  applicationId: uuid('application_id').references(() => applications.id),
  userId: uuid('user_id').references(() => users.id),
  
  // Communication Details
  type: varchar('type', { length: 50 }).notNull(), // email, call, meeting, message
  subject: varchar('subject', { length: 255 }),
  content: text('content'),
  direction: varchar('direction', { length: 20 }).notNull(), // inbound, outbound
  
  // Email specific
  emailMessageId: text('email_message_id'),
  
  // Metadata
  occurredAt: timestamp('occurred_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('communications_firm_id_idx').on(table.firmId),
  clientIdx: index('communications_client_idx').on(table.clientId),
}))

// ============================================================================
// RELATIONS
// ============================================================================

export const firmsRelations = relations(firms, ({ many }) => ({
  users: many(users),
  clients: many(clients),
  applications: many(applications),
  documents: many(documents),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
  communications: many(communications),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
  firm: one(firms, {
    fields: [users.firmId],
    references: [firms.id],
  }),
  clientsAssigned: many(clients),
  applicationsAssigned: many(applications),
  tasksCreated: many(tasks, { relationName: "TasksCreated" }),
  tasksAssigned: many(tasks, { relationName: "TasksAssigned" }),
  documentsUploaded: many(documents),
  activityLogs: many(activityLogs),
  communications: many(communications),
}))

export const clientsRelations = relations(clients, ({ one, many }) => ({
  firm: one(firms, {
    fields: [clients.firmId],
    references: [firms.id],
  }),
  assignedAdvisor: one(users, {
    fields: [clients.assignedAdvisorId],
    references: [users.id],
  }),
  applications: many(applications),
  documents: many(documents),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
  communications: many(communications),
}))

export const crbiProgramsRelations = relations(crbiPrograms, ({ many }) => ({
  applications: many(applications),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  firm: one(firms, {
    fields: [applications.firmId],
    references: [firms.id],
  }),
  client: one(clients, {
    fields: [applications.clientId],
    references: [clients.id],
  }),
  program: one(crbiPrograms, {
    fields: [applications.programId],
    references: [crbiPrograms.id],
  }),
  assignedAdvisor: one(users, {
    fields: [applications.assignedAdvisorId],
    references: [users.id],
  }),
  milestones: many(applicationMilestones),
  documents: many(documents),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
  communications: many(communications),
}))

export const applicationMilestonesRelations = relations(applicationMilestones, ({ one }) => ({
  application: one(applications, {
    fields: [applicationMilestones.applicationId],
    references: [applications.id],
  }),
}))

export const documentsRelations = relations(documents, ({ one }) => ({
  firm: one(firms, {
    fields: [documents.firmId],
    references: [firms.id],
  }),
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  application: one(applications, {
    fields: [documents.applicationId],
    references: [applications.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedById],
    references: [users.id],
  }),
  replacedBy: one(documents, {
    fields: [documents.replacedById],
    references: [documents.id],
  }),
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  firm: one(firms, {
    fields: [tasks.firmId],
    references: [firms.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdById],
    references: [users.id],
    relationName: "TasksCreated",
  }),
  assignedTo: one(users, {
    fields: [tasks.assignedToId],
    references: [users.id],
    relationName: "TasksAssigned",
  }),
  client: one(clients, {
    fields: [tasks.clientId],
    references: [clients.id],
  }),
  application: one(applications, {
    fields: [tasks.applicationId],
    references: [applications.id],
  }),
}))

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  firm: one(firms, {
    fields: [activityLogs.firmId],
    references: [firms.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [activityLogs.clientId],
    references: [clients.id],
  }),
  application: one(applications, {
    fields: [activityLogs.applicationId],
    references: [applications.id],
  }),
}))

export const communicationsRelations = relations(communications, ({ one }) => ({
  firm: one(firms, {
    fields: [communications.firmId],
    references: [firms.id],
  }),
  client: one(clients, {
    fields: [communications.clientId],
    references: [clients.id],
  }),
  application: one(applications, {
    fields: [communications.applicationId],
    references: [applications.id],
  }),
  user: one(users, {
    fields: [communications.userId],
    references: [users.id],
  }),
}))

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Firm = typeof firms.$inferSelect
export type NewFirm = typeof firms.$inferInsert

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Client = typeof clients.$inferSelect
export type NewClient = typeof clients.$inferInsert

export type CrbiProgram = typeof crbiPrograms.$inferSelect
export type NewCrbiProgram = typeof crbiPrograms.$inferInsert

export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert

export type ApplicationMilestone = typeof applicationMilestones.$inferSelect
export type NewApplicationMilestone = typeof applicationMilestones.$inferInsert

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert

export type DocumentType = typeof documentTypes.$inferSelect
export type NewDocumentType = typeof documentTypes.$inferInsert

export type Task = typeof tasks.$inferSelect
export type NewTask = typeof tasks.$inferInsert

export type ActivityLog = typeof activityLogs.$inferSelect
export type NewActivityLog = typeof activityLogs.$inferInsert

export type Communication = typeof communications.$inferSelect
export type NewCommunication = typeof communications.$inferInsert

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const USER_ROLES = ['admin', 'advisor', 'junior'] as const
export const CLIENT_STATUSES = ['prospect', 'active', 'approved', 'rejected'] as const
export const APPLICATION_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const
export const DOCUMENT_CATEGORIES = ['identity', 'financial', 'legal', 'medical'] as const
export const COMMUNICATION_TYPES = ['email', 'call', 'meeting', 'message'] as const

export type UserRole = typeof USER_ROLES[number]
export type ClientStatus = typeof CLIENT_STATUSES[number]
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]
export type TaskPriority = typeof TASK_PRIORITIES[number]
export type TaskStatus = typeof TASK_STATUSES[number]
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]
export type CommunicationType = typeof COMMUNICATION_TYPES[number]