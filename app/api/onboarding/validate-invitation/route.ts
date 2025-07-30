import { db } from "@/db/drizzle";
import { firmInvitations, firms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { invitationCode, userEmail } = await request.json();

    if (!invitationCode || !userEmail) {
      return NextResponse.json(
        { error: "Invitation code and email are required" },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db
      .select({
        invitation: firmInvitations,
        firm: firms,
      })
      .from(firmInvitations)
      .leftJoin(firms, eq(firmInvitations.firmId, firms.id))
      .where(
        and(
          eq(firmInvitations.invitationCode, invitationCode),
          eq(firmInvitations.status, "pending")
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired invitation code" },
        { status: 404 }
      );
    }

    const invitationData = invitation[0];

    // Check if invitation is expired
    if (new Date() > invitationData.invitation.expiresAt) {
      // Update invitation status to expired
      await db
        .update(firmInvitations)
        .set({ status: "expired" })
        .where(eq(firmInvitations.id, invitationData.invitation.id));

      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 400 }
      );
    }

    // Check if the email matches the invitation
    if (invitationData.invitation.email.toLowerCase() !== userEmail.toLowerCase()) {
      return NextResponse.json(
        { error: "This invitation was sent to a different email address" },
        { status: 400 }
      );
    }

    // Return the validated invitation data
    return NextResponse.json({
      success: true,
      firm: invitationData.firm,
      role: invitationData.invitation.role,
      invitation: {
        id: invitationData.invitation.id,
        personalMessage: invitationData.invitation.personalMessage,
      },
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}