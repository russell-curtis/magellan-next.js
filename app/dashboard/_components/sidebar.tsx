"use client";

import UserProfile from "@/components/user-profile";
import { MenuNotificationBadge } from "@/components/ui/notification-badge";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import clsx from "clsx";
import {
  Banknote,
  HomeIcon,
  LucideIcon,
  MessageCircleIcon,
  MessageSquare,
  Settings,
  Upload,
  Users,
  CheckSquare,
  FileText,
  Briefcase,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: HomeIcon,
  },
  {
    label: "Clients",
    href: "/dashboard/clients",
    icon: Users,
  },
  {
    label: "Applications",
    href: "/dashboard/applications",
    icon: Briefcase,
  },
  {
    label: "Tasks",
    href: "/dashboard/tasks",
    icon: CheckSquare,
  },
  {
    label: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
  {
    label: "Communications",
    href: "/dashboard/communications",
    icon: MessageCircleIcon,
  },
  {
    label: "Messages",
    href: "/dashboard/messages",
    icon: MessageSquare,
  },
  {
    label: "Upload",
    href: "/dashboard/upload",
    icon: Upload,
  },
  {
    label: "Payment Gated",
    href: "/dashboard/payment",
    icon: Banknote,
  },
];

export default function DashboardSideBar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Get unread message count for advisor
  const { unreadCount } = useUnreadMessageCount({
    userType: 'advisor',
    pollingInterval: 10000, // Poll every 10 seconds
  });

  return (
    <div className="min-[1024px]:block hidden w-64 border-r h-full bg-background">
      <div className="flex h-full flex-col">
        <div className="flex h-[3.45rem] items-center border-b px-4">
          <Link
            prefetch={true}
            className="flex items-center font-semibold hover:cursor-pointer"
            href="/"
          >
            <span>Magellan CRBI</span>
          </Link>
        </div>

        <nav className="flex flex-col h-full justify-between items-start w-full space-y-1">
          <div className="w-full space-y-1 p-4">
            {navItems.map((item) => (
              <div
                key={item.href}
                onClick={() => router.push(item.href)}
                className={clsx(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  item.href === "/dashboard/messages" && "relative", // Add relative positioning for Messages item
                  (pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href)))
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {/* Show notification badge for Messages menu item */}
                {item.href === "/dashboard/messages" && (
                  <MenuNotificationBadge 
                    count={unreadCount}
                    pulse={unreadCount > 0}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-2 w-full">
            <div className="px-4">
              <div
                onClick={() => router.push("/dashboard/settings")}
                className={clsx(
                  "flex items-center w-full gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:cursor-pointer",
                  pathname === "/dashboard/settings"
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Settings className="h-4 w-4" />
                Settings
              </div>
            </div>
            <UserProfile />
          </div>
        </nav>
      </div>
    </div>
  );
}
