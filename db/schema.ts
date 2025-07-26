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
  index,
  unique
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
  id: text('id').primaryKey(), // Use Better Auth user ID
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
  assignedAdvisorId: text('assigned_advisor_id').references(() => users.id),
  
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
  
  // Enhanced program details from markdown documentation
  programDetails: jsonb('program_details'), // Structured program information
  
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  countryIdx: index('programs_country_idx').on(table.countryCode),
  typeIdx: index('programs_type_idx').on(table.programType),
  // Unique constraint to prevent duplicate programs
  uniqueProgram: unique('programs_unique_constraint').on(table.countryCode, table.programName),
}))

// Investment Options for CRBI Programs
export const investmentOptions = pgTable('investment_options', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').notNull().references(() => crbiPrograms.id, { onDelete: 'cascade' }),
  
  // Option Details
  optionType: varchar('option_type', { length: 100 }).notNull(), // e.g., 'SISC', 'Real Estate', 'Public Benefit'
  optionName: varchar('option_name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Investment Requirements
  baseAmount: decimal('base_amount', { precision: 15, scale: 2 }).notNull(),
  familyPricing: jsonb('family_pricing'), // Structured pricing for family members
  
  // Conditions and Requirements
  holdingPeriod: integer('holding_period_months'), // e.g., 84 months for 7 years
  conditions: jsonb('conditions'), // Additional conditions, restrictions
  eligibilityRequirements: jsonb('eligibility_requirements'),
  
  // Metadata
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  programIdx: index('investment_options_program_idx').on(table.programId),
  typeIdx: index('investment_options_type_idx').on(table.optionType),
}))

// Applications
export const applications = pgTable('applications', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  programId: uuid('program_id').notNull().references(() => crbiPrograms.id),
  assignedAdvisorId: text('assigned_advisor_id').references(() => users.id),
  
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
  selectedInvestmentOptionId: uuid('selected_investment_option_id').references(() => investmentOptions.id),
  
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
export const documents: any = pgTable('documents', {
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
  description: text('description'),
  
  // Status & Compliance
  status: varchar('status', { length: 50 }).default('uploaded'),
  complianceStatus: varchar('compliance_status', { length: 50 }),
  complianceNotes: text('compliance_notes'),
  
  // Version Control
  version: integer('version').default(1),
  isLatestVersion: boolean('is_latest_version').default(true),
  replacedById: uuid('replaced_by_id').references((): any => documents.id),
  
  // Metadata
  uploadedById: text('uploaded_by_id').references(() => users.id),
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
  createdById: text('created_by_id').references(() => users.id),
  assignedToId: text('assigned_to_id').references(() => users.id),
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
  userId: text('user_id').references(() => users.id),
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
  userId: text('user_id').references(() => users.id),
  
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

// Client Authentication (separate from advisor auth)
export const clientAuth = pgTable('client_auth', {
  id: uuid('id').defaultRandom().primaryKey(),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isActive: boolean('is_active').default(true),
  lastLogin: timestamp('last_login'),  
  invitedAt: timestamp('invited_at').defaultNow(),
  invitedById: text('invited_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  emailIdx: index('client_auth_email_idx').on(table.email),
  clientIdIdx: index('client_auth_client_id_idx').on(table.clientId),
}))

// Conversations (chat threads between clients and advisors)
export const conversations = pgTable('conversations', {
  id: uuid('id').defaultRandom().primaryKey(),
  firmId: uuid('firm_id').notNull().references(() => firms.id, { onDelete: 'cascade' }),
  clientId: uuid('client_id').notNull().references(() => clients.id, { onDelete: 'cascade' }),
  applicationId: uuid('application_id').references(() => applications.id, { onDelete: 'set null' }),
  
  // Conversation details
  title: varchar('title', { length: 255 }),
  status: varchar('status', { length: 50 }).default('active'), // active, archived, closed
  priority: varchar('priority', { length: 20 }).default('normal'), // low, normal, high, urgent
  
  // Participants
  assignedAdvisorId: text('assigned_advisor_id').references(() => users.id),
  
  // Metadata
  lastMessageAt: timestamp('last_message_at'),
  lastMessageId: uuid('last_message_id'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  firmIdIdx: index('conversations_firm_id_idx').on(table.firmId),
  clientIdIdx: index('conversations_client_id_idx').on(table.clientId),
  statusIdx: index('conversations_status_idx').on(table.status),
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageAt),
}))

// Messages within conversations
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  // Message content
  content: text('content').notNull(),
  messageType: varchar('message_type', { length: 50 }).default('text'), // text, file, system
  
  // Sender info (can be either advisor or client)
  senderType: varchar('sender_type', { length: 20 }).notNull(), // advisor, client, system
  senderAdvisorId: text('sender_advisor_id').references(() => users.id),
  senderClientId: uuid('sender_client_id').references(() => clients.id),
  
  // File attachments (if messageType is 'file')
  fileUrl: text('file_url'),
  fileName: varchar('file_name', { length: 255 }),
  fileSize: bigint('file_size', { mode: 'number' }),
  contentType: varchar('content_type', { length: 100 }),
  
  // Message status
  isEdited: boolean('is_edited').default(false),
  editedAt: timestamp('edited_at'),
  isDeleted: boolean('is_deleted').default(false),
  deletedAt: timestamp('deleted_at'),
  
  // Metadata
  metadata: jsonb('metadata'), // For storing additional message data
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  conversationIdx: index('messages_conversation_idx').on(table.conversationId, table.createdAt),
  senderAdvisorIdx: index('messages_sender_advisor_idx').on(table.senderAdvisorId),
  senderClientIdx: index('messages_sender_client_idx').on(table.senderClientId),
  typeIdx: index('messages_type_idx').on(table.messageType),
}))

