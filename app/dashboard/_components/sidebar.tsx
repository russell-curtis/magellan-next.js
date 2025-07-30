"use client";

import { useState, useEffect } from "react";
import UserProfile from "@/components/user-profile";
import { CollapsibleNav, SidebarProfileArea, SidebarSettingsItem } from "@/components/ui/collapsible-nav";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { NavSection, SidebarState } from "@/types/navigation";
import { UserWithPermissions } from "@/lib/permissions";
import {
  Settings,
  Users,
  Briefcase,
  FolderOpen,
  Cog,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const getNavigationSections = (userPermissions: UserWithPermissions | null): NavSection[] => {
  if (!userPermissions) return [];
  
  const sections: NavSection[] = [];
  
  // Applications section - available to all users
  sections.push({
    id: "applications",
    label: "Applications",
    icon: Briefcase,
    subItems: [
      {
        label: "Overview",
        href: "/dashboard",
      },
      ...(userPermissions.permissions.canManageApplications ? [{
        label: "Client Applications", 
        href: "/dashboard/applications",
      }] : []),
      ...(userPermissions.permissions.canManageTasks ? [{
        label: "Tasks & Workflow",
        href: "/dashboard/tasks",
      }] : []),
    ],
  });

  // Client Management section - based on client permissions
  if (userPermissions.permissions.canManageClients) {
    sections.push({
      id: "client-management",
      label: "Client Management", 
      icon: Users,
      subItems: [
        {
          label: "Client Directory",
          href: "/dashboard/clients",
        },
        {
          label: "Communications",
          href: "/dashboard/communications",
        },
        {
          label: "Messages",
          href: "/dashboard/messages",
        },
      ],
    });
  }

  // Documents section - based on document permissions
  if (userPermissions.permissions.canManageDocuments) {
    sections.push({
      id: "documents",
      label: "Documents",
      icon: FolderOpen,
      subItems: [
        {
          label: "Document Center",
          href: "/dashboard/documents",
        },
        {
          label: "Upload Management", 
          href: "/dashboard/upload",
        },
      ],
    });
  }

  // Team Management section - only for users who can manage team
  if (userPermissions.permissions.canManageTeam) {
    sections.push({
      id: "team",
      label: "Team Management",
      icon: Shield,
      subItems: [
        {
          label: "Team Members",
          href: "/dashboard/team",
        },
      ],
    });
  }

  // System section - for admin functions
  const systemSubItems = [];
  
  if (userPermissions.permissions.canAccessBilling) {
    systemSubItems.push({
      label: "Payment Gateway",
      href: "/dashboard/payment", 
    });
  }

  if (userPermissions.permissions.canManageFirmSettings) {
    systemSubItems.push({
      label: "Firm Settings",
      href: "/dashboard/firm-settings",
    });
  }

  if (systemSubItems.length > 0) {
    sections.push({
      id: "system",
      label: "System",
      icon: Cog,
      subItems: systemSubItems,
    });
  }

  return sections;
};

export default function DashboardSideBar() {
  const pathname = usePathname();
  const [userPermissions, setUserPermissions] = useState<UserWithPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarState, setSidebarState] = useState<SidebarState>({
    collapsedSections: {
      "applications": false,
      "client-management": false,
      "documents": false,
      "system": false,
      "team": false,
    }
  });

  // Fetch user permissions when component mounts
  useEffect(() => {
    const fetchUserPermissions = async () => {
      try {
        const response = await fetch('/api/user/permissions');
        if (response.ok) {
          const userData = await response.json();
          setUserPermissions(userData);
        }
      } catch (error) {
        console.error('Error fetching user permissions:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserPermissions();
  }, []);
  
  // Get unread message count for advisor
  const { unreadCount } = useUnreadMessageCount({
    userType: 'advisor',
    pollingInterval: 10000, // Poll every 10 seconds
  });

  // Get dynamic navigation sections based on user permissions
  const navigationSections = getNavigationSections(userPermissions);

  // Add message badge to the Messages sub-item
  const navSectionsWithBadges = navigationSections.map(section => {
    if (section.id === "client-management" && section.subItems) {
      return {
        ...section,
        subItems: section.subItems.map(subItem => {
          if (subItem.href === "/dashboard/messages") {
            return {
              ...subItem,
              badge: {
                count: unreadCount,
                pulse: unreadCount > 0,
              }
            };
          }
          return subItem;
        })
      };
    }
    return section;
  });

  const handleSectionToggle = (sectionId: string) => {
    setSidebarState(prev => ({
      ...prev,
      collapsedSections: {
        ...prev.collapsedSections,
        [sectionId]: !prev.collapsedSections[sectionId]
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-[1024px]:block hidden w-[280px] h-full bg-black">
        <div className="flex h-full flex-col px-3">
          <div className="flex h-16 items-center pt-8 px-4 pb-8">
            <Link
              prefetch={true}
              className="flex items-center hover:cursor-pointer"
              href="/"
            >
              <img src="/logos/m-logo.svg" alt="Magellan" className="h-4 w-auto" />
            </Link>
          </div>
          <nav className="flex flex-col h-full">
            <div className="flex-1 py-4 space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="h-10 bg-gray-800 rounded mb-2" />
                </div>
              ))}
            </div>
          </nav>
        </div>
      </div>
    );
  }

  return (
    <div className="min-[1024px]:block hidden w-[280px] h-full bg-black">
      <div className="flex h-full flex-col px-3">
        {/* Header with Logo */}
        <div className="flex h-16 items-center pt-8 px-4 pb-8">
          <Link
            prefetch={true}
            className="flex items-center hover:cursor-pointer"
            href="/"
          >
            <img src="/logos/m-logo.svg" alt="Magellan" className="h-4 w-auto" />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex flex-col h-full">
          <div className="flex-1 py-4 space-y-0.5">
            {navSectionsWithBadges.map((section) => (
              <CollapsibleNav
                key={section.id}
                section={section}
                isCollapsed={sidebarState.collapsedSections[section.id] || false}
                onToggle={handleSectionToggle}
              />
            ))}
          </div>

          {/* Bottom Profile Area */}
          <SidebarProfileArea>
            <SidebarSettingsItem 
              href="/dashboard/settings"
              icon={Settings}
              label="Settings"
              isActive={pathname === "/dashboard/settings"}
            />
            <UserProfile />
          </SidebarProfileArea>
        </nav>
      </div>
    </div>
  );
}
