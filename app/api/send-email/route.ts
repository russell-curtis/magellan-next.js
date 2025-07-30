import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

// Initialize Resend with API key only if available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    // For development, if no RESEND_API_KEY is set, just log the email
    if (!resend) {
      console.log("=== EMAIL SIMULATION (No RESEND_API_KEY) ===");
      console.log(`To: ${to}`);
      console.log(`Subject: ${subject}`);
      console.log("HTML Content:");
      console.log(html);
      console.log("=== END EMAIL ===");
      
      return NextResponse.json({
        message: "Email simulated (check console)",
        id: "simulated-" + Date.now(),
      });
    }

    // Send actual email with Resend
    const data = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com",
      to: [to],
      subject: subject,
      html: html,
    });

    console.log(`Email sent successfully to ${to}, ID: ${data.id}`);

    return NextResponse.json({
      message: "Email sent successfully",
      id: data.id,
    });

  } catch (error) {
    console.error("Error sending email:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}