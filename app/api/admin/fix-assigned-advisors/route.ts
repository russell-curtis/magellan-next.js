import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, users } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'

export async function POST() {
  try {
    console.log('🔧 Starting to fix assigned advisor IDs...')
    
    // Find applications with null assignedAdvisorId
    const nullAdvisorApps = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        firmId: applications.firmId,
        assignedAdvisorId: applications.assignedAdvisorId
      })
      .from(applications)
      .where(isNull(applications.assignedAdvisorId))
    
    console.log(`Found ${nullAdvisorApps.length} applications with null assignedAdvisorId`)
    
    if (nullAdvisorApps.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applications need fixing',
        fixed: 0
      })
    }
    
    let fixedCount = 0
    
    // For each application, find the firm owner/admin and assign them
    for (const app of nullAdvisorApps) {
      console.log(`Fixing application ${app.applicationNumber}...`)
      
      // Find a firm owner or admin for this application's firm
      const firmOwner = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(
          eq(users.firmId, app.firmId),
          eq(users.isActive, true)
        ))
        .limit(1)
      
      if (firmOwner.length > 0) {
        // Update the application with the advisor ID
        await db
          .update(applications)
          .set({ assignedAdvisorId: firmOwner[0].id })
          .where(eq(applications.id, app.id))
        
        console.log(`✅ Fixed ${app.applicationNumber} - assigned to ${firmOwner[0].id} (${firmOwner[0].role})`)
        fixedCount++
      } else {
        console.log(`⚠️ No active user found for firm ${app.firmId}`)
      }
    }
    
    console.log(`🎉 Fixed ${fixedCount} applications`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedCount} applications`,
      fixed: fixedCount,
      total: nullAdvisorApps.length
    })
    
  } catch (error) {
    console.error('Error fixing assigned advisors:', error)
    return NextResponse.json(
      { error: 'Failed to fix assigned advisors' },
      { status: 500 }
    )
  }
}