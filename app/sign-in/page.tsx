"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState, useEffect } from "react";
import { toast } from "sonner";
import { Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Image from 'next/image';

function SignInContent() {
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");
  const message = searchParams.get("message");
  const email = searchParams.get("email");

  // Show success message if invitation was accepted
  useEffect(() => {
    if (message === "invitation-accepted") {
      toast.success("Invitation accepted successfully! Please sign in to access your dashboard.");
    }
  }, [message]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-orange-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logos/m-logo.svg"
              alt="Magellan Logo"
              width={48}
              height={34}
              className="drop-shadow-sm"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white drop-shadow-sm">
            Magellan Platform
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Sign in to your advisor account
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle className="text-lg md:text-xl text-center">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-xs md:text-sm text-center">
              Sign in to your account using Google or email
            </CardDescription>
          </CardHeader>
        <CardContent>
          {message === "invitation-accepted" && (
            <Alert className="mb-4">
              <AlertDescription>
                <strong>Success!</strong> Your invitation has been accepted. Sign in with your {email ? `email (${email})` : 'account'} to access your dashboard.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid gap-4">
            <div
              className={cn(
                "w-full gap-2 flex items-center",
                "justify-between flex-col",
              )}
            >
              <Button
                variant="outline"
                className={cn("w-full gap-2")}
                disabled={loading}
                onClick={async () => {
                  try {
                    await authClient.signIn.social(
                      {
                        provider: "google",
                        callbackURL: returnTo || "/dashboard",
                      },
                      {
                        onRequest: () => {
                          setLoading(true);
                        },
                        onResponse: () => {
                          setLoading(false);
                        },
                        onError: (ctx) => {
                          setLoading(false);
                          console.error("Sign-in failed:", ctx.error);
                        },
                      },
                    );
                  } catch (error) {
                    setLoading(false);
                    console.error("Authentication error:", error);
                    // Consider adding toast notification for user feedback
                    toast.error("Oops, something went wrong", {
                      duration: 5000,
                    });
                  }
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="0.98em"
                  height="1em"
                  viewBox="0 0 256 262"
                >
                  <path
                    fill="#4285F4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  ></path>
                  <path
                    fill="#34A853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  ></path>
                  <path
                    fill="#FBBC05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                  ></path>
                  <path
                    fill="#EB4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  ></path>
                </svg>
                Login with Google
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">Or</span>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full gap-2"
                asChild
              >
                <Link href={`/auth/magic-link${returnTo ? `?redirect=${encodeURIComponent(returnTo)}` : ''}`}>
                  <Mail className="w-4 h-4" />
                  Sign in with Email
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
        </Card>
        
        <p className="mt-6 text-xs text-center text-white/70 max-w-md">
          By signing in, you agree to our{" "}
          <Link
            href="/terms-of-service"
            className="underline hover:text-white/90 transition-colors"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="underline hover:text-white/90 transition-colors"
          >
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignIn() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-orange-400 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md w-full bg-white/20 backdrop-blur-sm animate-pulse rounded-lg h-96"></div>
        </div>
      }
    >
      <SignInContent />
    </Suspense>
  );
}
