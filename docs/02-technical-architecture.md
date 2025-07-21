# Magellan Technical Architecture & Database Schema

## System Architecture Overview

### Tech Stack
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Next.js API Routes + Drizzle ORM
- **Database**: Neon PostgreSQL (serverless)
- **Authentication**: Better Auth v1.2.8 + Google OAuth
- **File Storage**: Cloudflare R2 (S3-compatible)
- **Payments**: Polar.sh
- **AI**: OpenAI API (for future features)
- **Analytics**: PostHog
- **Hosting**: Vercel

### Architecture Principles
1. **Multi-tenant by Design**: Firm-based data isolation
2. **API-First**: All features accessible via REST API
3. **Security by Default**: Row-level security + encryption
4. **Scalable**: Serverless components for auto-scaling
5. **Type-Safe**: End-to-end TypeScript

---

## Database Schema

### Core Entities

```sql
-- Firms (Multi-tenant isolation)
CREATE TABLE firms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL, -- for subdomain routing
  subscription_tier VARCHAR(50) DEFAULT 'starter', -- starter, professional, enterprise
  subscription_status VARCHAR(50) DEFAULT 'trial', -- trial, active, cancelled, expired
  settings JSONB DEFAULT '{}', -- firm-specific settings
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users (Advisors within firms)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'advisor', -- admin, advisor, junior
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients (HNWIs)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  assigned_advisor_id UUID REFERENCES users(id),
  
  -- Personal Information
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  nationality VARCHAR(100),
  date_of_birth DATE,
  passport_number VARCHAR(100),
  
  -- CRBI Specific
  net_worth_estimate DECIMAL(15,2),
  investment_budget DECIMAL(15,2),
  preferred_programs TEXT[], -- ['portugal', 'cyprus', 'malta']
  source_of_funds TEXT,
  
  -- Status & Notes
  status VARCHAR(50) DEFAULT 'prospect', -- prospect, active, approved, rejected
  notes TEXT,
  tags TEXT[], -- for categorization
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- CRBI Programs (Master data)
CREATE TABLE crbi_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code VARCHAR(10) NOT NULL, -- 'PT', 'CY', 'MT'
  country_name VARCHAR(100) NOT NULL,
  program_type VARCHAR(50) NOT NULL, -- 'citizenship', 'residency'
  program_name VARCHAR(255) NOT NULL,
  min_investment DECIMAL(15,2) NOT NULL,
  processing_time_months INTEGER,
  requirements JSONB, -- detailed requirements
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Applications
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES crbi_programs(id),
  assigned_advisor_id UUID REFERENCES users(id),
  
  -- Application Details
  application_number VARCHAR(100), -- firm's internal tracking number
  status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, under_review, approved, rejected
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  
  -- Timeline
  submitted_at TIMESTAMP,
  decision_expected_at TIMESTAMP,
  decided_at TIMESTAMP,
  
  -- Investment Details
  investment_amount DECIMAL(15,2),
  investment_type VARCHAR(100), -- real_estate, government_bonds, business
  
  -- Notes & Communication
  notes TEXT,
  internal_notes TEXT, -- private advisor notes
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Application Milestones/Timeline
CREATE TABLE application_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'pending', -- pending, completed, overdue
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  
  -- File Details
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL, -- Cloudflare R2 URL
  file_size BIGINT,
  content_type VARCHAR(100),
  
  -- Categorization
  document_type VARCHAR(100) NOT NULL, -- passport, financial_statement, etc.
  category VARCHAR(50), -- identity, financial, legal, medical
  
  -- Status & Compliance
  status VARCHAR(50) DEFAULT 'uploaded', -- uploaded, reviewed, approved, rejected
  compliance_status VARCHAR(50), -- compliant, non_compliant, pending_review
  compliance_notes TEXT,
  
  -- Version Control
  version INTEGER DEFAULT 1,
  is_latest_version BOOLEAN DEFAULT true,
  replaced_by_id UUID REFERENCES documents(id),
  
  -- Metadata
  uploaded_by_id UUID REFERENCES users(id),
  expires_at TIMESTAMP, -- for time-sensitive documents
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Document Types (Master data)
CREATE TABLE document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(50) NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT false,
  validation_rules JSONB, -- file type, size limits, etc.
  retention_period_months INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tasks & Reminders
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  created_by_id UUID REFERENCES users(id),
  assigned_to_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  application_id UUID REFERENCES applications(id),
  
  -- Task Details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled
  
  -- Timeline
  due_date TIMESTAMP,
  completed_at TIMESTAMP,
  reminder_at TIMESTAMP,
  
  -- Task Type
  task_type VARCHAR(50), -- follow_up, document_request, review, etc.
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Activity Logs (Audit Trail)
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  client_id UUID REFERENCES clients(id),
  application_id UUID REFERENCES applications(id),
  
  -- Activity Details
  action VARCHAR(100) NOT NULL, -- created, updated, deleted, viewed
  entity_type VARCHAR(50) NOT NULL, -- client, application, document, task
  entity_id UUID NOT NULL,
  
  -- Changes
  old_values JSONB,
  new_values JSONB,
  
  -- Context
  ip_address INET,
  user_agent TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Communication Logs
CREATE TABLE communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firm_id UUID NOT NULL REFERENCES firms(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id),
  application_id UUID REFERENCES applications(id),
  user_id UUID REFERENCES users(id),
  
  -- Communication Details
  type VARCHAR(50) NOT NULL, -- email, call, meeting, message
  subject VARCHAR(255),
  content TEXT,
  direction VARCHAR(20) NOT NULL, -- inbound, outbound
  
  -- Email specific
  email_message_id TEXT, -- for email threading
  
  -- Metadata
  occurred_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Indexes for Performance

```sql
-- Multi-tenant isolation indexes
CREATE INDEX idx_clients_firm_id ON clients(firm_id);
CREATE INDEX idx_applications_firm_id ON applications(firm_id);
CREATE INDEX idx_documents_firm_id ON documents(firm_id);
CREATE INDEX idx_tasks_firm_id ON tasks(firm_id);

