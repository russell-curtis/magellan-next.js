"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface FirmCreationStepProps {
  userId: string;
  userEmail: string;
  onNext: () => void;
  onBack: () => void;
  onDataUpdate: (data: any) => void;
  currentData: any;
}

export function FirmCreationStep({ 
  userId, 
  userEmail, 
  onNext, 
  onBack, 
  onDataUpdate, 
  currentData 
}: FirmCreationStepProps) {
  const [firmData, setFirmData] = useState({
    name: currentData.firmData?.name || "",
    slug: currentData.firmData?.slug || "",
    subscriptionTier: currentData.firmData?.subscriptionTier || "starter",
    settings: currentData.firmData?.settings || {
      description: "",
      website: "",
      phone: "",
      address: "",
      timezone: "UTC",
    },
  });
  const [isCreating, setIsCreating] = useState(false);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleFirmNameChange = (name: string) => {
    const slug = generateSlug(name);
    setFirmData(prev => ({ ...prev, name, slug }));
    onDataUpdate({ 
      firmData: { 
        ...firmData, 
        name, 
        slug 
      } 
    });
  };

  const handleSettingsChange = (key: string, value: string) => {
    const newSettings = { ...firmData.settings, [key]: value };
    const updatedFirmData = { ...firmData, settings: newSettings };
    setFirmData(updatedFirmData);
    onDataUpdate({ firmData: updatedFirmData });
  };

  const handleCreateFirm = async () => {
    if (!firmData.name.trim()) {
      toast.error("Please enter a firm name");
      return;
    }

    if (!firmData.slug.trim()) {
      toast.error("Please enter a valid firm slug");
      return;
    }

    setIsCreating(true);
    try {
      const response = await fetch("/api/onboarding/create-firm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          userEmail,
          firmData,
        }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        try {
          const errorJson = JSON.parse(errorText);
          toast.error(errorJson.error || "Failed to create firm");
        } catch {
          toast.error(`Server error: ${response.status} - ${errorText}`);
        }
        setIsCreating(false);
        return;
      }

      const result = await response.json();

      // Update onboarding data with the created firm info
      onDataUpdate({ 
        firmChoice: "create", // Preserve the firm choice
        firmData: result.firm,
        selectedRole: "firm_owner" 
      });
      
      toast.success("Firm created successfully!");
      onNext();
      
    } catch (error) {
      console.error("Error creating firm:", error);
      toast.error("Error creating firm");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2 mb-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="p-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Create Your Firm
            </CardTitle>
            <CardDescription className="text-gray-600">
              Set up your CRBI advisory firm with basic information
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Firm Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="firmName" className="text-sm font-medium text-gray-900">
              Firm Name *
            </Label>
            <Input
              id="firmName"
              type="text"
              placeholder="e.g. Atlantic Advisory Partners"
              value={firmData.name}
              onChange={(e) => handleFirmNameChange(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="firmSlug" className="text-sm font-medium text-gray-900">
              Firm URL Slug *
            </Label>
            <Input
              id="firmSlug"
              type="text"
              placeholder="atlantic-advisory-partners"
              value={firmData.slug}
              onChange={(e) => {
                const slug = generateSlug(e.target.value);
                setFirmData(prev => ({ ...prev, slug }));
              }}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              This will be used in your firm's URL: /firms/{firmData.slug}
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="description" className="text-sm font-medium text-gray-900">
            Firm Description
          </Label>
          <Textarea
            id="description"
            placeholder="Brief description of your CRBI advisory services..."
            value={firmData.settings.description}
            onChange={(e) => handleSettingsChange("description", e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>

        {/* Contact Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="website" className="text-sm font-medium text-gray-900">
              Website
            </Label>
            <Input
              id="website"
              type="url"
              placeholder="https://www.yourfirm.com"
              value={firmData.settings.website}
              onChange={(e) => handleSettingsChange("website", e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone" className="text-sm font-medium text-gray-900">
              Phone Number
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={firmData.settings.phone}
              onChange={(e) => handleSettingsChange("phone", e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        {/* Address */}
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-gray-900">
            Business Address
          </Label>
          <Textarea
            id="address"
            placeholder="123 Business Ave, Suite 100&#10;City, State 12345&#10;Country"
            value={firmData.settings.address}
            onChange={(e) => handleSettingsChange("address", e.target.value)}
            rows={3}
            className="w-full"
          />
        </div>

        {/* Timezone */}
        <div className="space-y-2">
          <Label htmlFor="timezone" className="text-sm font-medium text-gray-900">
            Timezone
          </Label>
          <Select 
            value={firmData.settings.timezone} 
            onValueChange={(value) => handleSettingsChange("timezone", value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your timezone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time (EST)</SelectItem>
              <SelectItem value="America/Chicago">Central Time (CST)</SelectItem>
              <SelectItem value="America/Denver">Mountain Time (MST)</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time (PST)</SelectItem>
              <SelectItem value="Europe/London">London (GMT)</SelectItem>
              <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
              <SelectItem value="Asia/Dubai">Dubai (GST)</SelectItem>
              <SelectItem value="Asia/Singapore">Singapore (SGT)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Subscription Tier Info */}
        <div className="p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Subscription Plan</h4>
          <p className="text-sm text-gray-600">
            Your firm will start with the <strong>Starter</strong> plan. You can upgrade later from your dashboard settings.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-6">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button 
            onClick={handleCreateFirm}
            disabled={isCreating || !firmData.name.trim()}
            size="lg"
          >
            {isCreating ? "Creating Firm..." : "Create Firm"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}