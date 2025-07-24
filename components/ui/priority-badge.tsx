import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Zap, Minus, ChevronDown } from "lucide-react"

interface PriorityBadgeProps {
  priority: 'low' | 'normal' | 'high' | 'urgent'
  className?: string
  showIcon?: boolean
  showText?: boolean
  variant?: 'default' | 'minimal'
}

const priorityConfig = {
  urgent: {
    icon: Zap,
    text: 'Urgent',
    variant: 'destructive' as const,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  high: {
    icon: AlertTriangle,
    text: 'High',
    variant: 'secondary' as const,
    className: 'bg-orange-100 text-orange-800 border-orange-200',
  },
  normal: {
    icon: Minus,
    text: 'Normal',
    variant: 'outline' as const,
    className: 'bg-gray-50 text-gray-700 border-gray-200',
  },
  low: {
    icon: ChevronDown,
    text: 'Low',
    variant: 'outline' as const,
    className: 'bg-blue-50 text-blue-700 border-blue-200',
  },
}

export function PriorityBadge({ 
  priority, 
  className, 
  showIcon = true, 
  showText = true,
  variant = 'default'
}: PriorityBadgeProps) {
  const config = priorityConfig[priority]
  const Icon = config.icon

  // Don't show normal priority badges in minimal variant
  if (variant === 'minimal' && priority === 'normal') {
    return null
  }

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "text-xs font-medium flex items-center gap-1",
        variant === 'minimal' && config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {showText && config.text}
    </Badge>
  )
}

interface PriorityIndicatorProps {
  priority: 'low' | 'normal' | 'high' | 'urgent'
  className?: string
}

export function PriorityIndicator({ priority, className }: PriorityIndicatorProps) {
  if (priority === 'normal') return null

  const colors = {
    urgent: 'bg-red-500',
    high: 'bg-orange-500',
    low: 'bg-blue-500',
  }

  return (
    <div
      className={cn(
        "w-1 rounded-full",
        colors[priority as keyof typeof colors],
        className
      )}
      aria-label={`${priority} priority`}
    />
  )
}