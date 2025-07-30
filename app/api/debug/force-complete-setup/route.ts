import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/drizzle";
import { users, userPermissions, userSetupStatus } from "@/db/schema";
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

    console.log("Force completing setup for user:", userId);

    // Update user setup status to completed
    const existingSetup = await db
      .select()
      .from(userSetupStatus)
      .where(eq(userSetupStatus.userId, userId))
      .limit(1);

    if (existingSetup.length > 0) {
      await db
        .update(userSetupStatus)
        .set({
          hasCompletedOnboarding: true,
          onboardingStep: "completed",
          updatedAt: new Date(),
        })
        .where(eq(userSetupStatus.userId, userId));
    } else {
      // Get user's firm info
      const userRecord = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (userRecord.length > 0) {
        await db
          .insert(userSetupStatus)
          .values({
            userId: userId,
            hasCompletedOnboarding: true,
            hasJoinedFirm: true,
            onboardingStep: "completed",
            firmId: userRecord[0].firmId,
            roleInFirm: userRecord[0].role,
          });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Setup force completed successfully",
    });
  } catch (error) {
    console.error("Error force completing setup:", error);
    return NextResponse.json(
      { error: `Failed to force complete: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}