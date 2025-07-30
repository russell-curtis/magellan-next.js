import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { userSetupStatus, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
// Components imported in DashboardWrapper
import { DashboardWrapper } from "./_components/dashboard-wrapper";

export default async function Dashboard() {
  const result = await auth.api.getSession({
    headers: await headers(), // you need to pass the headers object.
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  // Check if user has completed onboarding
  const setupStatus = await db
    .select()
    .from(userSetupStatus)
    .where(eq(userSetupStatus.userId, result.session.userId))
    .limit(1);

  // If no setup status record exists, or onboarding is not completed, redirect to onboarding
  if (setupStatus.length === 0 || !setupStatus[0].hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  // Check if user exists in the users table (they should after onboarding)
  const userRecord = await db
    .select()
    .from(users)
    .where(eq(users.id, result.session.userId))
    .limit(1);

  if (userRecord.length === 0) {
    // User completed onboarding but no user record exists - redirect to onboarding
    redirect("/onboarding");
  }

  return <DashboardWrapper userId={result.session.userId} userRole={userRecord[0].role} firmId={userRecord[0].firmId} />;
}
