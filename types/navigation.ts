import { LucideIcon } from "lucide-react";

export interface NavSubItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  badge?: {
    count: number;
    pulse?: boolean;
  };
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string; // Optional direct link for section
  collapsed?: boolean;
  subItems?: NavSubItem[];
}

export interface SidebarConfig {
  sections: NavSection[];
  bottomItems?: {
    settings?: {
      href: string;
      icon: LucideIcon;
    };
    userProfile?: boolean;
  };
}

export interface SidebarState {
  collapsedSections: Record<string, boolean>;
  activeSection?: string;
  activeSubItem?: string;
}