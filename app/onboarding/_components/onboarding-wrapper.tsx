"use client";

import { useState } from "react";
import { WelcomeStep } from "./steps/welcome-step";
import { FirmSelectionStep } from "./steps/firm-selection-step";
import { FirmCreationStep } from "./steps/firm-creation-step";
import { RoleAssignmentStep } from "./steps/role-assignment-step";
import { CompletionStep } from "./steps/completion-step";
import { OnboardingStep } from "@/db/schema";

interface OnboardingWrapperProps {
  userId: string;
  userEmail: string;
  userName: string;
  currentStep: OnboardingStep | string;
}

export function OnboardingWrapper({ 
  userId, 
  userEmail, 
  userName, 
  currentStep 
}: OnboardingWrapperProps) {
  const [step, setStep] = useState<OnboardingStep>(currentStep as OnboardingStep || "welcome");
  const [onboardingData, setOnboardingData] = useState({
    firmChoice: "", // "create" or "join" or firmId if joining existing
    firmData: {},
    invitationCode: "",
    selectedRole: "",
  });

  const updateOnboardingData = (newData: Partial<typeof onboardingData>) => {
    setOnboardingData(prev => ({ ...prev, ...newData }));
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = ["welcome", "firm_selection", "firm_creation", "role_assignment", "completed"];
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToStep = (targetStep: OnboardingStep) => {
    setStep(targetStep);
  };

  const renderStep = () => {
    switch (step) {
      case "welcome":
        return (
          <WelcomeStep
            userName={userName}
            onNext={nextStep}
          />
        );
      case "firm_selection":
        return (
          <FirmSelectionStep
            userId={userId}
            userEmail={userEmail}
            onNext={nextStep}
            onDataUpdate={updateOnboardingData}
            currentData={onboardingData}
          />
        );
      case "firm_creation":
        return (
          <FirmCreationStep
            userId={userId}
            userEmail={userEmail}
            onNext={nextStep}
            onBack={() => goToStep("firm_selection")}
            onDataUpdate={updateOnboardingData}
            currentData={onboardingData}
          />
        );
      case "role_assignment":
        return (
          <RoleAssignmentStep
            userId={userId}
            onNext={nextStep}
            onDataUpdate={updateOnboardingData}
            currentData={onboardingData}
          />
        );
      case "completed":
        return (
          <CompletionStep
            userName={userName}
            firmData={onboardingData.firmData}
          />
        );
      default:
        return (
          <WelcomeStep
            userName={userName}
            onNext={nextStep}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-500">Setup Progress</span>
            <span className="text-sm font-medium text-gray-500">
              Step {["welcome", "firm_selection", "firm_creation", "role_assignment", "completed"].indexOf(step) + 1} of 5
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${(["welcome", "firm_selection", "firm_creation", "role_assignment", "completed"].indexOf(step) + 1) * 20}%` 
              }}
            />
          </div>
        </div>

        {/* Current step content */}
        {renderStep()}
      </div>
    </div>
  );
}