import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWithPermissions } from "@/lib/permissions";
import { db } from "@/db/drizzle";
import { firmInvitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";

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

    if (!currentUser || !currentUser.permissions.canManageTeam) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    // Get all pending invitations for the user's firm
    const invitations = await db
      .select()
      .from(firmInvitations)
      .where(
        and(
          eq(firmInvitations.firmId, currentUser.firmId),
          eq(firmInvitations.status, "pending")
        )
      );

    return NextResponse.json({
      invitations: invitations.map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        invitationCode: inv.invitationCode,
        personalizedMessage: inv.personalizedMessage,
        expiresAt: inv.expiresAt,
        createdAt: inv.createdAt,
        inviteLink: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inv.invitationCode}`,
      })),
    });

  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}