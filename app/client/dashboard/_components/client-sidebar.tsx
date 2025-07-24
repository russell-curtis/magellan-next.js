"use client";

import { MenuNotificationBadge } from "@/components/ui/notification-badge";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import clsx from "clsx";
import {
  HomeIcon,
  LucideIcon,
  MessageSquare,
  FileText,
  User,
  HelpCircle,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const clientNavItems: NavItem[] = [
  {
    label: "Overview",
    href: "/client/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Messages",
    href: "/client/dashboard/messages",
    icon: MessageSquare,
  },
  {
    label: "My Applications",
    href: "/client/dashboard/applications",
    icon: Briefcase,
  },
  {
    label: "Documents",
    href: "/client/dashboard/documents",
    icon: FileText,
  },
  {
    label: "Profile",
    href: "/client/dashboard/profile",
    icon: User,
  },
  {
    label: "Support",
    href: "/client/dashboard/support",
    icon: HelpCircle,
  },
];

export default function ClientDashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Get unread message count for client
  const { unreadCount } = useUnreadMessageCount({
    userType: 'client',
    pollingInterval: 10000, // Poll every 10 seconds
  });

  return (
    <div className="min-[1024px]:block hidden w-64 border-r h-full bg-background">
      <div className="flex h-full flex-col">
        <div className="flex h-[3.45rem] items-center border-b px-4">
          <Link
            prefetch={true}
            className="flex items-center font-semibold hover:cursor-pointer"
            href="/client/dashboard"
          >
            <span>Client Portal</span>
          </Link>
        </div>

        <nav className="flex flex-col h-full justify-between items-start w-full space-y-1">
          <div className="w-full space-y-1 p-4">
            {clientNavItems.map((item) => (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={clsx(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  item.href === "/client/dashboard/messages" && "relative", // Add relative positioning for Messages item
                  (pathname === item.href || (item.href !== "/client/dashboard" && pathname.startsWith(item.href)))
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {/* Show notification badge for Messages menu item */}
                {item.href === "/client/dashboard/messages" && (
                  <MenuNotificationBadge 
                    count={unreadCount}
                    pulse={unreadCount > 0}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="p-4 w-full">
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p className="mb-1">Magellan CRBI</p>
              <p>Canadian Residency by Investment</p>
            </div>
          </div>
        </nav>
      </div>
    </div>
  );
}