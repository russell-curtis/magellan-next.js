# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Database Operations
- `npx drizzle-kit generate` - Generate database migrations
- `npx drizzle-kit push` - Push schema changes to database
- `npx drizzle-kit studio` - Open Drizzle Studio for database management

## Architecture Overview

This is a Next.js 15 SaaS starter with TypeScript, featuring a complete authentication and subscription system.

### Core Stack
- **Framework**: Next.js 15.3.1 with App Router and Turbopack
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: Better Auth v1.2.8 with Google OAuth
- **Subscriptions**: Polar.sh integration
- **Storage**: Cloudflare R2 for file uploads
- **UI**: Tailwind CSS v4 + shadcn/ui + Radix UI
- **AI**: OpenAI SDK integration

### Key Architecture Patterns

#### Authentication System
- Uses Better Auth with Drizzle adapter (`lib/auth.ts`)
- Database schema includes `user`, `session`, `account`, `verification` tables
- Google OAuth configured with session management
- Polar.sh customer creation on signup

#### Subscription Management
- Polar.sh webhooks handle subscription lifecycle (`lib/auth.ts:87-187`)
- Subscription data stored in `subscription` table with full webhook payload
- Helper functions in `lib/subscription.ts` for status checking
- Supports active, canceled, expired states with proper error handling

#### Database Schema (`db/schema.ts`)
- Better Auth tables: user, session, account, verification
- Custom subscription table with comprehensive Polar.sh webhook data
- Uses Drizzle ORM with PostgreSQL dialect
- Foreign key relationships with cascade deletes

#### File Structure
- `/app` - Next.js App Router with route groups
- `/app/dashboard` - Protected dashboard area with auth middleware
- `/app/api` - API routes for auth, chat, subscriptions, uploads
- `/components/ui` - shadcn/ui component library
- `/lib` - Utilities for auth, subscriptions, uploads
- `/db` - Database schema and configuration

#### Environment Variables Required
- `DATABASE_URL` - Neon PostgreSQL connection
- `BETTER_AUTH_SECRET` - Auth secret key
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth
- `POLAR_ACCESS_TOKEN/WEBHOOK_SECRET` - Polar.sh integration
- `OPENAI_API_KEY` - AI features
- `CLOUDFLARE_ACCOUNT_ID`, `R2_*` - File storage
- `NEXT_PUBLIC_STARTER_TIER/SLUG` - Polar.sh product configuration

#### Subscription Utilities
- `getSubscriptionDetails()` - Get full subscription info with error handling
- `isUserSubscribed()` - Simple boolean check for active subscription
- `hasAccessToProduct(productId)` - Product-specific access control
- `getUserSubscriptionStatus()` - Returns status: active/canceled/expired/none

#### Development Notes
- Uses TypeScript with strict mode
- Path alias `@/*` maps to project root
- Polar.sh configured for sandbox environment
- Database migrations in `/db/migrations`
- shadcn/ui components configured in `components.json`