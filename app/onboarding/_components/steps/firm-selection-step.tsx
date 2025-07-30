"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building, Users, Key } from "lucide-react";
import { toast } from "sonner";

interface FirmSelectionStepProps {
  userId: string;
  userEmail: string;
  onNext: () => void;
  onDataUpdate: (data: any) => void;
  currentData: any;
}

export function FirmSelectionStep({ 
  userId, 
  userEmail, 
  onNext, 
  onDataUpdate, 
  currentData 
}: FirmSelectionStepProps) {
  const [selectedOption, setSelectedOption] = useState<"create" | "join" | "">(currentData.firmChoice || "");
  const [invitationCode, setInvitationCode] = useState(currentData.invitationCode || "");
  const [isValidating, setIsValidating] = useState(false);

  const handleOptionSelect = (option: "create" | "join") => {
    setSelectedOption(option);
    onDataUpdate({ firmChoice: option });
  };

  const handleContinue = async () => {
    if (!selectedOption) {
      toast.error("Please select an option to continue");
      return;
    }

    if (selectedOption === "join") {
      if (!invitationCode.trim()) {
        toast.error("Please enter an invitation code");
        return;
      }

      // Validate invitation code
      setIsValidating(true);
      try {
        const response = await fetch("/api/onboarding/validate-invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            invitationCode: invitationCode.trim(),
            userEmail 
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          toast.error(result.error || "Invalid invitation code");
          setIsValidating(false);
          return;
        }

        // Store the validated invitation data
        onDataUpdate({ 
          firmChoice: "join",
          invitationCode: invitationCode.trim(),
          firmData: result.firm,
          selectedRole: result.role 
        });
        
        toast.success("Invitation validated successfully!");
        
        // Skip firm creation and role assignment - go directly to completion
        onNext();
        
      } catch (error) {
        console.error("Error validating invitation:", error);
        toast.error("Error validating invitation code");
      } finally {
        setIsValidating(false);
      }
    } else {
      // Creating new firm - set firmChoice and continue to firm creation step
      onDataUpdate({ 
        firmChoice: "create"
      });
      onNext();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Set Up Your Firm
        </CardTitle>
        <CardDescription className="text-gray-600">
          Choose how you'd like to get started with Magellan CRBI
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Option 1: Create New Firm */}
        <div 
          className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
            selectedOption === "create" 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => handleOptionSelect("create")}
        >
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-3 rounded-lg ${
              selectedOption === "create" ? "bg-blue-500" : "bg-gray-100"
            }`}>
              <Building className={`h-6 w-6 ${
                selectedOption === "create" ? "text-white" : "text-gray-600"
              }`} />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Create a New Firm
              </h3>
              <p className="text-gray-600 mb-4">
                Set up a new CRBI advisory firm and become the firm owner. You'll be able to invite other advisors to join your team.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-2" />
                Perfect for firm owners and independent advisors
              </div>
            </div>
            {selectedOption === "create" && (
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Option 2: Join Existing Firm */}
        <div 
          className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${
            selectedOption === "join" 
              ? "border-blue-500 bg-blue-50" 
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
          onClick={() => handleOptionSelect("join")}
        >
          <div className="flex items-start space-x-4">
            <div className={`flex-shrink-0 p-3 rounded-lg ${
              selectedOption === "join" ? "bg-blue-500" : "bg-gray-100"
            }`}>
              <Key className={`h-6 w-6 ${
                selectedOption === "join" ? "text-white" : "text-gray-600"
              }`} />
            </div>
            <div className="flex-grow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Join an Existing Firm
              </h3>
              <p className="text-gray-600 mb-4">
                Join an established CRBI advisory firm using an invitation code. You'll work as part of their team.
              </p>
              <div className="flex items-center text-sm text-gray-500">
                <Users className="h-4 w-4 mr-2" />
                Perfect for advisors joining an established practice
              </div>
            </div>
            {selectedOption === "join" && (
              <div className="flex-shrink-0">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Invitation Code Input (shown when "join" is selected) */}
        {selectedOption === "join" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <Label htmlFor="invitationCode" className="text-sm font-medium text-gray-900">
              Invitation Code
            </Label>
            <div className="mt-2">
              <Input
                id="invitationCode"
                type="text"
                placeholder="Enter the invitation code provided by your firm"
                value={invitationCode}
                onChange={(e) => {
                  setInvitationCode(e.target.value);
                  onDataUpdate({ invitationCode: e.target.value });
                }}
                className="w-full"
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Your firm administrator should have provided you with this code.
            </p>
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleContinue}
            disabled={!selectedOption || isValidating}
            size="lg"
          >
            {isValidating ? "Validating..." : "Continue"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}