import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { requireAuth } from '@/lib/auth-utils'
import { eq } from 'drizzle-orm'

export async function GET() {
  try {
    const user = await requireAuth()
    
    const firmUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        isActive: users.isActive
      })
      .from(users)
      .where(eq(users.firmId, user.firmId))
      .orderBy(users.name)
    
    return NextResponse.json({ users: firmUsers })

  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}