// Message participants and read status
export const messageParticipants = pgTable('message_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  
  // Participant (can be advisor or client)
  participantType: varchar('participant_type', { length: 20 }).notNull(), // advisor, client
  advisorId: text('advisor_id').references(() => users.id),
  clientId: uuid('client_id').references(() => clients.id),
  
  // Read status
  lastReadAt: timestamp('last_read_at'),
  lastReadMessageId: uuid('last_read_message_id').references(() => messages.id),
  
  // Participant status
  isActive: boolean('is_active').default(true),
  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at'),
  
}, (table) => ({
  conversationParticipantIdx: index('participants_conversation_idx').on(table.conversationId),
  advisorIdx: index('participants_advisor_idx').on(table.advisorId),
  clientIdx: index('participants_client_idx').on(table.clientId),
  // Unique constraint to prevent duplicate participants
  uniqueAdvisorParticipant: index('unique_advisor_participant').on(table.conversationId, table.advisorId),
  uniqueClientParticipant: index('unique_client_participant').on(table.conversationId, table.clientId),
}))

// Message notifications and delivery status
export const messageNotifications = pgTable('message_notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  messageId: uuid('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  
  // Recipient (can be advisor or client)
  recipientType: varchar('recipient_type', { length: 20 }).notNull(), // advisor, client
  recipientAdvisorId: text('recipient_advisor_id').references(() => users.id),
  recipientClientId: uuid('recipient_client_id').references(() => clients.id),
  
  // Notification status
  isRead: boolean('is_read').default(false),
  readAt: timestamp('read_at'),
  
  // Delivery status
  isDelivered: boolean('is_delivered').default(false),
  deliveredAt: timestamp('delivered_at'),
  
  // Notification preferences
  notificationSent: boolean('notification_sent').default(false),
  notificationSentAt: timestamp('notification_sent_at'),
  notificationType: varchar('notification_type', { length: 50 }), // browser, email, push
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  messageIdx: index('notifications_message_idx').on(table.messageId),
  recipientAdvisorIdx: index('notifications_recipient_advisor_idx').on(table.recipientAdvisorId),
  recipientClientIdx: index('notifications_recipient_client_idx').on(table.recipientClientId),
  unreadIdx: index('notifications_unread_idx').on(table.isRead, table.createdAt),
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
  conversations: many(conversations),
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
  conversationsAssigned: many(conversations),
  messagesSent: many(messages, { relationName: "MessagesSentByAdvisor" }),
  messageParticipants: many(messageParticipants, { relationName: "AdvisorParticipants" }),
  messageNotifications: many(messageNotifications, { relationName: "AdvisorNotifications" }),
  clientInvitations: many(clientAuth, { relationName: "ClientInvitations" }),
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
  conversations: many(conversations),
  messagesSent: many(messages, { relationName: "MessagesSentByClient" }),
  messageParticipants: many(messageParticipants, { relationName: "ClientParticipants" }),
  messageNotifications: many(messageNotifications, { relationName: "ClientNotifications" }),
  auth: one(clientAuth),
}))

