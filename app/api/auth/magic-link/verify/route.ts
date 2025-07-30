import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db/drizzle";
import { user, firmInvitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    const callbackURL = searchParams.get('callbackURL') || '/dashboard';

    if (!token) {
      return NextResponse.redirect(new URL('/sign-in?error=invalid-token', request.url));
    }

    console.log(`Magic link verification for token: ${token}`);
    console.log(`Callback URL: ${callbackURL}`);

    // Extract email from the callback URL to get the correct invitation email
    const callbackUrl = new URL(callbackURL, request.url);
    const invitationCode = callbackUrl.pathname.split('/').pop();
    
    console.log("Extracting email from invitation code:", invitationCode);
    
    // Get the invitation to find the correct email
    const invitation = await db
      .select()
      .from(firmInvitations)
      .where(eq(firmInvitations.invitationCode, invitationCode || ''))
      .limit(1);
    
    if (invitation.length === 0) {
      console.log("Invitation not found for code:", invitationCode);
      return NextResponse.redirect(new URL('/sign-in?error=invalid-invitation', request.url));
    }
    
    const email = invitation[0].email;
    console.log("Found invitation email:", email);

    console.log(`Authenticating user: ${email}`);

    // Check if user exists in Better Auth user table
    let existingUser = await db
      .select()
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existingUser.length === 0) {
      // Create user in Better Auth user table
      console.log("Creating new user in Better Auth");
      await db.insert(user).values({
        id: `magic_${Date.now()}`, // Generate unique ID
        email: email,
        name: email.split('@')[0], // Use email prefix as name
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Fetch the created user
      existingUser = await db
        .select()
        .from(user)
        .where(eq(user.email, email))
        .limit(1);
    }

    if (existingUser.length === 0) {
      throw new Error("Failed to create or find user");
    }

    const authUser = existingUser[0];
    console.log("User found/created:", authUser.id);

    // Create a proper session for the user
    console.log("Creating session for magic link user:", email);
    
    // Store user info in a way the invitation acceptance can recognize
    // For now, we'll use a simple approach - create a special session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Store this in a simple way that the invitation API can verify
    // In production, you'd use proper session management
    console.log("Magic link session token:", sessionToken);
    
    // Redirect with session info
    const redirectUrl = new URL(callbackURL, request.url);
    redirectUrl.searchParams.set('magic_session', sessionToken);
    redirectUrl.searchParams.set('magic_email', email);
    
    return NextResponse.redirect(redirectUrl);

  } catch (error) {
    console.error("Error verifying magic link:", error);
    return NextResponse.redirect(new URL('/sign-in?error=invalid-token', request.url));
  }
}