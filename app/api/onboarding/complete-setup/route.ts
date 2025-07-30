import { db } from "@/db/drizzle";
import { users, userPermissions, userSetupStatus, firmInvitations, firms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { UserRole } from "@/db/schema";

// Define default permissions for each role
const getDefaultPermissions = (role: UserRole) => {
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
        maxClientsLimit: null,
        maxApplicationsLimit: null,
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
        maxClientsLimit: 50,
        maxApplicationsLimit: 100,
      };
    case "junior":
      return {
        canManageClients: false,
        canManageApplications: false,
        canManageDocuments: true,
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
        canManageClients: true,
        canManageApplications: true,
        canManageDocuments: true,
        canManageTeam: false,
        canManageFirmSettings: false,
        canViewAnalytics: false,
        canManageTasks: true,
        canAccessBilling: false,
        maxClientsLimit: 50,
        maxApplicationsLimit: 100,
      };
  }
};

export async function POST(request: NextRequest) {
  try {
    console.log("=== COMPLETE SETUP API CALLED ===");
    const body = await request.json();
    console.log("Request body:", body);
    
    let { 
      userId, 
      firmData, 
      selectedRole, 
      firmChoice, 
      invitationCode 
    } = body;

    console.log("Parsed data:", { userId, selectedRole, firmChoice, hasInvitationCode: !!invitationCode, hasFirmData: !!firmData });

    if (!userId || !selectedRole) {
      console.log("Missing required data");
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Handle edge case where firmChoice is empty - check if user already exists in a firm
    if (!firmChoice || firmChoice === "") {
      console.log("firmChoice is empty, checking user's existing firm membership...");
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);
      
      if (existingUser.length > 0 && existingUser[0].firmId) {
        console.log("User already has a firm, treating as create path");
        firmChoice = "create";
        // Get the firm data to complete the setup
        const userFirm = await db
          .select()
          .from(firms)
          .where(eq(firms.id, existingUser[0].firmId))
          .limit(1);
        
        if (userFirm.length > 0) {
          firmData = userFirm[0];
        }
      }
    }

    // Handle different setup paths
    if (firmChoice === "join" && invitationCode) {
      // User is joining an existing firm via invitation
      console.log("Completing join firm setup...");
      
      // Find and validate the invitation again
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
        throw new Error("Invalid invitation");
      }

      const invitationData = invitation[0];

      // Create user record
      await db
        .insert(users)
        .values({
          id: userId,
          firmId: invitationData.firmId,
          email: invitationData.email,
          name: "New User", // Will be updated with actual name from auth session
          role: selectedRole,
          isActive: true,
        });

      // Create user permissions based on role
      const permissions = getDefaultPermissions(selectedRole);
      await db
        .insert(userPermissions)
        .values({
          userId: userId,
          firmId: invitationData.firmId,
          ...permissions,
          grantedById: invitationData.invitedById,
        });

      // Mark invitation as accepted
      await db
        .update(firmInvitations)
        .set({
          status: "accepted",
          acceptedAt: new Date(),
          acceptedById: userId,
        })
        .where(eq(firmInvitations.id, invitationData.id));

      // Complete user setup
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
            hasJoinedFirm: true,
            onboardingStep: "completed",
            firmId: invitationData.firmId,
            roleInFirm: selectedRole,
            updatedAt: new Date(),
          })
          .where(eq(userSetupStatus.userId, userId));
      } else {
        await db
          .insert(userSetupStatus)
          .values({
            userId: userId,
            hasCompletedOnboarding: true,
            hasJoinedFirm: true,
            onboardingStep: "completed",
            firmId: invitationData.firmId,
            roleInFirm: selectedRole,
          });
      }

    } else if (firmChoice === "create" && firmData) {
      // User created a firm and is setting their role (should be firm_owner)
      console.log("Completing firm creation setup...");
      
      // Update user record with selected role (should already exist from create-firm)
      console.log("Updating user role...");
      await db
        .update(users)
        .set({ role: selectedRole })
        .where(eq(users.id, userId));

      // Update permissions if role changed from default
      console.log("Updating permissions...");
      const permissions = getDefaultPermissions(selectedRole);
      await db
        .update(userPermissions)
        .set(permissions)
        .where(eq(userPermissions.userId, userId));

      // Mark setup as completed
      console.log("Marking setup as completed...");
      await db
        .update(userSetupStatus)
        .set({
          hasCompletedOnboarding: true,
          onboardingStep: "completed",
          roleInFirm: selectedRole,
          updatedAt: new Date(),
        })
        .where(eq(userSetupStatus.userId, userId));
      
      console.log("Setup completion finished");

    } else {
      return NextResponse.json(
        { error: "Invalid setup configuration" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Setup completed successfully",
    });

  } catch (error) {
    console.error("Error completing setup:", error);
    console.error("Request data:", { userId, firmData, selectedRole, firmChoice, invitationCode });
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}