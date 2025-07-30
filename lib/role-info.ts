/**
 * Role display names and descriptions - separate from permissions to avoid database import on client
 */
export const ROLE_INFO = {
  firm_owner: {
    name: "Firm Owner",
    description: "Full administrative control over the firm",
    color: "purple",
  },
  admin: {
    name: "Administrator", 
    description: "Senior management with team oversight",
    color: "blue",
  },
  senior_advisor: {
    name: "Senior Advisor",
    description: "Experienced advisor with mentoring capabilities",
    color: "green", 
  },
  advisor: {
    name: "Advisor",
    description: "Core advisory role with client management",
    color: "orange",
  },
  junior: {
    name: "Junior Advisor",
    description: "Entry-level role with supervised access",
    color: "gray",
  },
} as const;

/**
 * Permission display names
 */
export const PERMISSION_INFO = {
  canManageClients: "Manage Clients",
  canManageApplications: "Manage Applications", 
  canManageDocuments: "Manage Documents",
  canManageTeam: "Manage Team Members",
  canManageFirmSettings: "Manage Firm Settings",
  canViewAnalytics: "View Analytics",
  canManageTasks: "Manage Tasks",
  canAccessBilling: "Access Billing",
};