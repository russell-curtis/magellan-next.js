import { auth } from "@/lib/auth";
import { getUserWithPermissions } from "@/lib/permissions";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { TeamManagementWrapper } from "./_components/team-management-wrapper";

export default async function TeamManagementPage() {
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  // Get user with permissions
  const userWithPermissions = await getUserWithPermissions(result.session.userId);

  if (!userWithPermissions) {
    redirect("/dashboard");
  }

  // Check if user has permission to manage team
  if (!userWithPermissions.permissions.canManageTeam) {
    redirect("/dashboard");
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full">
        <div className="flex flex-col items-start justify-center gap-2 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">
            Team Management
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your firm's team members, roles, and permissions
          </p>
        </div>

        <TeamManagementWrapper 
          currentUser={userWithPermissions}
        />
      </div>
    </section>
  );
}