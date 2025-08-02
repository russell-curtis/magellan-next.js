"use client"

import { useVersion } from '@/lib/hooks/use-version'
import { cn } from '@/lib/utils'

interface VersionBadgeProps {
  className?: string
}

export function VersionBadge({ className }: VersionBadgeProps) {
  const { version } = useVersion()

  return (
    <div 
      className={cn(
        "inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-700 bg-[#1a1a1a] backdrop-blur-sm",
        className
      )}
    >
      {/* Blue indicator dot */}
      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
      
      {/* Version text */}
      <span className="text-xs font-medium text-white/70 leading-none">
        {version}
      </span>
    </div>
  )
}