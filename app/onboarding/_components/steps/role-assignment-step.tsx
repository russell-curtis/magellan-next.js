"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Shield, Users, Briefcase, GraduationCap } from "lucide-react";
import { UserRole } from "@/db/schema";
import { toast } from "sonner";

interface RoleAssignmentStepProps {
  userId: string;
  onNext: () => void;
  onDataUpdate: (data: any) => void;
  currentData: any;
}

const roleOptions = [
  {
    value: "firm_owner" as UserRole,
    title: "Firm Owner",
    description: "Full administrative control over the firm, team management, and billing",
    icon: Crown,
    color: "purple",
    permissions: ["All permissions", "Team management", "Billing access", "Firm settings"],
    recommended: true,
  },
  {
    value: "admin" as UserRole,
    title: "Senior Administrator", 
    description: "Manage team members and firm operations, but not billing or critical settings",
    icon: Shield,
    color: "blue",
    permissions: ["Team management", "Client management", "Analytics access", "Most settings"],
  },
  {
    value: "senior_advisor" as UserRole,
    title: "Senior Advisor",
    description: "Experienced advisor with additional permissions and mentoring capabilities",
    icon: Briefcase,
    color: "green",
    permissions: ["Client management", "Application oversight", "Team guidance", "Analytics"],
  },
  {
    value: "advisor" as UserRole,
    title: "Advisor",
    description: "Core advisory role with client and application management capabilities",
    icon: Users,
    color: "orange",
    permissions: ["Client management", "Applications", "Document review", "Communications"],
  },
  {
    value: "junior" as UserRole,
    title: "Junior Advisor",
    description: "Entry-level role with supervised access to basic platform features",
    icon: GraduationCap,
    color: "gray",
    permissions: ["Basic client access", "Document upload", "Supervised applications"],
  },
];

export function RoleAssignmentStep({ 
  userId, 
  onNext, 
  onDataUpdate, 
  currentData 
}: RoleAssignmentStepProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | "">(
    currentData.selectedRole || (currentData.firmChoice === "create" ? "firm_owner" : "")
  );
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    onDataUpdate({ selectedRole: role });
  };

  const handleContinue = async () => {
    if (!selectedRole) {
      toast.error("Please select a role to continue");
      return;
    }

    setIsProcessing(true);
    try {
      const response = await fetch("/api/onboarding/complete-setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          firmData: currentData.firmData,
          selectedRole,
          firmChoice: currentData.firmChoice,
          invitationCode: currentData.invitationCode,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Failed to complete setup");
        setIsProcessing(false);
        return;
      }

      toast.success("Setup completed successfully!");
      onNext();
      
    } catch (error) {
      console.error("Error completing setup:", error);
      toast.error("Error completing setup");
    } finally {
      setIsProcessing(false);
    }
  };

  const getColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      purple: isSelected 
        ? "border-purple-500 bg-purple-50" 
        : "border-gray-200 hover:border-purple-300 hover:bg-purple-50",
      blue: isSelected 
        ? "border-blue-500 bg-blue-50" 
        : "border-gray-200 hover:border-blue-300 hover:bg-blue-50",
      green: isSelected 
        ? "border-green-500 bg-green-50" 
        : "border-gray-200 hover:border-green-300 hover:bg-green-50",
      orange: isSelected 
        ? "border-orange-500 bg-orange-50" 
        : "border-gray-200 hover:border-orange-300 hover:bg-orange-50",
      gray: isSelected 
        ? "border-gray-500 bg-gray-50" 
        : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  const getIconColorClasses = (color: string, isSelected: boolean) => {
    const colors = {
      purple: isSelected ? "bg-purple-500 text-white" : "bg-purple-100 text-purple-600",
      blue: isSelected ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-600",
      green: isSelected ? "bg-green-500 text-white" : "bg-green-100 text-green-600",
      orange: isSelected ? "bg-orange-500 text-white" : "bg-orange-100 text-orange-600",
      gray: isSelected ? "bg-gray-500 text-white" : "bg-gray-100 text-gray-600",
    };
    return colors[color as keyof typeof colors] || colors.gray;
  };

  return (
    <Card className="w-full">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold text-gray-900">
          Choose Your Role
        </CardTitle>
        <CardDescription className="text-gray-600">
          Select the role that best describes your position and responsibilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {roleOptions.map((role) => {
          const isSelected = selectedRole === role.value;
          const Icon = role.icon;
          
          return (
            <div
              key={role.value}
              className={`relative p-6 border-2 rounded-lg cursor-pointer transition-all duration-200 ${getColorClasses(role.color, isSelected)}`}
              onClick={() => handleRoleSelect(role.value)}
            >
              <div className="flex items-start space-x-4">
                <div className={`flex-shrink-0 p-3 rounded-lg ${getIconColorClasses(role.color, isSelected)}`}>
                  <Icon className="h-6 w-6" />
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {role.title}
                    </h3>
                    {role.recommended && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  
                  <p className="text-gray-600 mb-4">
                    {role.description}
                  </p>
                  
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md"
                      >
                        {permission}
                      </span>
                    ))}
                  </div>
                </div>
                
                {isSelected && (
                  <div className="flex-shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${getIconColorClasses(role.color, true)}`}>
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Note about permissions */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Your role determines your permissions within the platform. 
            Firm owners and administrators can modify roles and permissions later from the team management section.
          </p>
        </div>

        {/* Continue Button */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleContinue}
            disabled={!selectedRole || isProcessing}
            size="lg"
          >
            {isProcessing ? "Setting Up..." : "Complete Setup"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}