-- Common query patterns
CREATE INDEX idx_applications_client_status ON applications(client_id, status);
CREATE INDEX idx_applications_advisor_status ON applications(assigned_advisor_id, status);
CREATE INDEX idx_tasks_assigned_due ON tasks(assigned_to_id, due_date) WHERE status != 'completed';
CREATE INDEX idx_documents_application ON documents(application_id, document_type);
CREATE INDEX idx_activity_logs_entity ON activity_logs(entity_type, entity_id);

-- Search indexes
CREATE INDEX idx_clients_search ON clients USING gin(to_tsvector('english', first_name || ' ' || last_name || ' ' || email));
```

---

## API Structure

### Authentication & Authorization

```typescript
// Row Level Security (RLS) - Drizzle Schema
export const firmAccess = {
  // All queries automatically filtered by firm_id
  where: (table: any, user: User) => eq(table.firm_id, user.firm_id)
}

// Role-based permissions
type UserRole = 'admin' | 'advisor' | 'junior'
type Permission = 'read' | 'write' | 'delete' | 'admin'

const permissions: Record<UserRole, Permission[]> = {
  admin: ['read', 'write', 'delete', 'admin'],
  advisor: ['read', 'write'],
  junior: ['read']
}
```

### API Routes Structure

```
/api/
├── auth/
│   ├── login
│   ├── logout
│   └── session
├── firms/
│   ├── [firmId]/
│   │   ├── settings
│   │   └── users
├── clients/
│   ├── GET /api/clients - List clients
│   ├── POST /api/clients - Create client
│   ├── GET /api/clients/[id] - Get client
│   ├── PUT /api/clients/[id] - Update client
│   └── DELETE /api/clients/[id] - Delete client
├── applications/
│   ├── GET /api/applications - List applications
│   ├── POST /api/applications - Create application
│   ├── GET /api/applications/[id] - Get application
│   ├── PUT /api/applications/[id] - Update application
│   └── PUT /api/applications/[id]/status - Update status
├── documents/
│   ├── GET /api/documents - List documents
│   ├── POST /api/documents/upload - Upload document
│   ├── GET /api/documents/[id] - Get document
│   └── DELETE /api/documents/[id] - Delete document
├── tasks/
│   ├── GET /api/tasks - List tasks
│   ├── POST /api/tasks - Create task
│   ├── PUT /api/tasks/[id] - Update task
│   └── PUT /api/tasks/[id]/complete - Complete task
└── dashboard/
    ├── GET /api/dashboard/stats - Dashboard metrics
    └── GET /api/dashboard/activities - Recent activities
