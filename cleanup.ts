import { db } from '@/db/drizzle';
import { user, users, userPermissions, userSetupStatus } from '@/db/schema';
import { eq } from 'drizzle-orm';

const email = 'russell@me.com';

async function cleanup() {
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

cleanup();