import { db } from "@/db/drizzle";
import { users, userPermissions, firms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { UserRole } from "@/db/schema";

export interface UserWithPermissions {
  id: string;
  firmId: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  permissions: {
    canManageClients: boolean;
    canManageApplications: boolean;
    canManageDocuments: boolean;
    canManageTeam: boolean;
    canManageFirmSettings: boolean;
    canViewAnalytics: boolean;
    canManageTasks: boolean;
    canAccessBilling: boolean;
    maxClientsLimit: number | null;
    maxApplicationsLimit: number | null;
  };
  firm: {
    id: string;
    name: string;
    slug: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}

/**
 * Get user with their permissions and firm information
 */
export async function getUserWithPermissions(userId: string): Promise<UserWithPermissions | null> {
  try {
    const result = await db
      .select({
        user: users,
        permissions: userPermissions,
        firm: firms,
      })
      .from(users)
      .leftJoin(userPermissions, eq(users.id, userPermissions.userId))
      .leftJoin(firms, eq(users.firmId, firms.id))
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0 || !result[0].user || !result[0].firm) {
      return null;
    }

    const { user, permissions, firm } = result[0];

    return {
      id: user.id,
      firmId: user.firmId,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      isActive: user.isActive,
      permissions: {
        canManageClients: permissions?.canManageClients ?? true,
        canManageApplications: permissions?.canManageApplications ?? true,
        canManageDocuments: permissions?.canManageDocuments ?? true,
        canManageTeam: permissions?.canManageTeam ?? false,
        canManageFirmSettings: permissions?.canManageFirmSettings ?? false,
        canViewAnalytics: permissions?.canViewAnalytics ?? true,
        canManageTasks: permissions?.canManageTasks ?? true,
        canAccessBilling: permissions?.canAccessBilling ?? false,
        maxClientsLimit: permissions?.maxClientsLimit ?? null,
        maxApplicationsLimit: permissions?.maxApplicationsLimit ?? null,
      },
      firm: {
        id: firm.id,
        name: firm.name,
        slug: firm.slug,
        subscriptionTier: firm.subscriptionTier || "starter",
        subscriptionStatus: firm.subscriptionStatus || "trial",
      },
    };
  } catch (error) {
    console.error("Error fetching user with permissions:", error);
    return null;
  }
}

/**
 * Check if user has a specific permission
 */
export async function hasPermission(
  userId: string,
  permission: keyof UserWithPermissions['permissions']
): Promise<boolean> {
  try {
    const userWithPermissions = await getUserWithPermissions(userId);
    if (!userWithPermissions) return false;

    return userWithPermissions.permissions[permission] === true;
  } catch (error) {
    console.error("Error checking permission:", error);
    return false;
  }
}

/**
 * Check if user belongs to a specific firm
 */
export async function belongsToFirm(userId: string, firmId: string): Promise<boolean> {
  try {
    const user = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.firmId, firmId)))
      .limit(1);

    return user.length > 0;
  } catch (error) {
    console.error("Error checking firm membership:", error);
    return false;
  }
}

/**
 * Check if user can manage another user (based on role hierarchy)
 */
export function canManageUser(managerRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    firm_owner: 5,
    admin: 4,
    senior_advisor: 3,
    advisor: 2,
    junior: 1,
  };

  return roleHierarchy[managerRole] > roleHierarchy[targetRole];
}

/**
 * Get all users in the same firm
 */
export async function getFirmUsers(firmId: string): Promise<UserWithPermissions[]> {
  try {
    const result = await db
      .select({
        user: users,
        permissions: userPermissions,
        firm: firms,
      })
      .from(users)
      .leftJoin(userPermissions, eq(users.id, userPermissions.userId))
      .leftJoin(firms, eq(users.firmId, firms.id))
      .where(eq(users.firmId, firmId));

    return result
      .filter(r => r.user && r.firm)
      .map(({ user, permissions, firm }) => ({
        id: user!.id,
        firmId: user!.firmId,
        email: user!.email,
        name: user!.name,
        role: user!.role as UserRole,
        isActive: user!.isActive,
        permissions: {
          canManageClients: permissions?.canManageClients ?? true,
          canManageApplications: permissions?.canManageApplications ?? true,
          canManageDocuments: permissions?.canManageDocuments ?? true,
          canManageTeam: permissions?.canManageTeam ?? false,
          canManageFirmSettings: permissions?.canManageFirmSettings ?? false,
          canViewAnalytics: permissions?.canViewAnalytics ?? true,
          canManageTasks: permissions?.canManageTasks ?? true,
          canAccessBilling: permissions?.canAccessBilling ?? false,
          maxClientsLimit: permissions?.maxClientsLimit ?? null,
          maxApplicationsLimit: permissions?.maxApplicationsLimit ?? null,
        },
        firm: {
          id: firm!.id,
          name: firm!.name,
          slug: firm!.slug,
          subscriptionTier: firm!.subscriptionTier || "starter",
          subscriptionStatus: firm!.subscriptionStatus || "trial",
        },
      }));
  } catch (error) {
    console.error("Error fetching firm users:", error);
    return [];
  }
}

/**
 * Check if user has reached their limits
 */
export async function hasReachedLimit(
  userId: string,
  limitType: 'clients' | 'applications'
): Promise<{ hasReached: boolean; current: number; limit: number | null }> {
  try {
    const userWithPermissions = await getUserWithPermissions(userId);
    if (!userWithPermissions) {
      return { hasReached: true, current: 0, limit: 0 };
    }

    const limit = limitType === 'clients' 
      ? userWithPermissions.permissions.maxClientsLimit
      : userWithPermissions.permissions.maxApplicationsLimit;

    // If limit is null, it means unlimited
    if (limit === null) {
      return { hasReached: false, current: 0, limit: null };
    }

    // TODO: Get actual current count from clients/applications tables
    // For now, return placeholder values
    const current = 0; // This should be replaced with actual count query

    return {
      hasReached: current >= limit,
      current,
      limit,
    };
  } catch (error) {
    console.error("Error checking limits:", error);
    return { hasReached: true, current: 0, limit: 0 };
  }
}

// Re-export role info from separate file to avoid database imports on client
export { ROLE_INFO, PERMISSION_INFO } from "./role-info";