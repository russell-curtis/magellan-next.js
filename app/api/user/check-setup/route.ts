import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Check if user exists in our users table with firmId
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    const isSetup = user.length > 0 && user[0].firmId

    return NextResponse.json({ 
      isSetup,
      user: isSetup ? user[0] : null 
    })

  } catch (error) {
    console.error('Error checking user setup:', error)
    return NextResponse.json(
      { error: 'Failed to check setup status' },
      { status: 500 }
    )
  }
}