import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const userId = searchParams.get('userId');

    if (!email || !userId) {
      return NextResponse.redirect(new URL('/sign-in?error=invalid-params', request.url));
    }

    console.log(`Completing magic login for: ${email}, userId: ${userId}`);

    try {
      // Use Better Auth's signIn method to create a proper session
      const result = await auth.api.signInEmail({
        body: {
          email: email,
          password: "magic-link-bypass", // This won't be used
        },
        headers: request.headers,
        asResponse: true,
      });

      console.log("Better Auth sign-in result:", !!result);

      // If successful, redirect to dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url));
    } catch (signInError) {
      console.error("Failed to sign in with Better Auth:", signInError);
      
      // Alternative approach: redirect to sign-in page with email pre-filled
      return NextResponse.redirect(new URL(`/sign-in?email=${encodeURIComponent(email)}&message=invitation-accepted`, request.url));
    }

  } catch (error) {
    console.error("Error completing magic login:", error);
    return NextResponse.redirect(new URL('/sign-in?error=login-failed', request.url));
  }
}