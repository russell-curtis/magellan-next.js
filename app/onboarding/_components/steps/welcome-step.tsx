"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building, Users, Shield, Zap } from "lucide-react";

interface WelcomeStepProps {
  userName: string;
  onNext: () => void;
}

export function WelcomeStep({ userName, onNext }: WelcomeStepProps) {
  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Magellan CRBI, {userName}!
        </CardTitle>
        <CardDescription className="text-lg text-gray-600">
          Let's get you set up with your CRBI advisory platform in just a few steps.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Features overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-8">
          <div className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
            <div className="flex-shrink-0">
              <Building className="h-6 w-6 text-blue-600 mt-1" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Firm Management</h3>
              <p className="text-sm text-gray-600">Organize your team and manage multiple agents under your firm</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-green-50 rounded-lg">
            <div className="flex-shrink-0">
              <Users className="h-6 w-6 text-green-600 mt-1" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Client Collaboration</h3>
              <p className="text-sm text-gray-600">Streamlined communication and document management</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-purple-50 rounded-lg">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-purple-600 mt-1" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Compliance Ready</h3>
              <p className="text-sm text-gray-600">Built-in requirements for all CRBI programs</p>
            </div>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-orange-50 rounded-lg">
            <div className="flex-shrink-0">
              <Zap className="h-6 w-6 text-orange-600 mt-1" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Automated Workflows</h3>
              <p className="text-sm text-gray-600">Save 30% of your time with intelligent automation</p>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-gray-600 mb-6">
            In the next few steps, you'll set up your firm and define your role within the platform.
          </p>
          <Button 
            onClick={onNext}
            size="lg"
            className="px-8 py-3"
          >
            Let's Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}