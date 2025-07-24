import { NextRequest, NextResponse } from 'next/server'
import { authenticateClient, generateClientToken } from '@/lib/client-auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email().min(1),
  password: z.string().min(6),
})

export async function POST(request: NextRequest) {
  try {
    console.log('🔐 Client login attempt')
    const body = await request.json()
    console.log('📝 Request body:', { ...body, password: '***' })
    
    // Validate request body
    const validation = loginSchema.safeParse(body)
    if (!validation.success) {
      console.log('❌ Validation failed:', validation.error.issues)
      console.log('❌ Received data:', { 
        email: body.email, 
        emailLength: body.email?.length, 
        password: '***', 
        passwordLength: body.password?.length 
      })
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: validation.error.issues,
          debug: {
            emailReceived: !!body.email,
            emailLength: body.email?.length || 0,
            passwordReceived: !!body.password,
            passwordLength: body.password?.length || 0
          }
        },
        { status: 400 }
      )
    }

    const { email, password } = validation.data
    console.log('✅ Validation passed for email:', email)

    // Authenticate client
    console.log('🔍 Attempting to authenticate client...')
    const client = await authenticateClient(email, password)
    
    if (!client) {
      console.log('❌ Authentication failed - invalid credentials')
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    console.log('✅ Client authenticated:', client.email)
    
    // Generate JWT token
    console.log('🎟️ Generating JWT token...')
    const token = generateClientToken({
      clientId: client.clientId,
      email: client.email,
      authId: client.authId,
    })

    console.log('✅ Login successful for:', client.email)
    
    // Return client data and token
    return NextResponse.json({
      success: true,
      client: {
        id: client.id,
        email: client.email,
        firstName: client.client.firstName,
        lastName: client.client.lastName,
        firmId: client.client.firmId,
      },
      token,
    })
  } catch (error) {
    console.error('Client login error:', error)
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    )
  }
}