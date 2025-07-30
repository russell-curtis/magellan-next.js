"use client";

import { useState } from "react";
import { CollapsibleNav, SidebarProfileArea } from "@/components/ui/collapsible-nav";
import ClientUserProfile from "@/components/client-user-profile";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { NavSection, SidebarState } from "@/types/navigation";
import {
  Briefcase,
  UserCircle,
} from "lucide-react";
import Link from "next/link";

const clientNavSections: NavSection[] = [
  {
    id: "my-application",
    label: "My Application",
    icon: Briefcase,
    subItems: [
      {
        label: "Overview",
        href: "/client/dashboard",
      },
      {
        label: "Applications",
        href: "/client/dashboard/applications",
      },
      {
        label: "Documents",
        href: "/client/dashboard/documents",
      },
      {
        label: "Messages",
        href: "/client/dashboard/messages",
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    icon: UserCircle,
    subItems: [
      {
        label: "Profile Settings",
        href: "/client/dashboard/profile",
      },
      {
        label: "Support & Help",
        href: "/client/dashboard/support",
      },
    ],
  },
];

export default function ClientDashboardSideBar() {
  const [sidebarState, setSidebarState] = useState<SidebarState>({
    collapsedSections: {
      "my-application": false,
      "account": false,
    }
  });
  
  // Get unread message count for client
  const { unreadCount } = useUnreadMessageCount({
    userType: 'client',
    pollingInterval: 10000, // Poll every 10 seconds
  });

  // Add message badge to the Messages sub-item
  const navSectionsWithBadges = clientNavSections.map(section => {
    if (section.id === "my-application" && section.subItems) {
      return {
        ...section,
        subItems: section.subItems.map(subItem => {
          if (subItem.href === "/client/dashboard/messages") {
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
            href="/client/dashboard"
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
            <ClientUserProfile />
            <div className="text-xs text-gray-400 mt-3 px-3">
              <p className="mb-1 font-medium">Client Portal</p>
              <p className="text-gray-500">Citizenship & Residency by Investment</p>
            </div>
          </SidebarProfileArea>
        </nav>
      </div>
    </div>
  );
}