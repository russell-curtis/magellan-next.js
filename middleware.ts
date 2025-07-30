import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  // Skip middleware for API routes, static files, and webhook endpoints
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/static/") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // If user is authenticated and trying to access sign-in/sign-up, redirect based on setup status
  if (sessionCookie && ["/sign-in", "/sign-up"].includes(pathname)) {
    // We'll check setup status on the client side after redirect
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // If user is not authenticated and trying to access protected routes
  if (!sessionCookie && (pathname.startsWith("/dashboard") || pathname.startsWith("/onboarding"))) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // If user is authenticated but accessing /dashboard, we need to check if they've completed onboarding
  // This will be handled by the dashboard page itself since we need database access
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/onboarding/:path*", 
    "/sign-in", 
    "/sign-up"
  ],
};
