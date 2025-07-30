import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWithPermissions, canManageUser } from "@/lib/permissions";
import { db } from "@/db/drizzle";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.session?.userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const currentUser = await getUserWithPermissions(session.session.userId);

    if (!currentUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to manage team
    if (!currentUser.permissions.canManageTeam) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Prevent user from deactivating themselves
    if (userId === currentUser.id) {
      return NextResponse.json(
        { error: "Cannot deactivate yourself" },
        { status: 400 }
      );
    }

    // Get the target user to check their role and firm membership
    const targetUser = await getUserWithPermissions(userId);

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found" },
        { status: 404 }
      );
    }

    // Verify both users belong to the same firm
    if (currentUser.firmId !== targetUser.firmId) {
      return NextResponse.json(
        { error: "Cannot manage users from different firms" },
        { status: 403 }
      );
    }

    // Check if current user can manage the target user based on role hierarchy
    if (!canManageUser(currentUser.role, targetUser.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions to manage this user" },
        { status: 403 }
      );
    }

    // Deactivate the user
    await db
      .update(users)
      .set({ 
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(users.id, userId),
          eq(users.firmId, currentUser.firmId)
        )
      );

    return NextResponse.json({
      message: "User deactivated successfully",
      userId,
    });

  } catch (error) {
    console.error("Error deactivating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}