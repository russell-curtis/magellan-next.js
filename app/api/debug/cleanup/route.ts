import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { firms, users, userPermissions, userSetupStatus } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();
    
    if (!userId) {
      return NextResponse.json(
        { error: "userId required" },
        { status: 400 }
      );
    }

    console.log("Cleaning up user:", userId);

    // Delete user-related records in order
    try {
      await db.delete(userPermissions).where(eq(userPermissions.userId, userId));
      console.log("Deleted user permissions");
    } catch (e) {
      console.log("No user permissions to delete or error:", e);
    }

    try {
      await db.delete(userSetupStatus).where(eq(userSetupStatus.userId, userId));
      console.log("Deleted user setup status");
    } catch (e) {
      console.log("No user setup status to delete or error:", e);
    }

    try {
      await db.delete(users).where(eq(users.id, userId));
      console.log("Deleted user record");
    } catch (e) {
      console.log("No user record to delete or error:", e);
    }
    
    // Clean up orphaned firms
    try {
      const allFirms = await db.select().from(firms);
      console.log("Found firms:", allFirms.length);
      
      for (const firm of allFirms) {
        const firmUsers = await db.select().from(users).where(eq(users.firmId, firm.id));
        if (firmUsers.length === 0) {
          await db.delete(firms).where(eq(firms.id, firm.id));
          console.log("Deleted orphaned firm:", firm.name);
        }
      }
    } catch (e) {
      console.log("Error cleaning up firms:", e);
    }

    return NextResponse.json({
      success: true,
      message: "Cleanup completed",
    });
  } catch (error) {
    console.error("Error cleaning up:", error);
    return NextResponse.json(
      { error: `Failed to cleanup: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}