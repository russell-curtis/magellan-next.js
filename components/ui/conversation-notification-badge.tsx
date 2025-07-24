import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface ConversationNotificationBadgeProps {
  unreadCount: number
  className?: string
  maxCount?: number
  showZero?: boolean
  animate?: boolean
  variant?: 'default' | 'minimal' | 'dot'
  isSelected?: boolean
}

export function ConversationNotificationBadge({ 
  unreadCount, 
  className, 
  maxCount = 9, 
  showZero = false,
  animate = true,
  variant = 'default',
  isSelected = false
}: ConversationNotificationBadgeProps) {
  const [previousCount, setPreviousCount] = useState(unreadCount)
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when count increases
  useEffect(() => {
    if (animate && unreadCount > previousCount && previousCount >= 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPreviousCount(unreadCount)
  }, [unreadCount, previousCount, animate])

  // Don't render if count is 0 and showZero is false
  if (unreadCount === 0 && !showZero) {
    return null
  }

  // Format count display (e.g., "9+" for counts over maxCount)
  const displayCount = unreadCount > maxCount ? `${maxCount}+` : unreadCount.toString()

  // Dot variant - just shows a small blue dot
  if (variant === 'dot') {
    return (
      <div
        className={cn(
          "h-2 w-2 rounded-full bg-blue-500 transition-all duration-200",
          isAnimating && "animate-pulse scale-125",
          className
        )}
        aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
      />
    )
  }

  // Minimal variant - smaller badge without border
  if (variant === 'minimal') {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full text-xs font-medium transition-all duration-200",
          "min-w-[16px] h-4 px-1",
          isSelected 
            ? "bg-white text-blue-600" 
            : "bg-blue-500 text-white",
          isAnimating && "animate-bounce scale-110",
          className
        )}
        aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
      >
        {displayCount}
      </span>
    )
  }

  // Default variant - full badge with border and shadow
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full text-white text-xs font-medium transition-all duration-200",
        "min-w-[20px] h-5 px-1.5 shadow-md ring-2 ring-white",
        isSelected 
          ? "bg-white text-blue-600 ring-blue-200" 
          : "bg-blue-500 ring-white",
        isAnimating && "animate-bounce scale-110",
        className
      )}
      aria-label={`${unreadCount} unread message${unreadCount === 1 ? '' : 's'}`}
    >
      {displayCount}
    </span>
  )
}

interface ConversationUnreadIndicatorProps {
  hasUnread: boolean
  className?: string
  animate?: boolean
}

// Simple component to show unread status without count
export function ConversationUnreadIndicator({ 
  hasUnread, 
  className,
  animate = true 
}: ConversationUnreadIndicatorProps) {
  if (!hasUnread) return null

  return (
    <div
      className={cn(
        "h-2 w-2 rounded-full bg-blue-500 transition-all duration-200",
        animate && "animate-pulse",
        className
      )}
      aria-label="Has unread messages"
    />
  )
}

interface ConversationItemWrapperProps {
  children: React.ReactNode
  hasUnread: boolean
  isSelected: boolean
  className?: string
}

// Wrapper component that adds visual emphasis for conversations with unread messages
export function ConversationItemWrapper({ 
  children, 
  hasUnread, 
  isSelected, 
  className 
}: ConversationItemWrapperProps) {
  return (
    <div
      className={cn(
        "transition-all duration-200",
        hasUnread && !isSelected && "bg-blue-50/50 border-l-2 border-blue-200",
        isSelected && "bg-blue-50 border-r-2 border-blue-500",
        className
      )}
    >
      {children}
    </div>
  )
}