```

### API Response Format

```typescript
// Standard API Response
interface ApiResponse<T> {
  data: T
  success: boolean
  message?: string
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

// Error Response
interface ApiError {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}
```

---

## Security Architecture

### Data Protection
- **Encryption at Rest**: Database encryption via Neon
- **Encryption in Transit**: TLS 1.2+ for all connections
- **File Storage**: Cloudflare R2 with signed URLs
- **Environment Variables**: Vercel environment variables

### Access Control
- **Multi-tenant Isolation**: Row-level security by firm_id
- **Role-based Permissions**: Admin, Advisor, Junior roles
- **Session Management**: Better Auth with database persistence
- **API Security**: JWT tokens + CSRF protection

### Compliance Considerations
- **GDPR**: Data portability, deletion, consent tracking
- **Data Retention**: Configurable retention policies
- **Audit Logs**: Complete activity tracking
- **Backup Strategy**: Automated daily backups

---

## File Storage Architecture

### Cloudflare R2 Structure
```
bucket-name/
├── firms/
│   └── [firm-id]/
│       ├── clients/
│       │   └── [client-id]/
│       │       ├── identity/
│       │       ├── financial/
│       │       └── legal/
│       └── templates/
│           ├── contracts/
│           └── forms/
```

### File Upload Flow
1. **Client requests signed URL** from `/api/documents/upload-url`
2. **Direct upload to R2** using signed URL
3. **Webhook confirms upload** and creates database record
4. **Virus scanning** (future enhancement)
5. **Document processing** (OCR, validation)

---

## Deployment Architecture

### Vercel Deployment
- **Production**: `magellan.app`
- **Staging**: `staging.magellan.app`
- **Preview**: Automatic for each PR

### Environment Variables
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
BETTER_AUTH_SECRET="..."
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."

# Storage
CLOUDFLARE_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="magellan-documents"

# Payments
POLAR_ACCESS_TOKEN="..."
POLAR_WEBHOOK_SECRET="..."

# AI (Future)
OPENAI_API_KEY="..."

# Analytics
POSTHOG_KEY="..."
```

---

## Development Guidelines

### Database Migrations
```bash
# Generate migration
npx drizzle-kit generate

# Push to database
npx drizzle-kit push

# Studio for debugging
npx drizzle-kit studio
```

### Code Organization
```
app/
├── (auth)/           # Auth pages
├── dashboard/        # Main app
│   ├── clients/      # Client management
│   ├── applications/ # Application tracking
│   ├── documents/    # Document management
│   └── tasks/        # Task management
├── api/             # API routes
└── globals.css      # Global styles

components/
├── ui/              # shadcn/ui components
├── dashboard/       # Dashboard-specific components
└── forms/           # Form components

lib/
├── db/              # Database schema & connection
├── auth/            # Authentication utilities
├── permissions/     # Role-based access
└── utils/           # Helper functions
```

### Type Safety
```typescript
// Database types from Drizzle
import type { Client, Application, Document } from '@/lib/db/schema'

// API types
interface CreateClientRequest {
  firstName: string
  lastName: string
  email: string
  // ...
}

// Component props
interface ClientCardProps {
  client: Client
  onEdit: (id: string) => void
}
```

---

## Performance Considerations

### Database Optimization
- Connection pooling via Neon
- Prepared statements with Drizzle
- Proper indexing for multi-tenant queries
- Query optimization for dashboard views

### Frontend Performance
- Next.js App Router with streaming
- React Server Components for data fetching
- Optimistic UI updates
- Image optimization with Next.js

### Caching Strategy
- Static page caching for public pages
- API route caching for master data
- Client-side caching with React Query (future)

---

## Monitoring & Analytics

### Application Monitoring
- **Error Tracking**: Vercel error monitoring
- **Performance**: Core Web Vitals
- **Uptime**: External monitoring service

### Business Analytics
- **User Behavior**: PostHog event tracking
- **Feature Usage**: Dashboard interactions
- **Performance Metrics**: Time savings, success rates

### Key Events to Track
```typescript
// User actions
analytics.track('client_created', { firm_id, advisor_id })
analytics.track('application_submitted', { program_type, investment_amount })
analytics.track('document_uploaded', { document_type, file_size })
analytics.track('task_completed', { task_type, days_to_complete })

// Business metrics
analytics.track('subscription_upgraded', { from_tier, to_tier })
analytics.track('trial_converted', { trial_duration_days })
```

---

This architecture provides a solid foundation for the Magellan MVP while allowing for future scalability and feature additions.