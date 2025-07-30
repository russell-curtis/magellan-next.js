import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { userSetupStatus, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { OnboardingWrapper } from "./_components/onboarding-wrapper";

export default async function OnboardingPage() {
  // Get the current authenticated user
  const result = await auth.api.getSession({
    headers: await headers(),
  });

  if (!result?.session?.userId) {
    redirect("/sign-in");
  }

  // Get user information from database
  const userRecord = await db
    .select()
    .from(user)
    .where(eq(user.id, result.session.userId))
    .limit(1);

  if (userRecord.length === 0) {
    redirect("/sign-in");
  }

  // Check if user has already completed onboarding
  const setupStatus = await db
    .select()
    .from(userSetupStatus)
    .where(eq(userSetupStatus.userId, result.session.userId))
    .limit(1);

  if (setupStatus.length > 0 && setupStatus[0].hasCompletedOnboarding) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnboardingWrapper 
        userId={result.session.userId}
        userEmail={userRecord[0].email}
        userName={userRecord[0].name}
        currentStep={setupStatus[0]?.onboardingStep || "welcome"}
      />
    </div>
  );
}