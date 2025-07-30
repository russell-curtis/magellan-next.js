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
import Image from "next/image";
import { ChevronDown, Users, Building } from "lucide-react";

export default function HeaderNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/50 backdrop-blur-xl" style={{backgroundColor: '#000'}}>
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-18 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center hover:scale-105 transition-transform duration-200">
            <Image 
              src="/logos/logomark-white.svg" 
              alt="Magellan" 
              width={128} 
              height={29} 
              className="h-7 w-auto" 
              priority 
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link 
              href="#features" 
              className="text-slate-300 hover:text-white transition-all duration-300 font-medium relative group"
            >
              Features
              <span className="absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{backgroundColor: '#3f59d9'}}></span>
            </Link>
            <Link 
              href="#benefits" 
              className="text-slate-300 hover:text-white transition-all duration-300 font-medium relative group"
            >
              Benefits
              <span className="absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{backgroundColor: '#3f59d9'}}></span>
            </Link>
            <Link 
              href="/about" 
              className="text-slate-300 hover:text-white transition-all duration-300 font-medium relative group"
            >
              About
              <span className="absolute inset-x-0 -bottom-1 h-0.5 scale-x-0 group-hover:scale-x-100 transition-transform duration-300" style={{backgroundColor: '#3f59d9'}}></span>
            </Link>
          </nav>

          {/* Login Options */}
          <div className="flex items-center gap-3">
            {/* Login Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 px-4 py-2 border-slate-600 bg-slate-800/50 text-slate-300 hover:bg-slate-700 hover:text-white transition-all duration-300 rounded-lg">
                  Login
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-black border-slate-700 text-slate-200">
                <DropdownMenuItem asChild className="hover:bg-slate-700">
                  <Link href="/dashboard" className="flex items-center gap-2 w-full">
                    <Building className="h-4 w-4" />
                    <span>Agent Login</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="hover:bg-slate-700">
                  <Link href="/client/login" className="flex items-center gap-2 w-full">
                    <Users className="h-4 w-4" />
                    <span>Client Login</span>
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* CTA Button */}
            <Button asChild size="sm" className="text-white font-medium px-4 py-2 rounded-lg transition-all duration-300 border-0 purple-button">
              <Link href="/dashboard">
                Start Free Trial
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white hover:bg-slate-800">
              Menu
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}