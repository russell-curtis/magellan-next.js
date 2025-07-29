"use client";

import { Button } from "@/components/ui/button";
import { Dialog, DialogClose } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Brush,
  HomeIcon,
  LucideGitBranchPlus,
  MonitorSmartphone,
} from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardTopNav({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-full">
      {/* Mobile Menu Only - Hidden on Desktop */}
      <Dialog>
        <SheetTrigger className="min-[1024px]:hidden fixed top-4 left-4 z-50 p-2 bg-white border rounded-md shadow-sm">
          <HomeIcon className="h-5 w-5" />
          <span className="sr-only">Open menu</span>
        </SheetTrigger>
        <SheetContent side="left">
          <SheetHeader>
            <Link prefetch={true} href="/">
              <SheetTitle>CRBI Advisory</SheetTitle>
            </Link>
          </SheetHeader>
          <div className="flex flex-col space-y-3 mt-[1rem]">
            <DialogClose asChild>
              <Link prefetch={true} href="/dashboard">
                <Button variant="outline" className="w-full">
                  <HomeIcon className="mr-2 h-4 w-4" />
                  Overview
                </Button>
              </Link>
            </DialogClose>
            <DialogClose asChild>
              <Link prefetch={true} href="/dashboard/applications">
                <Button variant="outline" className="w-full">
                  <Brush className="mr-2 h-4 w-4" />
                  Applications
                </Button>
              </Link>
            </DialogClose>
            <DialogClose asChild>
              <Link prefetch={true} href="/dashboard/clients">
                <Button variant="outline" className="w-full">
                  <MonitorSmartphone className="mr-2 h-4 w-4" />
                  Clients
                </Button>
              </Link>
            </DialogClose>
            <Separator className="my-3" />
            <DialogClose asChild>
              <Link prefetch={true} href="/dashboard/messages">
                <Button variant="outline" className="w-full">
                  <LucideGitBranchPlus className="mr-2 h-4 w-4" />
                  Messages
                </Button>
              </Link>
            </DialogClose>
          </div>
        </SheetContent>
      </Dialog>
      
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
