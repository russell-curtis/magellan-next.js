import { db } from "@/db/drizzle";
import { firmInvitations, firms } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { InvitationAcceptance } from "./_components/invitation-acceptance";

interface InvitePageProps {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ magic_session?: string; magic_email?: string }>;
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const { code } = await params;
  const { magic_session, magic_email } = await searchParams;

  // Check if user is already authenticated
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // Get invitation details first
  const invitation = await db
    .select({
      invitation: firmInvitations,
      firm: firms,
    })
    .from(firmInvitations)
    .leftJoin(firms, eq(firmInvitations.firmId, firms.id))
    .where(
      and(
        eq(firmInvitations.invitationCode, code),
        eq(firmInvitations.status, "pending")
      )
    )
    .limit(1);

  if (invitation.length === 0 || !invitation[0].invitation || !invitation[0].firm) {
    notFound();
  }

  const { invitation: inviteData, firm } = invitation[0];

  // Check for magic link authentication (after inviteData is defined)
  console.log("=== INVITATION PAGE DEBUG ===");
  console.log("Search params:", { magic_session, magic_email });
  console.log("Invitation data:", { email: inviteData.email, code: inviteData.invitationCode });
  console.log("Session:", session?.session?.userId);
  
  if (magic_session && magic_email) {
    console.log("Magic link user detected:", magic_email);
    console.log("Magic session:", magic_session);
    console.log("Invitation email:", inviteData.email);
    console.log("Email match:", magic_email === inviteData.email);
  } else {
    console.log("No magic link parameters found");
  }

  // Check if invitation has expired
  if (inviteData.expiresAt && new Date() > inviteData.expiresAt) {
    notFound();
  }

  // Check if this is a magic link user
  const isMagicLinkUser = magic_session && magic_email && magic_email === inviteData.email;
  console.log("isMagicLinkUser:", isMagicLinkUser);
  console.log("session?.session?.userId:", session?.session?.userId);
  
  // If user is magic link authenticated or regular authenticated
  if (isMagicLinkUser || session?.session?.userId) {
    console.log("User is authenticated, rendering acceptance component");
    return (
      <InvitationAcceptance
        invitation={inviteData}
        firm={firm}
        isAuthenticated={true}
        authenticatedUserId={session?.session?.userId || `magic_${magic_email}`}
        magicLinkSession={magic_session}
        magicLinkEmail={magic_email}
      />
    );
  }

  // User is not authenticated, show invitation details and require sign in
  console.log("User is NOT authenticated, rendering sign-in component");
  return (
    <InvitationAcceptance
      invitation={inviteData}
      firm={firm}
      isAuthenticated={false}
      authenticatedUserId={null}
    />
  );
}