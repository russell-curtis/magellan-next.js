import { auth } from '@/lib/auth'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

export interface AuthenticatedUser {
  id: string
  firmId: string
  name: string
  email: string
  role: string
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    })

    if (!session?.session?.userId) {
      return null
    }

    const user = await db
      .select({
        id: users.id,
        firmId: users.firmId,
        name: users.name,
        email: users.email,
        role: users.role
      })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    return user[0] || null
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

export async function requireAuth(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error('Unauthorized')
  }
  
  return user
}