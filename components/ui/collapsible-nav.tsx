"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import clsx from "clsx";
import { usePathname, useRouter } from "next/navigation";
import { NavSection, NavSubItem } from "@/types/navigation";
import { MenuNotificationBadge } from "@/components/ui/notification-badge";

interface CollapsibleNavProps {
  section: NavSection;
  isCollapsed: boolean;
  onToggle: (sectionId: string) => void;
  className?: string;
}

interface NavSubItemProps {
  item: NavSubItem;
  isActive: boolean;
  onClick: () => void;
}

function NavSubItemComponent({ item, isActive, onClick }: NavSubItemProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        "relative flex items-center gap-3 w-full h-8 py-0 pl-10 pr-3 text-[14px] font-normal transition-all duration-200 hover:cursor-pointer group text-white/70 hover:text-white leading-[19.6px] rounded-md hover:bg-white/5",
        isActive && "text-white before:absolute before:left-6 before:top-1/2 before:-translate-y-1/2 before:w-0.5 before:h-4 before:bg-white"
      )}
    >
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <MenuNotificationBadge 
          count={item.badge.count}
          pulse={item.badge.pulse}
        />
      )}
    </div>
  );
}

export function CollapsibleNav({ section, isCollapsed, onToggle, className }: CollapsibleNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = section.href ? pathname === section.href || pathname.startsWith(section.href) : false;
  const hasActiveSubItem = section.subItems?.some(item => 
    pathname === item.href || (item.href !== "/dashboard" && item.href !== "/client/dashboard" && pathname.startsWith(item.href))
  );

  const handleSectionClick = () => {
    if (section.href) {
      router.push(section.href);
    } else if (section.subItems && section.subItems.length > 0) {
      onToggle(section.id);
    }
  };

  const handleSubItemClick = (item: NavSubItem) => {
    router.push(item.href);
  };

  return (
    <div className={clsx("w-full", className)}>
      {/* Main Section */}
      <div
        onClick={handleSectionClick}
        className="relative flex items-center justify-between w-full h-9 py-0 px-3 text-[13px] font-medium transition-all duration-200 hover:cursor-pointer group text-white hover:bg-white/5 rounded-md leading-[18.2px]"
      >
        <span className="flex-1 truncate">{section.label}</span>
        {section.subItems && section.subItems.length > 0 && (
          <div className="flex-shrink-0">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 transition-transform duration-200" />
            ) : (
              <ChevronDown className="h-4 w-4 transition-transform duration-200" />
            )}
          </div>
        )}
      </div>

      {/* Sub Items */}
      {section.subItems && section.subItems.length > 0 && (
        <div className={clsx(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
        )}>
          <div className="mt-1 space-y-1">
            {section.subItems.map((item) => {
              const isSubItemActive = pathname === item.href || (item.href !== "/dashboard" && item.href !== "/client/dashboard" && pathname.startsWith(item.href));
              return (
                <NavSubItemComponent
                  key={item.href}
                  item={item}
                  isActive={isSubItemActive}
                  onClick={() => handleSubItemClick(item)}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarProfileArea({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 w-full py-4 border-t border-white/10 mt-auto">
      {children}
    </div>
  );
}

export function SidebarSettingsItem({ 
  href, 
  icon: Icon, 
  label, 
  isActive 
}: { 
  href: string; 
  icon: React.ComponentType<{ className?: string }>; 
  label: string;
  isActive: boolean;
}) {
  const router = useRouter();

  return (
    <div
      onClick={() => router.push(href)}
      className={clsx(
        "flex items-center gap-3 w-full h-9 py-0 px-3 text-[13px] font-medium transition-all duration-200 hover:cursor-pointer rounded-md leading-[18.2px]",
        isActive
          ? "bg-white/10 text-white hover:bg-white/15"
          : "text-white hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="flex-1 truncate">{label}</span>
    </div>
  );
}