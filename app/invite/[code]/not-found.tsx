import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import Link from "next/link";

export default function InvitationNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-16 h-16 flex items-center justify-center">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Invitation Not Found</CardTitle>
          <CardDescription>
            This invitation link is invalid or has expired
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-gray-600">
            The invitation you're trying to access either doesn't exist, has already been used, or has expired.
          </p>
          
          <div className="space-y-2">
            <Button asChild className="w-full">
              <Link href="/sign-in">Sign In</Link>
            </Button>
            
            <Button variant="outline" asChild className="w-full">
              <Link href="/">Go Home</Link>
            </Button>
          </div>
          
          <p className="text-xs text-gray-500">
            If you believe this is an error, please contact the person who sent you this invitation.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}