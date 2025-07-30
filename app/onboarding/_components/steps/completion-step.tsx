"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";

interface CompletionStepProps {
  userName: string;
  firmData: any;
}

export function CompletionStep({ userName, firmData }: CompletionStepProps) {
  const router = useRouter();

  const handleContinueToDashboard = () => {
    router.push("/dashboard");
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Magellan CRBI!
        </CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Your account has been set up successfully. You're ready to start managing your CRBI practice.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Setup Summary */}
        <div className="p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Setup Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Your Name:</span>
              <span className="font-medium text-gray-900">{userName}</span>
            </div>
            {firmData?.name && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Firm:</span>
                <span className="font-medium text-gray-900">{firmData.name}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Status:</span>
              <span className="font-medium text-green-600">✓ Setup Complete</span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">What's Next?</h3>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Explore Your Dashboard</h4>
                <p className="text-sm text-gray-600">
                  Familiarize yourself with the platform features and navigation
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Add Your First Client</h4>
                <p className="text-sm text-gray-600">
                  Start by adding client information and creating their profile
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Set Up CRBI Programs</h4>
                <p className="text-sm text-gray-600">
                  Configure the citizenship and residency programs you work with
                </p>
              </div>
            </div>

            {firmData?.name && (
              <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
                <div className="flex-shrink-0 w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Invite Team Members</h4>
                  <p className="text-sm text-gray-600">
                    Add other advisors to your firm and manage team permissions
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Support Information */}
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Need Help?</h4>
          <p className="text-sm text-gray-600">
            Our support team is here to help you get started. Visit the Help Center or contact support 
            from your dashboard if you have any questions.
          </p>
        </div>

        {/* Continue Button */}
        <div className="text-center pt-6">
          <Button 
            onClick={handleContinueToDashboard}
            size="lg"
            className="px-8 py-3"
          >
            Go to Dashboard
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}