export const crbiProgramsRelations = relations(crbiPrograms, ({ many }) => ({
  applications: many(applications),
  investmentOptions: many(investmentOptions),
}))

export const investmentOptionsRelations = relations(investmentOptions, ({ one, many }) => ({
  program: one(crbiPrograms, {
    fields: [investmentOptions.programId],
    references: [crbiPrograms.id],
  }),
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
  selectedInvestmentOption: one(investmentOptions, {
    fields: [applications.selectedInvestmentOptionId],
    references: [investmentOptions.id],
  }),
  milestones: many(applicationMilestones),
  documents: many(documents),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
  communications: many(communications),
  conversations: many(conversations),
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

// Client Auth Relations
export const clientAuthRelations = relations(clientAuth, ({ one }) => ({
  client: one(clients, {
    fields: [clientAuth.clientId],
    references: [clients.id],
  }),
  invitedBy: one(users, {
    fields: [clientAuth.invitedById],
    references: [users.id],
  }),
}))

// Conversations Relations
export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  firm: one(firms, {
    fields: [conversations.firmId],
    references: [firms.id],
  }),
  client: one(clients, {
    fields: [conversations.clientId],
    references: [clients.id],
  }),
  application: one(applications, {
    fields: [conversations.applicationId],
    references: [applications.id],
  }),
  assignedAdvisor: one(users, {
    fields: [conversations.assignedAdvisorId],
    references: [users.id],
  }),
  messages: many(messages),
  participants: many(messageParticipants),
}))

// Messages Relations
export const messagesRelations = relations(messages, ({ one, many }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  senderAdvisor: one(users, {
    fields: [messages.senderAdvisorId],
    references: [users.id],
  }),
  senderClient: one(clients, {
    fields: [messages.senderClientId],
    references: [clients.id],
  }),
  notifications: many(messageNotifications),
}))

// Message Participants Relations
export const messageParticipantsRelations = relations(messageParticipants, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messageParticipants.conversationId],
    references: [conversations.id],
  }),
  advisor: one(users, {
    fields: [messageParticipants.advisorId],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [messageParticipants.clientId],
    references: [clients.id],
  }),
  lastReadMessage: one(messages, {
    fields: [messageParticipants.lastReadMessageId],
    references: [messages.id],
  }),
}))

// Message Notifications Relations
export const messageNotificationsRelations = relations(messageNotifications, ({ one }) => ({
  message: one(messages, {
    fields: [messageNotifications.messageId],
    references: [messages.id],
  }),
  recipientAdvisor: one(users, {
    fields: [messageNotifications.recipientAdvisorId],
    references: [users.id],
  }),
  recipientClient: one(clients, {
    fields: [messageNotifications.recipientClientId],
    references: [clients.id],
  }),
}))

// ============================================================================
// PROGRAM-SPECIFIC DOCUMENT MANAGEMENT SYSTEM
// ============================================================================

// Program Workflow Templates (Master templates for each CRBI program)
export const programWorkflowTemplates = pgTable('program_workflow_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').notNull().references(() => crbiPrograms.id, { onDelete: 'cascade' }),
  
  // Template Details
  templateName: varchar('template_name', { length: 255 }).notNull(),
  description: text('description'),
  totalStages: integer('total_stages').notNull(),
  estimatedTimeMonths: integer('estimated_time_months'),
  
  // Template Configuration
  isActive: boolean('is_active').default(true),
  version: integer('version').default(1),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  programIdx: index('workflow_templates_program_idx').on(table.programId),
  activeIdx: index('workflow_templates_active_idx').on(table.isActive),
}))

