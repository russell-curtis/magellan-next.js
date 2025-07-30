"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ROLE_INFO } from "@/lib/role-info";

// Define the interface locally to avoid importing database client on client-side
interface UserWithPermissions {
  id: string;
  firmId: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  permissions: {
    canManageClients: boolean;
    canManageApplications: boolean;
    canManageDocuments: boolean;
    canManageTeam: boolean;
    canManageFirmSettings: boolean;
    canViewAnalytics: boolean;
    canManageTasks: boolean;
    canAccessBilling: boolean;
    maxClientsLimit: number | null;
    maxApplicationsLimit: number | null;
  };
  firm: {
    id: string;
    name: string;
    slug: string;
    subscriptionTier: string;
    subscriptionStatus: string;
  };
}
import { UserRole } from "@/db/schema";
import { toast } from "sonner";
import { Mail, Shield, Clock } from "lucide-react";

const inviteFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.enum(["junior", "advisor", "senior_advisor", "admin"], {
    required_error: "Please select a role",
  }),
  personalizedMessage: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUser: UserWithPermissions;
  onInviteSent: () => void;
}

export function InviteUserDialog({
  open,
  onOpenChange,
  currentUser,
  onInviteSent,
}: InviteUserDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
      role: "junior",
      personalizedMessage: "",
    },
  });

  const getAvailableRoles = (): UserRole[] => {
    const roleHierarchy: Record<UserRole, number> = {
      firm_owner: 5,
      admin: 4,
      senior_advisor: 3,
      advisor: 2,
      junior: 1,
    };

    const currentUserLevel = roleHierarchy[currentUser.role];
    
    return Object.entries(roleHierarchy)
      .filter(([role, level]) => level < currentUserLevel && role !== 'firm_owner')
      .map(([role]) => role as UserRole);
  };

  const onSubmit = async (values: InviteFormValues) => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: values.email,
          role: values.role,
          personalizedMessage: values.personalizedMessage,
          firmId: currentUser.firmId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Invitation sent successfully!");
        form.reset();
        onInviteSent();
      } else {
        toast.error(data.message || "Failed to send invitation");
      }
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast.error("Error sending invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const availableRoles = getAvailableRoles();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Invite Team Member</span>
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new team member to join {currentUser.firm.name}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Enter email address" 
                      type="email"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    The invitation will be sent to this email address
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableRoles.map((role) => {
                        const roleInfo = ROLE_INFO[role];
                        return (
                          <SelectItem key={role} value={role}>
                            <div className="flex items-center space-x-2">
                              <Shield className="h-4 w-4" />
                              <div>
                                <div className="font-medium">{roleInfo.name}</div>
                                <div className="text-xs text-gray-500">
                                  {roleInfo.description}
                                </div>
                              </div>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    You can only assign roles below your current level
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="personalizedMessage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personal Message (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add a personal welcome message..."
                      className="resize-none"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    This message will be included in the invitation email
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 mb-1">
                    Invitation Details
                  </p>
                  <ul className="text-blue-700 space-y-1">
                    <li>• The invitation will expire in 7 days</li>
                    <li>• The invited user will need to sign up with the same email</li>
                    <li>• They'll be automatically added to your firm upon registration</li>
                  </ul>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Invitation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}