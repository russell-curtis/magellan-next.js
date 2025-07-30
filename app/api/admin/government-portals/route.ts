// Government Portal Management API
// Admin endpoints for managing and testing government portal integrations

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { headers } from 'next/headers'
import { db } from '@/db/drizzle'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { governmentPortalRegistry } from '@/lib/services/government-portal-integration'

// ============================================================================
// GET - List all registered government portals
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can access portal management
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const testConnections = searchParams.get('test') === 'true'

    // Get all registered portals
    const registeredPortals = governmentPortalRegistry.getRegisteredPortals()
    
    // Optionally test connections
    let portalStatuses = registeredPortals
    if (testConnections) {
      console.log('Testing portal connections...')
      portalStatuses = await Promise.all(
        registeredPortals.map(async (portal) => {
          try {
            const testResult = await governmentPortalRegistry.testPortalConnection(portal.countryCode)
            return {
              ...portal,
              connectionTest: {
                success: testResult.success,
                responseTime: testResult.responseTime,
                error: testResult.error,
                testedAt: new Date().toISOString()
              }
            }
          } catch (error) {
            return {
              ...portal,
              connectionTest: {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                testedAt: new Date().toISOString()
              }
            }
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      portals: portalStatuses,
      totalPortals: registeredPortals.length,
      connectionsTestedAt: testConnections ? new Date().toISOString() : null
    })

  } catch (error) {
    console.error('Error retrieving portal information:', error)
    return NextResponse.json(
      { error: 'Failed to retrieve portal information' },
      { status: 500 }
    )
  }
}

// ============================================================================
// POST - Test specific portal connection
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user details - only admins can test portal connections
    const user = await db
      .select({ id: users.id, role: users.role, firmId: users.firmId })
      .from(users)
      .where(eq(users.id, session.session.userId))
      .limit(1)

    if (!user.length || user[0].role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { countryCode, testType = 'connection' } = body

    if (!countryCode) {
      return NextResponse.json(
        { error: 'Country code is required' },
        { status: 400 }
      )
    }

    const portalAdapter = governmentPortalRegistry.getPortalAdapter(countryCode)
    const portalConfig = governmentPortalRegistry.getPortalConfig(countryCode)

    if (!portalAdapter || !portalConfig) {
      return NextResponse.json(
        { error: `No portal registered for country code: ${countryCode}` },
        { status: 404 }
      )
    }

    let testResult: Record<string, unknown> = {}

    switch (testType) {
      case 'connection':
        // Test basic connection and authentication
        testResult = await governmentPortalRegistry.testPortalConnection(countryCode)
        break

      case 'authentication':
        // Test authentication only
        try {
          const startTime = Date.now()
          const authResult = await portalAdapter.authenticate()
          testResult = {
            success: authResult.success,
            responseTime: Date.now() - startTime,
            error: authResult.error,
            accessToken: authResult.accessToken ? 'Present' : 'Missing',
            expiresAt: authResult.expiresAt?.toISOString()
          }
        } catch (error) {
          testResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
        break

      case 'status_check':
        // Test status checking with a mock reference number
        try {
          const authResult = await portalAdapter.authenticate()
          if (!authResult.success) {
            testResult = {
              success: false,
              error: 'Authentication failed for status check test'
            }
          } else {
            const mockReferenceNumber = 'TEST-STATUS-CHECK-123'
            const startTime = Date.now()
            const statusResult = await portalAdapter.checkApplicationStatus(
              mockReferenceNumber,
              authResult.accessToken!
            )
            testResult = {
              success: true,
              responseTime: Date.now() - startTime,
              statusResponse: statusResult,
              note: 'This was a test with mock reference number'
            }
          }
        } catch (error) {
          testResult = {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid test type. Use: connection, authentication, or status_check' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      countryCode,
      portalName: portalConfig.portalName,
      testType,
      testResult,
      testedAt: new Date().toISOString(),
      testedBy: session.session.userId
    })

  } catch (error) {
    console.error('Error testing portal connection:', error)
    return NextResponse.json(
      { error: 'Failed to test portal connection' },
      { status: 500 }
    )
  }
}