// Workflow Stages (Sequential stages within each program workflow)
export const workflowStages = pgTable('workflow_stages', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateId: uuid('template_id').notNull().references(() => programWorkflowTemplates.id, { onDelete: 'cascade' }),
  
  // Stage Details
  stageOrder: integer('stage_order').notNull(),
  stageName: varchar('stage_name', { length: 255 }).notNull(),
  description: text('description'),
  estimatedDays: integer('estimated_days'),
  
  // Stage Configuration
  isRequired: boolean('is_required').default(true),
  canSkip: boolean('can_skip').default(false),
  autoProgress: boolean('auto_progress').default(false), // Auto-advance when all documents complete
  
  // Dependencies
  dependsOnStages: uuid('depends_on_stages').array(), // Array of stage IDs that must complete first
  
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  templateOrderIdx: index('workflow_stages_template_order_idx').on(table.templateId, table.stageOrder),
}))

// Document Requirements (Required documents per program/stage)
export const documentRequirements = pgTable('document_requirements', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').notNull().references(() => crbiPrograms.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id').references(() => workflowStages.id, { onDelete: 'cascade' }), // Optional: can be program-wide
  
  // Document Details
  documentName: varchar('document_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(), // personal, financial, investment, medical, legal
  
  // Requirements
  isRequired: boolean('is_required').default(true),
  isClientUploadable: boolean('is_client_uploadable').default(true), // Can client upload directly?
  acceptedFormats: text('accepted_formats').array(), // ['pdf', 'jpg', 'png']
  maxFileSizeMB: integer('max_file_size_mb').default(10),
  
  // Validation Rules
  validationRules: jsonb('validation_rules'), // Custom validation logic
  expirationMonths: integer('expiration_months'), // Document validity period
  
  // Display & Organization
  sortOrder: integer('sort_order').default(0),
  displayGroup: varchar('display_group', { length: 100 }), // Group related documents
  helpText: text('help_text'), // Instructions for client
  
  // Status
  isActive: boolean('is_active').default(true),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  programStageIdx: index('doc_requirements_program_stage_idx').on(table.programId, table.stageId),
  categoryIdx: index('doc_requirements_category_idx').on(table.category),
  requiredIdx: index('doc_requirements_required_idx').on(table.isRequired),
}))

// Application Documents (Client-uploaded documents linked to applications)
export const applicationDocuments = pgTable('application_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  documentRequirementId: uuid('document_requirement_id').references(() => documentRequirements.id),
  
  // File Details
  filename: varchar('filename', { length: 255 }).notNull(),
  originalFilename: varchar('original_filename', { length: 255 }).notNull(),
  filePath: text('file_path').notNull(), // Path in Cloudflare R2
  fileSize: bigint('file_size', { mode: 'number' }),
  contentType: varchar('content_type', { length: 100 }),
  fileHash: varchar('file_hash', { length: 256 }), // For duplicate detection
  
  // Upload Info
  uploadedAt: timestamp('uploaded_at').defaultNow(),
  uploadedByType: varchar('uploaded_by_type', { length: 20 }).notNull(), // client, advisor
  uploadedById: text('uploaded_by_id'), // Can be client ID or advisor ID
  
  // Document Status
  status: varchar('status', { length: 50 }).default('uploaded'), // uploaded, under_review, approved, rejected, expired
  reviewStatus: varchar('review_status', { length: 50 }), // pending, approved, rejected, needs_revision
  
  // Review Info
  reviewedById: text('reviewed_by_id').references(() => users.id),
  reviewedAt: timestamp('reviewed_at'),
  reviewNotes: text('review_notes'),
  
  // Document Metadata
  documentDate: date('document_date'), // Date on the document (e.g., issue date)
  expirationDate: date('expiration_date'), // When document expires
  
  // Version Control
  version: integer('version').default(1),
  isLatestVersion: boolean('is_latest_version').default(true),
  replacesDocumentId: uuid('replaces_document_id').references((): any => applicationDocuments.id),
  
  // OCR and Processing
  ocrProcessed: boolean('ocr_processed').default(false),
  ocrText: text('ocr_text'), // Extracted text content
  ocrConfidence: decimal('ocr_confidence', { precision: 5, scale: 2 }), // OCR confidence score
  
  // Compliance
  complianceChecked: boolean('compliance_checked').default(false),
  complianceStatus: varchar('compliance_status', { length: 50 }),
  complianceNotes: text('compliance_notes'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  applicationIdx: index('app_documents_application_idx').on(table.applicationId),
  requirementIdx: index('app_documents_requirement_idx').on(table.documentRequirementId),
  statusIdx: index('app_documents_status_idx').on(table.status),
  reviewStatusIdx: index('app_documents_review_status_idx').on(table.reviewStatus),
  latestVersionIdx: index('app_documents_latest_version_idx').on(table.isLatestVersion),
}))

