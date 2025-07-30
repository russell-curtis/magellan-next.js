const { drizzle } = require('drizzle-orm/neon-http');
const { neon } = require('@neondatabase/serverless');
const { user, users, userPermissions, userSetupStatus } = require('./db/schema.ts');
const { eq } = require('drizzle-orm');

require('dotenv').config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function cleanupUser() {
  const email = 'russell@me.com';
  
  try {
    console.log(`Cleaning up user: ${email}`);
    
    // Delete from userSetupStatus first (has foreign key)
    await db.delete(userSetupStatus).where(eq(userSetupStatus.userId, 'magic_1753857703450'));
    console.log('Deleted from userSetupStatus');
    
    // Delete from userPermissions
    await db.delete(userPermissions).where(eq(userPermissions.userId, 'magic_1753857703450'));
    console.log('Deleted from userPermissions');
    
    // Delete from users table
    await db.delete(users).where(eq(users.email, email));
    console.log('Deleted from users table');
    
    // Delete from user table (Better Auth)
    await db.delete(user).where(eq(user.email, email));
    console.log('Deleted from user table');
    
    console.log('Cleanup completed successfully!');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupUser();