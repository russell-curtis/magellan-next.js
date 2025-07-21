# Magellan MVP - Product Requirements Document

## Executive Summary

**Product**: Magellan CRBI Platform MVP  
**Target**: Advisory firms managing Citizenship & Residency by Investment applications  
**Timeline**: 8-10 weeks to MVP launch  
**Goal**: Validate market demand and achieve €50K ARR within 6 months

### Vision Statement
Eliminate the operational chaos in CRBI advisory firms by providing the first integrated platform that combines client management, application tracking, and document automation in one seamless workflow.

### Success Criteria
- **Market Validation**: 10+ firms sign up for beta testing
- **Product-Market Fit**: 70%+ beta users convert to paid plans
- **Revenue**: €50K ARR within 6 months
- **Efficiency**: Measure 30%+ reduction in administrative time

---

## Problem Statement

### Target Users
**Primary**: CRBI Advisory Firms (500-700 firms in Europe/Middle East)
- Small-medium firms (2-20 employees)
- Currently using Excel + email + basic CRM
- Processing 20-100 CRBI applications annually
- Average deal size: €50K-500K

### Core Pain Points
1. **Fragmented Workflows**: Switching between 5+ tools daily
2. **Manual Application Tracking**: Lost applications, missed deadlines
3. **Document Chaos**: Version control nightmares, compliance risks
4. **Client Frustration**: No transparency on application status
5. **Administrative Overhead**: 30-40% of advisor time on admin tasks

### User Stories

**As a CRBI Advisory Firm Manager, I want to:**
- See all clients and their application statuses in one dashboard
- Track application progress without manual updates
- Ensure document compliance before submission
- Reduce time spent on administrative tasks
- Provide clients with transparent progress updates

**As a CRBI Advisor, I want to:**
- Quickly find client information and documents
- Know what tasks are due today
- Upload and organize documents efficiently
- See which applications need attention

**As a HNWI Client, I want to:**
- Track my application progress in real-time
- Upload documents securely
- Communicate with my advisor efficiently

---

## MVP Feature Specifications

### 1. Client Management Dashboard

**Core Requirements:**
- **Client List View**: Sortable table with client name, program type, status, next action
- **Client Profile Pages**: Contact info, application history, document repository
- **Task Management**: Daily task list with due dates and priorities
- **Quick Stats**: Widget showing active clients, applications in progress, success rate

**User Flows:**
1. **Add New Client**: Form with basic HNWI details + program selection
2. **View Client**: Click from list → detailed profile with tabs
3. **Update Status**: Change application status → auto-updates dashboard
4. **Assign Tasks**: Create tasks with due dates → appears in task sidebar

**Acceptance Criteria:**
- Load client list in <2 seconds
- Support 200+ clients per firm without performance issues
- Mobile responsive design
- Role-based access (admin vs advisor permissions)

### 2. Application Tracking

**Core Requirements:**
- **Application Timeline**: Visual progress bar with milestones
- **Status Updates**: Dropdown to change status (Draft → Submitted → Under Review → Approved)
- **Document Links**: Connect applications to required documents
- **Deadline Tracking**: Automated alerts for upcoming deadlines

**Key Workflows:**
1. **Create Application**: Select client + program → auto-generates milestone timeline
2. **Update Progress**: Change status → notifies client + updates dashboard
3. **Track Deadlines**: System alerts 7 days before critical dates
4. **View History**: Timeline of all status changes with timestamps

**Acceptance Criteria:**
- Support 15+ CRBI programs (Portugal, Cyprus, Malta, etc.)
- Automated email notifications for status changes
- Bulk actions for multiple applications
- Export application reports to PDF

### 3. Document Automation

**Core Requirements:**
- **Document Upload**: Drag-and-drop with file type validation
- **Template Library**: Pre-built templates for common CRBI documents
- **Version Control**: Track document versions with change logs
- **Compliance Checker**: Basic validation (file format, required fields)

**Document Types:**
- Passports & IDs
- Financial statements
- Investment proofs
- Background checks
- Medical certificates
- Real estate documents

**User Flows:**
1. **Upload Documents**: Drag files → auto-categorize → link to client/application
2. **Generate from Template**: Select template → auto-fill client data → download
3. **Check Compliance**: Run scan → highlight missing items → provide checklist
4. **Share with Client**: Secure link generation for document review/signature

**Acceptance Criteria:**
- Support PDF, DOC, JPG file formats
- Maximum 10MB per file
- Secure storage with encryption
- Document expiry tracking for time-sensitive files

---

## Technical Requirements

### Architecture
- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS
- **Backend**: API routes + Drizzle ORM + Neon PostgreSQL
- **Authentication**: Better Auth with firm-based multi-tenancy
- **Storage**: Cloudflare R2 for document storage
- **Deployment**: Vercel with preview deployments

