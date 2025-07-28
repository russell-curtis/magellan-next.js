import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MagellanLogo } from "@/components/ui/magellan-logo";
import { MagellanLogomark } from "@/components/ui/magellan-logomark";
import Link from "next/link";
import { ChevronDown, Users, Building } from "lucide-react";

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            {/* Full logo for desktop */}
            <div className="hidden sm:block">
              <MagellanLogo width={160} height={36} clickable priority />
            </div>
            {/* Logomark for mobile */}
            <div className="sm:hidden">
              <MagellanLogomark size={36} clickable priority />
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="#features" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Features
            </Link>
            <Link 
              href="#programs" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Programs
            </Link>
            <Link 
              href="#pricing" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pricing
            </Link>
            <Link 
              href="/about" 
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              About
            </Link>
          </nav>

          {/* Login Options */}
          <div className="flex items-center gap-3">
            {/* Login Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  Login
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href="/dashboard" className="flex items-center gap-2 w-full">
                    <Building className="h-4 w-4" />
                    <span>Agent Login</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/client/login" className="flex items-center gap-2 w-full">
                    <Users className="h-4 w-4" />
                    <span>Client Login</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTA Button */}
            <Button asChild>
              <Link href="/dashboard">
                Start Free Trial
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button - You can expand this later */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm">
              Menu
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}