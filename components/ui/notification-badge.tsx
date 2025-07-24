import { cn } from "@/lib/utils"
import { useEffect, useState } from "react"

interface NotificationBadgeProps {
  count: number
  className?: string
  maxCount?: number
  showZero?: boolean
  pulse?: boolean
  animate?: boolean
}

export function NotificationBadge({ 
  count, 
  className, 
  maxCount = 9, 
  showZero = false,
  pulse = false,
  animate = true
}: NotificationBadgeProps) {
  const [previousCount, setPreviousCount] = useState(count)
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when count increases
  useEffect(() => {
    if (animate && count > previousCount && previousCount > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPreviousCount(count)
  }, [count, previousCount, animate])

  // Don't render if count is 0 and showZero is false (moved after hooks)
  if (count === 0 && !showZero) {
    return null
  }

  // Format count display (e.g., "9+" for counts over maxCount)
  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center",
        "min-w-[20px] px-1 transition-all duration-200", // Ensure minimum width and padding for larger numbers
        "shadow-md ring-2 ring-white", // Add shadow and ring for better visibility
        pulse && "animate-pulse",
        isAnimating && "animate-bounce scale-110",
        className
      )}
      aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
    >
      {displayCount}
    </span>
  )
}

// Variant for menu items with different positioning
export function MenuNotificationBadge({ 
  count, 
  className,
  maxCount = 9,
  showZero = false,
  pulse = false,
  animate = true
}: NotificationBadgeProps) {
  const [previousCount, setPreviousCount] = useState(count)
  const [isAnimating, setIsAnimating] = useState(false)

  // Trigger animation when count increases
  useEffect(() => {
    if (animate && count > previousCount && previousCount > 0) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 600)
      return () => clearTimeout(timer)
    }
    setPreviousCount(count)
  }, [count, previousCount, animate])

  // Don't render if count is 0 and showZero is false (moved after hooks)
  if (count === 0 && !showZero) {
    return null
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString()

  return (
    <span
      className={cn(
        "ml-auto h-5 w-5 rounded-full bg-red-500 text-white text-xs font-medium flex items-center justify-center",
        "min-w-[20px] px-1 transition-all duration-200",
        "shadow-md ring-2 ring-white",
        pulse && "animate-pulse",
        isAnimating && "animate-bounce scale-110",
        className
      )}
      aria-label={`${count} unread message${count === 1 ? '' : 's'}`}
    >
      {displayCount}
    </span>
  )
}