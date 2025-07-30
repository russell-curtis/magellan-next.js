import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, callbackURL } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    console.log(`Sending magic link to: ${email}`);
    console.log(`Callback URL: ${callbackURL}`);

    // Generate a magic link token
    const token = crypto.randomBytes(32).toString('hex');
    
    // Use the correct origin from the request
    const origin = request.nextUrl.origin;
    console.log("Request origin:", origin);
    
    const magicLinkUrl = `${origin}/api/auth/magic-link/verify?token=${token}&callbackURL=${encodeURIComponent(callbackURL || '/dashboard')}`;

    console.log(`Magic link URL: ${magicLinkUrl}`);

    // Send email with the magic link
    try {
      const emailResponse = await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: email,
          subject: 'Sign in to CRBI Advisory',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Sign in to CRBI Advisory</h2>
              <p>Click the button below to sign in to your account:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${magicLinkUrl}" 
                   style="background-color: #007bff; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block;">
                  Sign In
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                This link will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
              </p>
              <p style="color: #666; font-size: 12px;">
                Or copy and paste this URL: ${magicLinkUrl}
              </p>
            </div>
          `,
        }),
      });

      if (!emailResponse.ok) {
        console.error('Failed to send email:', await emailResponse.text());
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError);
    }

    return NextResponse.json({
      message: "Magic link sent successfully",
      email: email,
    });

  } catch (error) {
    console.error("Error sending magic link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}