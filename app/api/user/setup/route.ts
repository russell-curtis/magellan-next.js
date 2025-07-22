import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { firms, users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const setupSchema = z.object({
  firmName: z.string().min(1, 'Firm name is required').max(255),
  firmSlug: z.string().min(1, 'Firm slug is required').max(100).regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  role: z.enum(['admin', 'advisor'])
})

export async function POST(request: NextRequest) {
  try {
    // Get current session
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId || !session.user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = setupSchema.parse(body)

    // Check if user already has a firm setup
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (existingUser.length > 0) {
      return NextResponse.json({ error: 'User already set up' }, { status: 400 })
    }

    // Check if firm slug is already taken
    const existingFirm = await db
      .select()
      .from(firms)
      .where(eq(firms.slug, validatedData.firmSlug))
      .limit(1)

    if (existingFirm.length > 0) {
      return NextResponse.json({ error: 'Firm identifier already taken' }, { status: 400 })
    }

    // Create firm
    const [newFirm] = await db
      .insert(firms)
      .values({
        name: validatedData.firmName,
        slug: validatedData.firmSlug,
        subscriptionTier: 'starter',
        subscriptionStatus: 'trial',
        settings: {}
      })
      .returning()

    // Create user record
    const [newUser] = await db
      .insert(users)
      .values({
        id: session.session.userId,
        firmId: newFirm.id,
        email: session.user.email,
        name: session.user.name,
        role: validatedData.role,
        isActive: true
      })
      .returning()

    return NextResponse.json({
      success: true,
      firm: newFirm,
      user: newUser
    })

  } catch (error) {
    console.error('User setup error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Setup failed' },
      { status: 500 }
    )
  }
}