// Document Reviews (Agent review workflow and history)
export const documentReviews = pgTable('document_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  documentId: uuid('document_id').notNull().references(() => applicationDocuments.id, { onDelete: 'cascade' }),
  reviewerId: text('reviewer_id').notNull().references(() => users.id),
  
  // Review Details
  reviewType: varchar('review_type', { length: 50 }).notNull(), // initial, revision, final
  reviewResult: varchar('review_result', { length: 50 }).notNull(), // approved, rejected, needs_revision
  
  // Review Content
  reviewNotes: text('review_notes'),
  feedback: text('feedback'), // Feedback for client
  rejectionReason: varchar('rejection_reason', { length: 100 }),
  
  // Quality Checks
  qualityScore: integer('quality_score'), // 1-10 quality rating
  checksPerformed: jsonb('checks_performed'), // List of validation checks
  
  // Review Metadata
  timeSpentMinutes: integer('time_spent_minutes'),
  isSystemGenerated: boolean('is_system_generated').default(false),
  
  reviewedAt: timestamp('reviewed_at').defaultNow(),
}, (table) => ({
  documentIdx: index('document_reviews_document_idx').on(table.documentId),
  reviewerIdx: index('document_reviews_reviewer_idx').on(table.reviewerId),
  resultIdx: index('document_reviews_result_idx').on(table.reviewResult),
}))

// Application Workflow Progress (Tracks current stage and progress)
export const applicationWorkflowProgress = pgTable('application_workflow_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  templateId: uuid('template_id').notNull().references(() => programWorkflowTemplates.id),
  
  // Current Status
  currentStageId: uuid('current_stage_id').references(() => workflowStages.id),
  overallProgress: decimal('overall_progress', { precision: 5, scale: 2 }).default('0'), // 0-100%
  
  // Timeline
  startedAt: timestamp('started_at').defaultNow(),
  estimatedCompletionAt: timestamp('estimated_completion_at'),
  actualCompletionAt: timestamp('actual_completion_at'),
  
  // Status
  status: varchar('status', { length: 50 }).default('in_progress'), // in_progress, completed, on_hold, cancelled
  
  // Metadata
  customStagesAdded: jsonb('custom_stages_added'), // Custom stages added by advisor
  stageOverrides: jsonb('stage_overrides'), // Manual overrides to standard process
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  applicationIdx: index('workflow_progress_application_idx').on(table.applicationId),
  stageIdx: index('workflow_progress_stage_idx').on(table.currentStageId),
  statusIdx: index('workflow_progress_status_idx').on(table.status),
}))

// Stage Progress (Detailed progress for each stage)
export const stageProgress = pgTable('stage_progress', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  stageId: uuid('stage_id').notNull().references(() => workflowStages.id),
  
  // Progress Details
  status: varchar('status', { length: 50 }).default('pending'), // pending, in_progress, completed, skipped
  completionPercentage: decimal('completion_percentage', { precision: 5, scale: 2 }).default('0'),
  
  // Timeline
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  estimatedDuration: integer('estimated_duration_days'),
  actualDuration: integer('actual_duration_days'),
  
  // Document Progress
  totalDocumentsRequired: integer('total_documents_required').default(0),
  documentsUploaded: integer('documents_uploaded').default(0),
  documentsApproved: integer('documents_approved').default(0),
  documentsRejected: integer('documents_rejected').default(0),
  
  // Notes
  notes: text('notes'),
  blockedReason: text('blocked_reason'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  applicationStageIdx: index('stage_progress_app_stage_idx').on(table.applicationId, table.stageId),
  statusIdx: index('stage_progress_status_idx').on(table.status),
}))

