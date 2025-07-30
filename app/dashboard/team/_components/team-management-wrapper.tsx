"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, MoreHorizontal, Mail, Calendar, Shield, Users } from "lucide-react";
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
import { InviteUserDialog } from "./invite-user-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface TeamManagementWrapperProps {
  currentUser: UserWithPermissions;
}

interface TeamMember extends UserWithPermissions {
  lastLogin?: Date | null;
}

export function TeamManagementWrapper({ currentUser }: TeamManagementWrapperProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/team/members?firmId=${currentUser.firmId}`);
      const data = await response.json();
      
      if (response.ok) {
        setTeamMembers(data.members);
      } else {
        toast.error("Failed to load team members");
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Error loading team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();
  }, [currentUser.firmId]);

  const handleDeactivateUser = async (userId: string) => {
    try {
      const response = await fetch("/api/team/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("User deactivated successfully");
        fetchTeamMembers(); // Refresh the list
      } else {
        toast.error("Failed to deactivate user");
      }
    } catch (error) {
      console.error("Error deactivating user:", error);
      toast.error("Error deactivating user");
    }
  };

  const handleActivateUser = async (userId: string) => {
    try {
      const response = await fetch("/api/team/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        toast.success("User activated successfully");
        fetchTeamMembers(); // Refresh the list
      } else {
        toast.error("Failed to activate user");
      }
    } catch (error) {
      console.error("Error activating user:", error);
      toast.error("Error activating user");
    }
  };

  const getRoleBadgeColor = (role: string) => {
    const roleInfo = ROLE_INFO[role as keyof typeof ROLE_INFO];
    if (!roleInfo) return "default";
    
    const colorMap = {
      purple: "bg-purple-100 text-purple-800 border-purple-200",
      blue: "bg-blue-100 text-blue-800 border-blue-200",
      green: "bg-green-100 text-green-800 border-green-200",
      orange: "bg-orange-100 text-orange-800 border-orange-200",
      gray: "bg-gray-100 text-gray-800 border-gray-200",
    };
    
    return colorMap[roleInfo.color as keyof typeof colorMap] || "default";
  };

  const canManageUser = (targetRole: string): boolean => {
    const roleHierarchy = {
      firm_owner: 5,
      admin: 4,
      senior_advisor: 3,
      advisor: 2,
      junior: 1,
    };

    const currentUserLevel = roleHierarchy[currentUser.role as keyof typeof roleHierarchy] || 0;
    const targetUserLevel = roleHierarchy[targetRole as keyof typeof roleHierarchy] || 0;

    return currentUserLevel > targetUserLevel;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{teamMembers.length}</p>
                <p className="text-sm text-gray-600">Total Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <Shield className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {teamMembers.filter(m => m.isActive).length}
                </p>
                <p className="text-sm text-gray-600">Active Members</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Mail className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {teamMembers.filter(m => !m.isActive).length}
                </p>
                <p className="text-sm text-gray-600">Pending/Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invite New Member */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Manage your firm's team members and their access levels
            </CardDescription>
          </div>
          <Button onClick={() => setInviteDialogOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div
                key={member.id}
                className={`flex items-center justify-between p-4 border rounded-lg ${
                  !member.isActive ? "bg-gray-50 border-gray-200" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex items-center space-x-4">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={""} alt={member.name} />
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {member.name.split(" ").map(n => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h3 className={`font-medium ${!member.isActive ? "text-gray-500" : "text-gray-900"}`}>
                        {member.name}
                      </h3>
                      <Badge 
                        variant="outline" 
                        className={getRoleBadgeColor(member.role)}
                      >
                        {ROLE_INFO[member.role]?.name || member.role}
                      </Badge>
                      {!member.isActive && (
                        <Badge variant="destructive" className="text-xs">
                          Inactive
                        </Badge>
                      )}
                      {member.id === currentUser.id && (
                        <Badge variant="secondary" className="text-xs">
                          You
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Mail className="h-3 w-3 mr-1" />
                        {member.email}
                      </span>
                      {member.lastLogin && (
                        <span className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Last login: {new Date(member.lastLogin).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {canManageUser(member.role) && member.id !== currentUser.id && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        Edit Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {member.isActive ? (
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => handleDeactivateUser(member.id)}
                        >
                          Deactivate User
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem 
                          className="text-green-600"
                          onClick={() => handleActivateUser(member.id)}
                        >
                          Activate User
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}

            {teamMembers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
                <p className="text-gray-600 mb-4">
                  Start building your team by inviting other advisors to join your firm.
                </p>
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite Your First Member
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invite User Dialog */}
      <InviteUserDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        currentUser={currentUser}
        onInviteSent={() => {
          setInviteDialogOpen(false);
          // Could add a refresh of pending invitations here
        }}
      />
    </div>
  );
}