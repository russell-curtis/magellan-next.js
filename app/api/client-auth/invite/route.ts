import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth-utils'
import { createClientAuth, generateInvitationToken } from '@/lib/client-auth'
import { db } from '@/db/drizzle'
import { clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'

const inviteSchema = z.object({
  clientId: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(6),
  sendEmail: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    
    // Validate request body
    const validation = inviteSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.issues },
        { status: 400 }
      )
    }

    const { clientId, email, password, sendEmail } = validation.data

    // Verify client exists and belongs to user's firm
    const client = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        firmId: clients.firmId,
        email: clients.email,
      })
      .from(clients)
      .where(eq(clients.id, clientId))
      .limit(1)

    if (!client.length) {
      return NextResponse.json(
        { error: 'Client not found' },
        { status: 404 }
      )
    }

    if (client[0].firmId !== user.firmId) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Create client authentication
    await createClientAuth(clientId, email, password, user.id)

    // Generate invitation token
    const invitationToken = generateInvitationToken(clientId, email)

    // TODO: Send invitation email if requested
    if (sendEmail) {
      // This would integrate with an email service like SendGrid, Resend, etc.
      console.log(`Would send invitation email to ${email} for client ${client[0].firstName} ${client[0].lastName}`)
    }

    return NextResponse.json({
      success: true,
      message: 'Client invitation created successfully',
      invitationToken,
      invitationUrl: `${process.env.NEXT_PUBLIC_APP_URL}/client/setup?token=${invitationToken}`,
      client: {
        id: client[0].id,
        firstName: client[0].firstName,
        lastName: client[0].lastName,
        email: email,
      },
    })
  } catch (error) {
    console.error('Client invitation error:', error)
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: 'Failed to create client invitation' },
      { status: 500 }
    )
  }
}