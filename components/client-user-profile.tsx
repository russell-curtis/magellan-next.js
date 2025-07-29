"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientAuth } from "@/lib/client-auth-context";
import { LogOut, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarInitials } from "./ui/avatar";
import clsx from "clsx";

export default function ClientUserProfile({ mini }: { mini?: boolean }) {
  const { client, logout } = useClientAuth();
  const router = useRouter();

  const handleSignOut = () => {
    logout();
    router.push("/client/login");
  };

  if (!client) {
    return (
      <div
        className={clsx(
          "flex gap-3 justify-start items-center w-full rounded-lg py-2",
          mini ? "" : ""
        )}
      >
        <div className="text-gray-400 text-sm flex-1">
          {mini ? "Not signed in" : "Not signed in"}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div
          className={clsx(
            "flex gap-3 justify-start items-center w-full rounded-lg py-2 text-white hover:bg-white/5 transition-colors duration-200 hover:cursor-pointer",
            mini ? "" : ""
          )}
        >
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-gray-700 text-white text-sm">
              <AvatarInitials name={`${client.firstName} ${client.lastName}`} />
            </AvatarFallback>
          </Avatar>
          {mini ? null : (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-white truncate">
                {client.firstName} {client.lastName}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {client.email}
              </p>
            </div>
          )}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <Link href="/client/dashboard/profile">
          <DropdownMenuItem>
            <User className="mr-2 h-4 w-4" />
            Profile Settings
          </DropdownMenuItem>
        </Link>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}