// Custom Document Requirements (Agent-added requirements)
export const customDocumentRequirements = pgTable('custom_document_requirements', {
  id: uuid('id').defaultRandom().primaryKey(),
  applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
  createdById: text('created_by_id').notNull().references(() => users.id),
  
  // Document Details
  documentName: varchar('document_name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }).notNull(),
  
  // Requirements
  isRequired: boolean('is_required').default(true),
  dueDate: date('due_date'),
  priority: varchar('priority', { length: 20 }).default('medium'),
  
  // Instructions
  instructions: text('instructions'),
  acceptedFormats: text('accepted_formats').array(),
  maxFileSizeMB: integer('max_file_size_mb').default(10),
  
  // Status
  status: varchar('status', { length: 50 }).default('pending'), // pending, fulfilled, waived
  fulfilledAt: timestamp('fulfilled_at'),
  waivedAt: timestamp('waived_at'),
  waivedReason: text('waived_reason'),
  
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  applicationIdx: index('custom_doc_requirements_application_idx').on(table.applicationId),
  createdByIdx: index('custom_doc_requirements_created_by_idx').on(table.createdById),
  statusIdx: index('custom_doc_requirements_status_idx').on(table.status),
}))

// ============================================================================
// DOCUMENT MANAGEMENT RELATIONS
// ============================================================================

export const programWorkflowTemplatesRelations = relations(programWorkflowTemplates, ({ one, many }) => ({
  program: one(crbiPrograms, {
    fields: [programWorkflowTemplates.programId],
    references: [crbiPrograms.id],
  }),
  stages: many(workflowStages),
  applicationProgress: many(applicationWorkflowProgress),
}))

export const workflowStagesRelations = relations(workflowStages, ({ one, many }) => ({
  template: one(programWorkflowTemplates, {
    fields: [workflowStages.templateId],
    references: [programWorkflowTemplates.id],
  }),
  documentRequirements: many(documentRequirements),
  stageProgress: many(stageProgress),
}))

export const documentRequirementsRelations = relations(documentRequirements, ({ one, many }) => ({
  program: one(crbiPrograms, {
    fields: [documentRequirements.programId],
    references: [crbiPrograms.id],
  }),
  stage: one(workflowStages, {
    fields: [documentRequirements.stageId],
    references: [workflowStages.id],
  }),
  applicationDocuments: many(applicationDocuments),
}))

export const applicationDocumentsRelations = relations(applicationDocuments, ({ one, many }) => ({
  application: one(applications, {
    fields: [applicationDocuments.applicationId],
    references: [applications.id],
  }),
  documentRequirement: one(documentRequirements, {
    fields: [applicationDocuments.documentRequirementId],
    references: [documentRequirements.id],
  }),
  reviewedBy: one(users, {
    fields: [applicationDocuments.reviewedById],
    references: [users.id],
  }),
  replacesDocument: one(applicationDocuments, {
    fields: [applicationDocuments.replacesDocumentId],
    references: [applicationDocuments.id],
  }),
  reviews: many(documentReviews),
}))

export const documentReviewsRelations = relations(documentReviews, ({ one }) => ({
  document: one(applicationDocuments, {
    fields: [documentReviews.documentId],
    references: [applicationDocuments.id],
  }),
  reviewer: one(users, {
    fields: [documentReviews.reviewerId],
    references: [users.id],
  }),
}))

export const applicationWorkflowProgressRelations = relations(applicationWorkflowProgress, ({ one, many }) => ({
  application: one(applications, {
    fields: [applicationWorkflowProgress.applicationId],
    references: [applications.id],
  }),
  template: one(programWorkflowTemplates, {
    fields: [applicationWorkflowProgress.templateId],
    references: [programWorkflowTemplates.id],
  }),
  currentStage: one(workflowStages, {
    fields: [applicationWorkflowProgress.currentStageId],
    references: [workflowStages.id],
  }),
  stageProgress: many(stageProgress),
}))

