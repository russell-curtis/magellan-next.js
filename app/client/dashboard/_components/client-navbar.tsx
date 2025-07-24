"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarInitials } from "@/components/ui/avatar";
import { NotificationBadge } from "@/components/ui/notification-badge";
import { useUnreadMessageCount } from "@/hooks/use-unread-message-count";
import { useClientAuth } from '@/lib/client-auth-context';
import { useRouter } from 'next/navigation';
import {
  HomeIcon,
  MessageSquare,
  FileText,
  User,
  HelpCircle,
  Briefcase,
  LogOut,
  Menu,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

const mobileNavItems = [
  { label: "Overview", href: "/client/dashboard", icon: HomeIcon },
  { label: "Messages", href: "/client/dashboard/messages", icon: MessageSquare },
  { label: "My Applications", href: "/client/dashboard/applications", icon: Briefcase },
  { label: "Documents", href: "/client/dashboard/documents", icon: FileText },
  { label: "Profile", href: "/client/dashboard/profile", icon: User },
  { label: "Support", href: "/client/dashboard/support", icon: HelpCircle },
];

export default function ClientDashboardTopNav({ children }: { children: ReactNode }) {
  const { client, logout } = useClientAuth();
  const router = useRouter();
  
  // Get unread message count for mobile menu badge
  const { unreadCount } = useUnreadMessageCount({
    userType: 'client',
    pollingInterval: 10000,
  });

  const handleLogout = () => {
    logout();
    router.push('/client/login');
  };

  return (
    <div className="flex flex-col">
      <header className="flex h-14 lg:h-[52px] items-center gap-4 border-b px-3">
        {/* Mobile Menu */}
        <Dialog>
          <SheetTrigger className="min-[1024px]:hidden p-2 transition">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <Link prefetch={true} href="/client/dashboard">
                <SheetTitle>Client Portal</SheetTitle>
              </Link>
            </SheetHeader>
            <div className="flex flex-col space-y-3 mt-[1rem]">
              {mobileNavItems.map((item) => (
                <DialogClose key={item.href} asChild>
                  <Link prefetch={true} href={item.href}>
                    <Button variant="outline" className="w-full justify-start relative">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.label}
                      {/* Show notification badge for Messages item */}
                      {item.href === "/client/dashboard/messages" && (
                        <NotificationBadge 
                          count={unreadCount}
                          className="absolute -top-1 -right-1"
                        />
                      )}
                    </Button>
                  </Link>
                </DialogClose>
              ))}
              
              <div className="border-t pt-3">
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Dialog>

        {/* Desktop Header Content */}
        <div className="flex-1 flex items-center justify-between">
          <div className="hidden lg:block">
            {/* Breadcrumb or page title can go here */}
          </div>

          {/* User Profile Section */}
          <div className="flex items-center space-x-4 ml-auto">
            {client && (
              <>
                <div className="flex items-center space-x-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <AvatarInitials name={`${client.firstName} ${client.lastName}`} />
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block">
                    <p className="text-sm font-medium text-gray-900">
                      {client.firstName} {client.lastName}
                    </p>
                    <p className="text-xs text-gray-600">{client.email}</p>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="text-gray-600 hover:text-gray-900"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Sign out</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}