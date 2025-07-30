import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserWithPermissions, canManageUser } from "@/lib/permissions";
import { db } from "@/db/drizzle";
import { firmInvitations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    console.log("=== TEAM INVITE API CALLED ===");
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.session?.userId) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("Getting user permissions...");
    const currentUser = await getUserWithPermissions(session.session.userId);
    console.log("Current user object:", JSON.stringify(currentUser, null, 2));

    if (!currentUser) {
      console.log("Current user not found");
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has permission to manage team
    if (!currentUser.permissions.canManageTeam) {
      console.log("User lacks team management permissions");
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    console.log("Parsing request body...");
    const body = await request.json();
    console.log("Request body:", body);
    const { email, role, personalizedMessage, firmId } = body;

    if (!email || !role || !firmId) {
      return NextResponse.json(
        { error: "Email, role, and firm ID are required" },
        { status: 400 }
      );
    }

    // Verify the firm ID matches the current user's firm
    if (firmId !== currentUser.firmId) {
      return NextResponse.json(
        { error: "Cannot invite users to a different firm" },
        { status: 403 }
      );
    }

    // Check if current user can assign this role based on hierarchy
    if (!canManageUser(currentUser.role, role)) {
      return NextResponse.json(
        { error: "Cannot assign a role at or above your level" },
        { status: 403 }
      );
    }

    // Check if user with this email already exists in the firm
    const existingUser = await db
      .select()
      .from(users)
      .where(and(eq(users.email, email), eq(users.firmId, firmId)))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "A user with this email already exists in your firm" },
        { status: 400 }
      );
    }

    // Check if there's already a pending invitation for this email and firm
    const existingInvitation = await db
      .select()
      .from(firmInvitations)
      .where(
        and(
          eq(firmInvitations.email, email),
          eq(firmInvitations.firmId, firmId),
          eq(firmInvitations.status, "pending")
        )
      )
      .limit(1);

    if (existingInvitation.length > 0) {
      return NextResponse.json(
        { error: "An invitation for this email is already pending" },
        { status: 400 }
      );
    }

    // Generate invitation code and create invitation record
    console.log("Creating invitation...");
    const invitationCode = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

    const invitationId = crypto.randomUUID();

    console.log("Inserting invitation into database...");
    await db.insert(firmInvitations).values({
      id: invitationId,
      firmId,
      invitedById: currentUser.id,
      email,
      role,
      invitationCode,
      personalizedMessage: personalizedMessage || null,
      status: "pending",
      expiresAt,
      createdAt: new Date(),
    });

    console.log("Invitation created successfully:", invitationId);

    // TODO: Send email notification here
    // For now, we'll just return success with the invitation details

    return NextResponse.json({
      message: "Invitation sent successfully",
      invitation: {
        id: invitationId,
        email,
        role,
        expiresAt,
        invitationCode, // In production, don't return this
      },
    });

  } catch (error) {
    console.error("Error sending invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}