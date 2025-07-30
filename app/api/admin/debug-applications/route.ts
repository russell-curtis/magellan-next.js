import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications } from '@/db/schema'
import { eq, or } from 'drizzle-orm'

export async function GET() {
  try {
    console.log('🔍 Debugging specific applications...')
    
    // Get the specific applications from console logs
    const specificApps = await db
      .select()
      .from(applications)
      .where(or(
        eq(applications.id, '472b14b4-dd08-46d2-9007-6ec1550bf5b3'),
        eq(applications.id, 'ab4c82d5-d3e8-4663-84b8-095e191ff3ac')
      ))
    
    console.log('Specific application data:', specificApps)
    
    // Also get all apps for current firm
    const firmApps = await db
      .select()
      .from(applications)
      .where(eq(applications.firmId, '71bb341c-96cd-49b3-aad7-c34302d41a9a'))
    
    console.log('Firm applications:', firmApps)
    
    return NextResponse.json({
      success: true,
      specificApps,
      firmApps,
      specificCount: specificApps.length,
      firmCount: firmApps.length
    })
    
  } catch (error) {
    console.error('Error debugging applications:', error)
    return NextResponse.json(
      { error: 'Failed to debug applications' },
      { status: 500 }
    )
  }
}