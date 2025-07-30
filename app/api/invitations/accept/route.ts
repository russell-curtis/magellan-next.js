import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { firmInvitations, users, userPermissions, userSetupStatus, user, session } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { UserRole } from "@/db/schema";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    console.log("=== INVITATION ACCEPTANCE API CALLED ===");
    
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const body = await request.json();
    const { invitationCode, magicLinkSession, magicLinkEmail } = body;

    console.log("Request body:", body);

    // Allow magic link users to bypass session requirement
    if (!session?.session?.userId && !magicLinkSession) {
      console.log("No session or magic link found");
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // Log authentication method
    if (magicLinkSession) {
      console.log("Using magic link authentication for:", magicLinkEmail);
    } else {
      console.log("Using regular session authentication");
    }

    if (!invitationCode) {
      return NextResponse.json(
        { error: "Invitation code is required" },
        { status: 400 }
      );
    }

    console.log("Looking up invitation with code:", invitationCode);

    // Get the invitation details
    const invitation = await db
      .select()
      .from(firmInvitations)
      .where(
        and(
          eq(firmInvitations.invitationCode, invitationCode),
          eq(firmInvitations.status, "pending")
        )
      )
      .limit(1);

    if (invitation.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired invitation" },
        { status: 404 }
      );
    }

    const inviteData = invitation[0];

    // Check if invitation has expired
    if (inviteData.expiresAt && new Date() > inviteData.expiresAt) {
      return NextResponse.json(
        { error: "This invitation has expired" },
        { status: 410 }
      );
    }

    console.log("Invitation found:", inviteData.id);

    // Handle authentication verification
    if (magicLinkSession) {
      // Magic link authentication - verify email matches
      if (magicLinkEmail?.toLowerCase() !== inviteData.email.toLowerCase()) {
        return NextResponse.json(
          { error: "Magic link email doesn't match invitation" },
          { status: 403 }
        );
      }
      console.log("Magic link email verification passed");
    } else if (session?.session?.userId) {
      // Regular session authentication
      const authUser = await auth.api.getSession({
        headers: request.headers,
      });

      if (!authUser?.user?.email) {
        return NextResponse.json(
          { error: "Unable to verify user email" },
          { status: 400 }
        );
      }

      // Verify the authenticated user's email matches the invitation
      if (authUser.user.email.toLowerCase() !== inviteData.email.toLowerCase()) {
        return NextResponse.json(
          { error: "This invitation is for a different email address" },
          { status: 403 }
        );
      }
      console.log("Regular session email verification passed");
    }

    console.log("Email verification passed");

    let userId: string;
    let userName: string;

    if (magicLinkSession) {
      // Magic link user - generate user ID and get name from email
      userId = `magic_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
      userName = magicLinkEmail?.split('@')[0] || "Magic Link User";
      console.log("Generated magic link user ID:", userId);
    } else {
      // Regular session user
      userId = session!.session!.userId;
      const authUser = await auth.api.getSession({ headers: request.headers });
      userName = authUser?.user?.name || "Unknown User";
    }

    // Check if user already exists in the users table
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, inviteData.email))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "User with this email already belongs to a firm" },
        { status: 400 }
      );
    }

    console.log("Creating new user record");

    if (magicLinkSession) {
      // Check if user already exists in Better Auth user table
      const existingAuthUser = await db
        .select()
        .from(user)
        .where(eq(user.email, inviteData.email))
        .limit(1);

      if (existingAuthUser.length === 0) {
        // Only create if doesn't exist
        await db.insert(user).values({
          id: userId,
          email: inviteData.email,
          name: userName,
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log("Created user in Better Auth user table");
      } else {
        // Use existing user's ID to maintain foreign key relationship
        userId = existingAuthUser[0].id;
        console.log("User already exists in Better Auth user table, using existing ID:", userId);
      }
    }

    // Create user record in users table
    await db.insert(users).values({
      id: userId,
      firmId: inviteData.firmId,
      email: inviteData.email,
      name: userName,
      role: inviteData.role,
      isActive: true,
      lastLogin: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Creating user permissions");

    // Create user permissions based on role
    const permissions = getPermissionsForRole(inviteData.role as UserRole);
    await db.insert(userPermissions).values({
      userId: userId,
      firmId: inviteData.firmId,
      ...permissions,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("Creating user setup status");

    // Mark user as setup complete
    await db.insert(userSetupStatus).values({
      userId: userId,
      hasCompletedOnboarding: true,
      hasCreatedFirm: false, // They joined an existing firm
      hasSetupBilling: false,
      lastUpdated: new Date(),
    });

    console.log("Updating invitation status");

    // Update invitation status to accepted
    await db
      .update(firmInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
        acceptedById: userId,
      })
      .where(eq(firmInvitations.id, inviteData.id));

    console.log("Invitation acceptance completed successfully");

    // For magic link users, return success with sign-in redirect
    if (magicLinkSession) {
      console.log("Magic link user - invitation accepted, redirecting to sign-in");
      
      return NextResponse.json({
        message: "Invitation accepted successfully! Please sign in to access your dashboard.",
        firmId: inviteData.firmId,
        email: inviteData.email,
        requiresSignIn: true,
      });
    }

    return NextResponse.json({
      message: "Invitation accepted successfully",
      firmId: inviteData.firmId,
      redirectTo: "/dashboard",
    });

  } catch (error) {
    console.error("Error accepting invitation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function getPermissionsForRole(role: UserRole) {
  switch (role) {
    case "firm_owner":
      return {
        canManageClients: true,
        canManageApplications: true,
        canManageDocuments: true,
        canManageTeam: true,
        canManageFirmSettings: true,
        canViewAnalytics: true,
        canManageTasks: true,
        canAccessBilling: true,
        maxClientsLimit: null,
        maxApplicationsLimit: null,
      };
    case "admin":
      return {
        canManageClients: true,
        canManageApplications: true,
        canManageDocuments: true,
        canManageTeam: true,
        canManageFirmSettings: false,
        canViewAnalytics: true,
        canManageTasks: true,
        canAccessBilling: false,
        maxClientsLimit: null,
        maxApplicationsLimit: null,
      };
    case "senior_advisor":
      return {
        canManageClients: true,
        canManageApplications: true,
        canManageDocuments: true,
        canManageTeam: false,
        canManageFirmSettings: false,
        canViewAnalytics: true,
        canManageTasks: true,
        canAccessBilling: false,
        maxClientsLimit: 50,
        maxApplicationsLimit: 100,
      };
    case "advisor":
      return {
        canManageClients: true,
        canManageApplications: true,
        canManageDocuments: true,
        canManageTeam: false,
        canManageFirmSettings: false,
        canViewAnalytics: false,
        canManageTasks: true,
        canAccessBilling: false,
        maxClientsLimit: 25,
        maxApplicationsLimit: 50,
      };
    case "junior":
      return {
        canManageClients: false,
        canManageApplications: true,
        canManageDocuments: false,
        canManageTeam: false,
        canManageFirmSettings: false,
        canViewAnalytics: false,
        canManageTasks: false,
        canAccessBilling: false,
        maxClientsLimit: 10,
        maxApplicationsLimit: 25,
      };
    default:
      return {
        canManageClients: false,
        canManageApplications: false,
        canManageDocuments: false,
        canManageTeam: false,
        canManageFirmSettings: false,
        canViewAnalytics: false,
        canManageTasks: false,
        canAccessBilling: false,
        maxClientsLimit: 0,
        maxApplicationsLimit: 0,
      };
  }
}