### Database Schema (Core Entities)

```sql
-- Firms (multi-tenant)
firms: id, name, subscription_tier, created_at

-- Users (advisors within firms)
users: id, firm_id, role, email, name

-- Clients (HNWIs)
clients: id, firm_id, name, email, nationality, program_interest

-- Applications
applications: id, client_id, program_type, status, created_at, deadline

-- Documents
documents: id, application_id, file_url, document_type, status, uploaded_at

-- Tasks
tasks: id, user_id, client_id, title, due_date, completed
```

### Performance Requirements
- Page load time: <3 seconds
- File upload: <30 seconds for 10MB files
- Dashboard refresh: <2 seconds
- Support: 100 concurrent users per firm

### Security Requirements
- SOC 2 Type II compliance planning
- GDPR compliance for EU clients
- End-to-end encryption for document storage
- Role-based access controls
- Audit logs for all actions

---

## Success Metrics

### Leading Indicators (During Development)
- **User Engagement**: Daily active users, session duration
- **Feature Adoption**: % of users using each core feature
- **Support Tickets**: <5% users contacting support weekly

### Lagging Indicators (Post-Launch)
- **User Retention**: 80% month-1 retention for beta users
- **Customer Satisfaction**: 4.5+ star rating
- **Revenue Growth**: €50K ARR within 6 months
- **Time Savings**: 30%+ reduction in administrative time (measured via user surveys)

### Key Analytics Events
- User signup and firm onboarding
- Client creation and profile completion
- Application status changes
- Document uploads and compliance checks
- Task completion rates

---

## Development Timeline

### Phase 1: Foundation (Weeks 1-2)
- [ ] Database schema design and migration
- [ ] Multi-tenant authentication setup
- [ ] Basic firm onboarding flow
- [ ] Core navigation and layout

### Phase 2: Client Management (Weeks 3-4)
- [ ] Client list and search functionality
- [ ] Client profile pages with tabs
- [ ] Task management system
- [ ] Dashboard widgets and metrics

### Phase 3: Application Tracking (Weeks 5-6)
- [ ] Application creation and timeline
- [ ] Status update workflows
- [ ] Email notification system
- [ ] Deadline tracking and alerts

### Phase 4: Document Automation (Weeks 7-8)
- [ ] File upload with R2 integration
- [ ] Document categorization and linking
- [ ] Basic compliance checking
- [ ] Template system (v1)

### Phase 5: Beta Launch (Weeks 9-10)
- [ ] User acceptance testing
- [ ] Performance optimization
- [ ] Beta user onboarding
- [ ] Feedback collection system

---

## Go-to-Market Strategy

### Pre-Launch (Weeks 1-8)
- **Customer Development**: Interview 20+ CRBI firms
- **Content Marketing**: LinkedIn articles on CRBI industry challenges
- **Beta Recruitment**: Target 10-15 firms for closed beta

### Launch (Weeks 9-12)
- **Beta Program**: Invite-only access with white-glove onboarding
- **Pricing**: €299/month (up to 50 clients), €599/month (up to 200 clients)
- **Success Metrics**: Track time savings and user satisfaction

### Post-Launch (Month 4-6)
- **Product Hunt Launch**: Generate awareness in tech community
- **Industry Conferences**: CRBI World, Citizenship Summit
- **Referral Program**: Existing customers refer new firms

---

## Risk Mitigation

### Technical Risks
- **Data Security**: Implement security audit before handling real client data
- **Performance**: Load testing with simulated user data
- **Compliance**: Legal review of GDPR/data handling procedures

### Market Risks
- **Customer Acquisition**: Have backup marketing channels beyond cold outreach
- **Competition**: Monitor existing CRM vendors entering CRBI space
- **Product-Market Fit**: Pivot features based on beta feedback

### Operational Risks
- **Support**: Plan customer success resources for beta users
- **Documentation**: Comprehensive user guides and onboarding materials
- **Scaling**: Infrastructure planning for rapid user growth

---

## Success Definition

**MVP Success = Market Validation + Revenue Growth**

1. **Market Validation**: 10+ firms actively using the platform daily
2. **Product-Market Fit**: 70%+ beta users convert to paid subscriptions
3. **Revenue Milestone**: €50K ARR within 6 months
4. **User Satisfaction**: Net Promoter Score >50

**Next Phase Triggers:**
- Consistent revenue growth month-over-month
- Strong user engagement metrics (80%+ retention)
- Clear feature requests for expansion (real estate module, analytics)

---

*This PRD will be updated based on user feedback and market validation during the development process.*