// scripts/test-client-auth.ts
import { config } from 'dotenv'
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import { 
  clients,
  clientAuth,
  applications
} from '../db/schema'
import { eq } from 'drizzle-orm'

config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)
const db = drizzle(sql)

async function testClientAuth() {
  try {
    console.log('🔍 Testing client authentication structure...')
    
    // Get all clients
    const allClients = await db.select().from(clients).limit(5)
    console.log('\n📊 Clients in database:')
    allClients.forEach((client, i) => {
      console.log(`${i + 1}. ID: ${client.id}, Name: ${client.firstName} ${client.lastName}, Email: ${client.email}`)
    })
    
    // Get all client auth records
    const allClientAuth = await db.select().from(clientAuth).limit(5)
    console.log('\n🔐 Client Auth records:')
    allClientAuth.forEach((auth, i) => {
      console.log(`${i + 1}. Auth ID: ${auth.id}, Email: ${auth.email}, Client ID: ${auth.clientId}, Active: ${auth.isActive}`)
    })
    
    // Get all applications
    const allApplications = await db.select().from(applications).limit(5)
    console.log('\n📋 Applications in database:')
    allApplications.forEach((app, i) => {
      console.log(`${i + 1}. App ID: ${app.id}, Client ID: ${app.clientId}, Status: ${app.status}, Program: ${app.programId}`)
    })
    
    // Test if there's a specific client that has applications
    if (allApplications.length > 0) {
      const testApp = allApplications[0]
      console.log(`\n🔍 Testing with application: ${testApp.id}`)
      
      // Find the client for this application
      const [clientForApp] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, testApp.clientId))
        .limit(1)
      
      if (clientForApp) {
        console.log(`✅ Found client for application: ${clientForApp.firstName} ${clientForApp.lastName} (${clientForApp.email})`)
        
        // Find auth record for this client
        const [authForClient] = await db
          .select()
          .from(clientAuth)
          .where(eq(clientAuth.clientId, clientForApp.id))
          .limit(1)
        
        if (authForClient) {
          console.log(`✅ Found auth record: ${authForClient.email} (Auth ID: ${authForClient.id})`)
        } else {
          console.log(`❌ No auth record found for client: ${clientForApp.id}`)
        }
      } else {
        console.log(`❌ No client found for application client ID: ${testApp.clientId}`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testClientAuth()