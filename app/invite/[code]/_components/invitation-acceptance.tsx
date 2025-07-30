"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Building2, Mail, Shield, Users, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

interface InvitationAcceptanceProps {
  invitation: {
    id: string;
    firmId: string;
    email: string;
    role: string;
    personalizedMessage?: string | null;
    invitationCode: string;
    expiresAt: Date | null;
  };
  firm: {
    id: string;
    name: string;
    slug: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
  isAuthenticated: boolean;
  authenticatedUserId: string | null;
  magicLinkSession?: string | null;
  magicLinkEmail?: string | null;
}

const roleDisplayNames: Record<string, string> = {
  firm_owner: "Firm Owner",
  admin: "Administrator",
  senior_advisor: "Senior Advisor",
  advisor: "Advisor",
  junior: "Junior Advisor",
};

const roleColors: Record<string, string> = {
  firm_owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  senior_advisor: "bg-green-100 text-green-800",
  advisor: "bg-yellow-100 text-yellow-800",
  junior: "bg-gray-100 text-gray-800",
};

export function InvitationAcceptance({
  invitation,
  firm,
  isAuthenticated,
  authenticatedUserId,
  magicLinkSession,
  magicLinkEmail,
}: InvitationAcceptanceProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const router = useRouter();

  const handleAcceptInvitation = async () => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("=== FRONTEND: Starting invitation acceptance ===");
      console.log("Magic link session:", magicLinkSession);
      console.log("Magic link email:", magicLinkEmail);
      
      const response = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invitationCode: invitation.invitationCode,
          magicLinkSession: magicLinkSession,
          magicLinkEmail: magicLinkEmail,
        }),
      });

      const data = await response.json();
      console.log("=== FRONTEND: API Response ===", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to accept invitation");
      }

      // Handle successful acceptance
      console.log("=== FRONTEND: Processing response ===");
      console.log("Is magic link session?", !!magicLinkSession);
      
      if (data.authenticated) {
        // User is now authenticated - redirect to dashboard
        console.log("=== FRONTEND: User authenticated, redirecting to dashboard ===");
        router.push(data.redirectTo || "/dashboard");
      } else if (data.requiresSignIn) {
        // User needs to sign in manually
        console.log("=== FRONTEND: User needs to sign in ===");
        setSuccess(data.message || "Invitation accepted successfully! You can now sign in to access your dashboard.");
      } else {
        // Fallback: show success message
        console.log("=== FRONTEND: Fallback success message ===");
        setSuccess("Invitation accepted successfully! You can now sign in to access your dashboard.");
      }
    } catch (err) {
      console.error("=== FRONTEND: Error accepting invitation ===", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    setIsSendingMagicLink(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/magic-link", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: invitation.email,
          callbackURL: `/invite/${invitation.invitationCode}`,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to send magic link");
      }
      
      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send magic link");
    } finally {
      setIsSendingMagicLink(false);
    }
  };

  const handleSignIn = () => {
    // Redirect to sign-in with a return URL to come back to this invitation
    window.location.href = `/sign-in?returnTo=/invite/${invitation.invitationCode}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">You're Invited!</CardTitle>
          <CardDescription>
            Join {firm.name} as a team member
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Firm Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">{firm.name}</p>
                <p className="text-sm text-gray-500">@{firm.slug}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">Invited Email</p>
                <p className="text-sm text-gray-500">{invitation.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-500" />
              <div>
                <p className="font-medium">Role</p>
                <Badge className={roleColors[invitation.role] || "bg-gray-100 text-gray-800"}>
                  {roleDisplayNames[invitation.role] || invitation.role}
                </Badge>
              </div>
            </div>
          </div>

          {/* Personalized Message */}
          {invitation.personalizedMessage && (
            <>
              <Separator />
              <div>
                <p className="font-medium text-sm text-gray-700 mb-2">Personal Message</p>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                  {invitation.personalizedMessage}
                </p>
              </div>
            </>
          )}

          {/* Expiration Warning */}
          {invitation.expiresAt && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> This invitation expires on{" "}
                {new Date(invitation.expiresAt).toLocaleDateString()}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert>
              <AlertDescription className="text-green-800">
                <strong>Success!</strong> {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Magic Link Success Message */}
          {magicLinkSent && (
            <Alert>
              <Mail className="h-4 w-4" />
              <AlertDescription>
                <strong>Magic link sent!</strong> Check your email ({invitation.email}) and click the link to sign in and accept this invitation.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          {/* Action Buttons */}
          <div className="space-y-3">
            {success ? (
              <Button
                asChild
                className="w-full"
              >
                <a href={`/sign-in?message=invitation-accepted&email=${encodeURIComponent(invitation.email)}`}>
                  Continue to Sign In
                </a>
              </Button>
            ) : isAuthenticated ? (
              <Button
                onClick={handleAcceptInvitation}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? "Accepting..." : "Accept Invitation"}
              </Button>
            ) : (
              <>
                {!magicLinkSent ? (
                  <>
                    <Button 
                      onClick={handleSendMagicLink} 
                      disabled={isSendingMagicLink}
                      className="w-full"
                    >
                      {isSendingMagicLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending Magic Link...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Sign In with Magic Link
                        </>
                      )}
                    </Button>
                    
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground">Or</span>
                      </div>
                    </div>
                    
                    <Button variant="outline" onClick={handleSignIn} className="w-full">
                      Use Google Sign In
                    </Button>
                    
                    <p className="text-xs text-center text-gray-500">
                      You need to sign in with <strong>{invitation.email}</strong> to accept this invitation
                    </p>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleSendMagicLink} 
                      disabled={isSendingMagicLink}
                      variant="outline"
                      className="w-full"
                    >
                      {isSendingMagicLink ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Resend Magic Link"
                      )}
                    </Button>
                    
                    <Button variant="outline" onClick={handleSignIn} className="w-full">
                      Use Google Sign In Instead
                    </Button>
                  </>
                )}
              </>
            )}

            <Button variant="outline" className="w-full" asChild>
              <a href="/">Decline</a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}