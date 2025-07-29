"use client";

import { useState } from "react";
import UserProfile from "@/components/user-profile";
import { CollapsibleNav, SidebarProfileArea, SidebarSettingsItem } from "@/components/ui/collapsible-nav";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { NavSection, SidebarState } from "@/types/navigation";
import {
  Settings,
  Users,
  Briefcase,
  FolderOpen,
  Cog,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const agentNavSections: NavSection[] = [
  {
    id: "applications",
    label: "Applications",
    icon: Briefcase,
    subItems: [
      {
        label: "Overview",
        href: "/dashboard",
      },
      {
        label: "Client Applications",
        href: "/dashboard/applications",
      },
      {
        label: "Tasks & Workflow",
        href: "/dashboard/tasks",
      },
    ],
  },
  {
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
  },
  {
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
  },
  {
    id: "system",
    label: "System",
    icon: Cog,
    subItems: [
      {
        label: "Payment Gateway",
        href: "/dashboard/payment",
      },
    ],
  },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const [sidebarState, setSidebarState] = useState<SidebarState>({
    collapsedSections: {
      "applications": false,
      "client-management": false,
      "documents": false,
      "system": false,
    }
  });
  
  // Get unread message count for advisor
  const { unreadCount } = useUnreadMessageCount({
    userType: 'advisor',
    pollingInterval: 10000, // Poll every 10 seconds
  });

  // Add message badge to the Messages sub-item
  const navSectionsWithBadges = agentNavSections.map(section => {
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