export const stageProgressRelations = relations(stageProgress, ({ one }) => ({
  application: one(applications, {
    fields: [stageProgress.applicationId],
    references: [applications.id],
  }),
  stage: one(workflowStages, {
    fields: [stageProgress.stageId],
    references: [workflowStages.id],
  }),
}))

export const customDocumentRequirementsRelations = relations(customDocumentRequirements, ({ one }) => ({
  application: one(applications, {
    fields: [customDocumentRequirements.applicationId],
    references: [applications.id],
  }),
  createdBy: one(users, {
    fields: [customDocumentRequirements.createdById],
    references: [users.id],
  }),
}))

// Update existing relations to include new document management
export const applicationsRelationsUpdated = relations(applications, ({ one, many }) => ({
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
  selectedInvestmentOption: one(investmentOptions, {
    fields: [applications.selectedInvestmentOptionId],
    references: [investmentOptions.id],
  }),
  milestones: many(applicationMilestones),
  documents: many(documents),
  tasks: many(tasks),
  activityLogs: many(activityLogs),
  communications: many(communications),
  conversations: many(conversations),
  // New document management relations
  applicationDocuments: many(applicationDocuments),
  workflowProgress: one(applicationWorkflowProgress),
  stageProgress: many(stageProgress),
  customDocumentRequirements: many(customDocumentRequirements),
}))

export const crbiProgramsRelationsUpdated = relations(crbiPrograms, ({ many }) => ({
  applications: many(applications),
  investmentOptions: many(investmentOptions),
  // New document management relations
  workflowTemplates: many(programWorkflowTemplates),
  documentRequirements: many(documentRequirements),
}))

