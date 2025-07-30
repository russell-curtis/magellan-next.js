import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getFirmUsers, getUserWithPermissions } from "@/lib/permissions";

export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const firmId = url.searchParams.get("firmId");

    if (!firmId) {
      return NextResponse.json(
        { error: "Firm ID is required" },
        { status: 400 }
      );
    }

    // Verify user belongs to the firm they're trying to access
    if (currentUser.firmId !== firmId) {
      return NextResponse.json(
        { error: "Access denied to this firm" },
        { status: 403 }
      );
    }

    // Get all users in the firm
    const firmUsers = await getFirmUsers(firmId);

    return NextResponse.json({
      members: firmUsers,
      total: firmUsers.length,
      active: firmUsers.filter(u => u.isActive).length,
      inactive: firmUsers.filter(u => !u.isActive).length,
    });

  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}