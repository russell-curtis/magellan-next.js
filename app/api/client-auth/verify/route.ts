import { NextResponse } from 'next/server'
import { getCurrentClient } from '@/lib/client-auth'

export async function GET() {
  try {
    const client = await getCurrentClient()
    
    if (!client) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        email: client.email,
        firstName: client.client.firstName,
        lastName: client.client.lastName,
        firmId: client.client.firmId,
      },
    })
  } catch (error) {
    console.error('Client verification error:', error)
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    )
  }
}