export const usersRelationsUpdated = relations(users, ({ one, many }) => ({
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
  conversationsAssigned: many(conversations),
  messagesSent: many(messages, { relationName: "MessagesSentByAdvisor" }),
  messageParticipants: many(messageParticipants, { relationName: "AdvisorParticipants" }),
  messageNotifications: many(messageNotifications, { relationName: "AdvisorNotifications" }),
  clientInvitations: many(clientAuth, { relationName: "ClientInvitations" }),
  // New document management relations
  documentReviews: many(documentReviews),
  customDocumentRequirements: many(customDocumentRequirements),
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

export type InvestmentOption = typeof investmentOptions.$inferSelect
export type NewInvestmentOption = typeof investmentOptions.$inferInsert

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

export type ClientAuth = typeof clientAuth.$inferSelect
export type NewClientAuth = typeof clientAuth.$inferInsert

export type Conversation = typeof conversations.$inferSelect
export type NewConversation = typeof conversations.$inferInsert

export type Message = typeof messages.$inferSelect
export type NewMessage = typeof messages.$inferInsert

export type MessageParticipant = typeof messageParticipants.$inferSelect
export type NewMessageParticipant = typeof messageParticipants.$inferInsert

export type MessageNotification = typeof messageNotifications.$inferSelect
export type NewMessageNotification = typeof messageNotifications.$inferInsert

// Document Management Types
export type ProgramWorkflowTemplate = typeof programWorkflowTemplates.$inferSelect
export type NewProgramWorkflowTemplate = typeof programWorkflowTemplates.$inferInsert

export type WorkflowStage = typeof workflowStages.$inferSelect
export type NewWorkflowStage = typeof workflowStages.$inferInsert

export type DocumentRequirement = typeof documentRequirements.$inferSelect
export type NewDocumentRequirement = typeof documentRequirements.$inferInsert

export type ApplicationDocument = typeof applicationDocuments.$inferSelect
export type NewApplicationDocument = typeof applicationDocuments.$inferInsert

export type DocumentReview = typeof documentReviews.$inferSelect
export type NewDocumentReview = typeof documentReviews.$inferInsert

export type ApplicationWorkflowProgress = typeof applicationWorkflowProgress.$inferSelect
export type NewApplicationWorkflowProgress = typeof applicationWorkflowProgress.$inferInsert

export type StageProgress = typeof stageProgress.$inferSelect
export type NewStageProgress = typeof stageProgress.$inferInsert

export type CustomDocumentRequirement = typeof customDocumentRequirements.$inferSelect
export type NewCustomDocumentRequirement = typeof customDocumentRequirements.$inferInsert

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const USER_ROLES = ['admin', 'advisor', 'junior'] as const
export const CLIENT_STATUSES = ['prospect', 'active', 'approved', 'rejected'] as const
export const APPLICATION_STATUSES = ['draft', 'submitted', 'under_review', 'approved', 'rejected'] as const
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const
export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled', 'blocked'] as const
export const TASK_TYPES = [
  'document_review', 
  'client_communication', 
  'application_preparation', 
  'compliance_check', 
  'due_diligence', 
  'follow_up', 
  'meeting', 
  'other'
] as const
export const COMMUNICATION_TYPES = ['email', 'call', 'meeting', 'message'] as const

// Messaging System Constants
export const CONVERSATION_STATUSES = ['active', 'archived', 'closed'] as const
export const CONVERSATION_PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const
export const MESSAGE_TYPES = ['text', 'file', 'system'] as const
export const SENDER_TYPES = ['advisor', 'client', 'system'] as const
export const PARTICIPANT_TYPES = ['advisor', 'client'] as const
export const RECIPIENT_TYPES = ['advisor', 'client'] as const
export const NOTIFICATION_TYPES = ['browser', 'email', 'push'] as const

// Document Management Constants
export const DOCUMENT_CATEGORIES = ['personal', 'financial', 'investment', 'medical', 'legal'] as const
export const DOCUMENT_STATUSES = ['uploaded', 'under_review', 'approved', 'rejected', 'expired'] as const
export const REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'needs_revision'] as const
export const REVIEW_TYPES = ['initial', 'revision', 'final'] as const
export const REVIEW_RESULTS = ['approved', 'rejected', 'needs_revision'] as const
export const WORKFLOW_STATUSES = ['in_progress', 'completed', 'on_hold', 'cancelled'] as const
export const STAGE_STATUSES = ['pending', 'in_progress', 'completed', 'skipped'] as const
export const CUSTOM_DOC_STATUSES = ['pending', 'fulfilled', 'waived'] as const
export const UPLOADED_BY_TYPES = ['client', 'advisor'] as const
export const ACCEPTED_FILE_FORMATS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx'] as const

export type UserRole = typeof USER_ROLES[number]
export type ClientStatus = typeof CLIENT_STATUSES[number]
export type ApplicationStatus = typeof APPLICATION_STATUSES[number]
export type TaskPriority = typeof TASK_PRIORITIES[number]
export type TaskStatus = typeof TASK_STATUSES[number]
export type TaskType = typeof TASK_TYPES[number]
export type CommunicationType = typeof COMMUNICATION_TYPES[number]

// Messaging System Types
export type ConversationStatus = typeof CONVERSATION_STATUSES[number]
export type ConversationPriority = typeof CONVERSATION_PRIORITIES[number]
export type MessageType = typeof MESSAGE_TYPES[number]
export type SenderType = typeof SENDER_TYPES[number]
export type ParticipantType = typeof PARTICIPANT_TYPES[number]
export type RecipientType = typeof RECIPIENT_TYPES[number]
export type NotificationType = typeof NOTIFICATION_TYPES[number]

// Document Management Types
export type DocumentCategory = typeof DOCUMENT_CATEGORIES[number]
export type DocumentStatus = typeof DOCUMENT_STATUSES[number]
export type ReviewStatus = typeof REVIEW_STATUSES[number]
export type ReviewType = typeof REVIEW_TYPES[number]
export type ReviewResult = typeof REVIEW_RESULTS[number]
export type WorkflowStatus = typeof WORKFLOW_STATUSES[number]
export type StageStatus = typeof STAGE_STATUSES[number]
export type CustomDocStatus = typeof CUSTOM_DOC_STATUSES[number]
export type UploadedByType = typeof UPLOADED_BY_TYPES[number]
export type AcceptedFileFormat = typeof ACCEPTED_FILE_FORMATS[number]