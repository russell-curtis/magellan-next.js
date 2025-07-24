import { cn } from "@/lib/utils"

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'busy' | 'away'
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  away: 'bg-yellow-500'
}

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3'
}

export function StatusIndicator({ status, className, size = 'sm' }: StatusIndicatorProps) {
  return (
    <div
      className={cn(
        "rounded-full border-2 border-white",
        statusConfig[status],
        sizeConfig[size],
        className
      )}
      aria-label={`${status} status`}
    />
  )
}

interface OnlineStatusAvatarProps {
  children: React.ReactNode
  status?: 'online' | 'offline' | 'busy' | 'away'
  className?: string
}

export function OnlineStatusAvatar({ children, status = 'offline', className }: OnlineStatusAvatarProps) {
  return (
    <div className={cn("relative", className)}>
      {children}
      <StatusIndicator 
        status={status} 
        className="absolute -bottom-0.5 -right-0.5"
        size="sm"
      />
    </div>
  )
}