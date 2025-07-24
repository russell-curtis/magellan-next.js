import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { db } from '@/db/drizzle'
import { clientAuth, clients } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'

// Client JWT payload interface
export interface ClientTokenPayload {
  clientId: string
  email: string
  authId: string
}

// Invitation token payload interface
export interface InvitationTokenPayload {
  clientId: string
  email: string
  type: 'invitation'
}

// Client authentication response
export interface AuthenticatedClient {
  id: string
  authId: string
  email: string
  clientId: string
  client: {
    id: string
    firstName: string
    lastName: string
    firmId: string
  }
}

// JWT secret for client tokens (separate from advisor auth)
const CLIENT_JWT_SECRET = process.env.CLIENT_JWT_SECRET || 'default-client-secret-change-in-production'

// Hash password for client
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12
  return bcrypt.hash(password, saltRounds)
}

// Verify password for client
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

// Generate JWT token for client
export function generateClientToken(payload: ClientTokenPayload): string {
  return jwt.sign(payload, CLIENT_JWT_SECRET, {
    expiresIn: '7d', // 7 days
    issuer: 'magellan-crbi',
    audience: 'client',
  })
}

// Verify and decode client JWT token
export function verifyClientToken(token: string): ClientTokenPayload | null {
  try {
    const decoded = jwt.verify(token, CLIENT_JWT_SECRET, {
      issuer: 'magellan-crbi',
      audience: 'client',
    }) as ClientTokenPayload
    return decoded
  } catch (error) {
    console.error('Client token verification failed:', error)
    return null
  }
}

// Get current authenticated client from request headers
export async function getCurrentClient(): Promise<AuthenticatedClient | null> {
  try {
    const headersList = await headers()
    const authHeader = headersList.get('authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix
    const payload = verifyClientToken(token)
    
    if (!payload) {
      return null
    }

    // Fetch client details from database
    const result = await db
      .select({
        authId: clientAuth.id,
        email: clientAuth.email,
        isActive: clientAuth.isActive,
        clientId: clientAuth.clientId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          firmId: clients.firmId,
          email: clients.email,
        },
      })
      .from(clientAuth)
      .innerJoin(clients, eq(clientAuth.clientId, clients.id))
      .where(eq(clientAuth.id, payload.authId))
      .limit(1)

    if (!result.length || !result[0].isActive) {
      return null
    }

    const clientData = result[0]
    return {
      id: clientData.client.id,
      authId: clientData.authId,
      email: clientData.email,
      clientId: clientData.clientId,
      client: {
        id: clientData.client.id,
        firstName: clientData.client.firstName,
        lastName: clientData.client.lastName,
        firmId: clientData.client.firmId,
      },
    }
  } catch (error) {
    console.error('Error getting current client:', error)
    return null
  }
}

// Require client authentication (throws error if not authenticated)
export async function requireClientAuth(): Promise<AuthenticatedClient> {
  const client = await getCurrentClient()
  
  if (!client) {
    throw new Error('Client authentication required')
  }
  
  return client
}

// Authenticate client with email and password
export async function authenticateClient(email: string, password: string): Promise<AuthenticatedClient | null> {
  try {
    console.log('🔍 Authenticating client with email:', email.toLowerCase())
    
    const result = await db
      .select({
        authId: clientAuth.id,
        authEmail: clientAuth.email,
        passwordHash: clientAuth.passwordHash,
        isActive: clientAuth.isActive,
        clientId: clientAuth.clientId,
        client: {
          id: clients.id,
          firstName: clients.firstName,
          lastName: clients.lastName,
          firmId: clients.firmId,
          email: clients.email,
        },
      })
      .from(clientAuth)
      .innerJoin(clients, eq(clientAuth.clientId, clients.id))
      .where(eq(clientAuth.email, email.toLowerCase()))
      .limit(1)

    console.log('📊 Database query result count:', result.length)
    
    if (!result.length) {
      console.log('❌ No client found with email:', email.toLowerCase())
      return null
    }
    
    if (!result[0].isActive) {
      console.log('❌ Client account is inactive for:', email.toLowerCase())
      return null
    }

    const clientData = result[0]
    console.log('✅ Client found:', clientData.authEmail, 'Active:', clientData.isActive)
    
    console.log('🔐 Verifying password...')
    const isPasswordValid = await verifyPassword(password, clientData.passwordHash)
    console.log('🔐 Password verification result:', isPasswordValid)
    
    if (!isPasswordValid) {
      console.log('❌ Invalid password for:', email.toLowerCase())
      return null
    }

    console.log('✅ Authentication successful for:', email.toLowerCase())

    // Update last login timestamp
    await db
      .update(clientAuth)
      .set({ lastLogin: new Date() })
      .where(eq(clientAuth.id, clientData.authId))

    return {
      id: clientData.client.id,
      authId: clientData.authId,
      email: clientData.authEmail,
      clientId: clientData.clientId,
      client: {
        id: clientData.client.id,
        firstName: clientData.client.firstName,
        lastName: clientData.client.lastName,
        firmId: clientData.client.firmId,
      },
    }
  } catch (error) {
    console.error('Error authenticating client:', error)
    return null
  }
}

// Create client authentication (used when inviting clients)
export async function createClientAuth(
  clientId: string,
  email: string,
  password: string,
  invitedById: string
): Promise<string> {
  const hashedPassword = await hashPassword(password)
  
  const [newAuth] = await db
    .insert(clientAuth)
    .values({
      clientId,
      email: email.toLowerCase(),
      passwordHash: hashedPassword,
      invitedById,
      isActive: true,
    })
    .returning({ id: clientAuth.id })

  return newAuth.id
}

// Generate invitation token for client (different from auth token)
export function generateInvitationToken(clientId: string, email: string): string {
  return jwt.sign(
    { clientId, email, type: 'invitation' },
    CLIENT_JWT_SECRET,
    { expiresIn: '7d' } // 7 days to accept invitation
  )
}

// Verify invitation token
export function verifyInvitationToken(token: string): { clientId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, CLIENT_JWT_SECRET) as InvitationTokenPayload
    if (decoded.type !== 'invitation') {
      return null
    }
    return { clientId: decoded.clientId, email: decoded.email }
  } catch (error) {
    console.error('Invitation token verification failed:', error)
    return null
  }
}