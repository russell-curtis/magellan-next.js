import { NextResponse } from 'next/server'
import { db } from '@/db/drizzle'
import { applications, clients, users } from '@/db/schema'
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
    
    // Find clients with null assignedAdvisorId
    const nullAdvisorClients = await db
      .select({
        id: clients.id,
        firstName: clients.firstName,
        lastName: clients.lastName,
        firmId: clients.firmId,
        assignedAdvisorId: clients.assignedAdvisorId
      })
      .from(clients)
      .where(isNull(clients.assignedAdvisorId))
    
    console.log(`Found ${nullAdvisorApps.length} applications with null assignedAdvisorId`)
    console.log(`Found ${nullAdvisorClients.length} clients with null assignedAdvisorId`)
    
    if (nullAdvisorApps.length === 0 && nullAdvisorClients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No applications or clients need fixing',
        fixed: 0
      })
    }
    
    let fixedAppsCount = 0
    let fixedClientsCount = 0
    
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
        fixedAppsCount++
      } else {
        console.log(`⚠️ No active user found for firm ${app.firmId}`)
      }
    }

    // For each client, find the firm owner/admin and assign them
    for (const client of nullAdvisorClients) {
      console.log(`Fixing client ${client.firstName} ${client.lastName}...`)
      
      // Find a firm owner or admin for this client's firm
      const firmOwner = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(
          eq(users.firmId, client.firmId),
          eq(users.isActive, true)
        ))
        .limit(1)
      
      if (firmOwner.length > 0) {
        // Update the client with the advisor ID
        await db
          .update(clients)
          .set({ assignedAdvisorId: firmOwner[0].id })
          .where(eq(clients.id, client.id))
        
        console.log(`✅ Fixed ${client.firstName} ${client.lastName} - assigned to ${firmOwner[0].id} (${firmOwner[0].role})`)
        fixedClientsCount++
      } else {
        console.log(`⚠️ No active user found for firm ${client.firmId}`)
      }
    }
    
    console.log(`🎉 Fixed ${fixedAppsCount} applications and ${fixedClientsCount} clients`)
    
    return NextResponse.json({
      success: true,
      message: `Fixed ${fixedAppsCount} applications and ${fixedClientsCount} clients`,
      fixedApplications: fixedAppsCount,
      fixedClients: fixedClientsCount,
      totalApplications: nullAdvisorApps.length,
      totalClients: nullAdvisorClients.length
    })
    
  } catch (error) {
    console.error('Error fixing assigned advisors:', error)
    return NextResponse.json(
      { error: 'Failed to fix assigned advisors' },
      { status: 500 }
    )
  }
}