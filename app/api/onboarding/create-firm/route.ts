import { db } from "@/db/drizzle";
import { firms, users, userPermissions, userSetupStatus, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  let userId: string, userEmail: string, firmData: any;
  
  try {
    console.log("=== CREATE FIRM API CALLED ===");
    const body = await request.json();
    console.log("Request body:", body);
    
    ({ userId, userEmail, firmData } = body);

    console.log("Validating input data...");
    if (!userId || !userEmail || !firmData) {
      console.log("Missing data:", { userId: !!userId, userEmail: !!userEmail, firmData: !!firmData });
      return NextResponse.json(
        { error: "Missing required data" },
        { status: 400 }
      );
    }

    // Validate firm data
    console.log("Validating firm data...");
    if (!firmData.name || !firmData.slug) {
      console.log("Missing firm data:", { name: !!firmData.name, slug: !!firmData.slug });
      return NextResponse.json(
        { error: "Firm name and slug are required" },
        { status: 400 }
      );
    }

    // Check if slug is already taken
    console.log("Checking slug availability...");
    const existingFirm = await db
      .select()
      .from(firms)
      .where(eq(firms.slug, firmData.slug))
      .limit(1);

    if (existingFirm.length > 0) {
      console.log("Slug already taken:", firmData.slug);
      return NextResponse.json(
        { error: "This firm URL slug is already taken. Please choose a different one." },
        { status: 400 }
      );
    }

    // Get user name from Better Auth user table
    console.log("Fetching user data...");
    const userRecord = await db
      .select()
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (userRecord.length === 0) {
      console.log("User not found:", userId);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    console.log("User found:", userRecord[0].name);

    // Create operations sequentially (no transaction support in neon-http)
    console.log("Creating firm...");
    const newFirms = await db
      .insert(firms)
      .values({
        name: firmData.name,
        slug: firmData.slug,
        subscriptionTier: firmData.subscriptionTier || "starter",
        subscriptionStatus: "trial",
        settings: firmData.settings || {},
      })
      .returning();

    const createdFirm = newFirms[0];
    console.log("Firm created:", createdFirm.id);

    // Check if user already exists, if so update them instead of creating
    console.log("Checking if user exists...");
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    let createdUser;
    if (existingUser.length > 0) {
      console.log("Updating existing user...");
      const updatedUsers = await db
        .update(users)
        .set({
          firmId: createdFirm.id,
          email: userEmail,
          name: userRecord[0].name,
          role: "firm_owner",
          isActive: true,
        })
        .where(eq(users.id, userId))
        .returning();
      createdUser = updatedUsers[0];
    } else {
      console.log("Creating new user...");
      const newUsers = await db
        .insert(users)
        .values({
          id: userId, // Better Auth user ID
          firmId: createdFirm.id,
          email: userEmail,
          name: userRecord[0].name,
          role: "firm_owner",
          isActive: true,
        })
        .returning();
      createdUser = newUsers[0];
    }
    console.log("User ready:", createdUser.id);

    // Create or update permissions for the firm owner
    console.log("Creating/updating permissions...");
    const existingPermissions = await db
      .select()
      .from(userPermissions)
      .where(eq(userPermissions.userId, userId))
      .limit(1);

    if (existingPermissions.length > 0) {
      await db
        .update(userPermissions)
        .set({
          firmId: createdFirm.id,
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
          grantedById: createdUser.id,
        })
        .where(eq(userPermissions.userId, userId));
    } else {
      await db
        .insert(userPermissions)
        .values({
          userId: createdUser.id,
          firmId: createdFirm.id,
          canManageClients: true,
          canManageApplications: true,
          canManageDocuments: true,
          canManageTeam: true,
          canManageFirmSettings: true,
          canViewAnalytics: true,
          canManageTasks: true,
          canAccessBilling: true,
          maxClientsLimit: null, // Unlimited
          maxApplicationsLimit: null, // Unlimited
          grantedById: createdUser.id, // Self-granted
        });
    }

    console.log("Permissions ready");

    // Update or create user setup status
    console.log("Updating setup status...");
    const existingSetup = await db
      .select()
      .from(userSetupStatus)
      .where(eq(userSetupStatus.userId, userId))
      .limit(1);

    if (existingSetup.length > 0) {
      await db
        .update(userSetupStatus)
        .set({
          hasJoinedFirm: true,
          onboardingStep: "role_assignment",
          firmId: createdFirm.id,
          roleInFirm: "firm_owner",
          onboardingData: {
            firmChoice: "create",
            firmData: createdFirm,
          },
          updatedAt: new Date(),
        })
        .where(eq(userSetupStatus.userId, userId));
    } else {
      await db
        .insert(userSetupStatus)
        .values({
          userId: userId,
          hasCompletedOnboarding: false,
          hasJoinedFirm: true,
          onboardingStep: "role_assignment",
          firmId: createdFirm.id,
          roleInFirm: "firm_owner",
          onboardingData: {
            firmChoice: "create",
            firmData: createdFirm,
          },
        });
    }

    console.log("Setup status updated");
    const result = { firm: createdFirm, user: createdUser };

    return NextResponse.json({
      success: true,
      firm: result.firm,
      user: result.user,
    });

  } catch (error) {
    console.error("Error creating firm:", error);
    console.error("Request data:", { userId, userEmail, firmData });
    
    // Handle specific database errors
    if (error instanceof Error && error.message.includes("unique constraint")) {
      return NextResponse.json(
        { error: "This firm name or slug is already taken" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}