'use client'

import { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: number
  icon: ReactNode
  description?: string
  trend?: {
    value: number
    label: string
    isPositive?: boolean
  }
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray' | 'purple'
  onClick?: () => void
  isActive?: boolean
  isLoading?: boolean
  badge?: {
    text: string
    variant?: 'default' | 'secondary' | 'destructive' | 'outline'
  }
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-blue-100',
    iconText: 'text-blue-600',
    accent: 'border-blue-200',
    hover: 'hover:bg-blue-100',
    active: 'ring-2 ring-blue-500 bg-blue-50'
  },
  green: {
    bg: 'bg-green-50',
    iconBg: 'bg-green-100', 
    iconText: 'text-green-600',
    accent: 'border-green-200',
    hover: 'hover:bg-green-100',
    active: 'ring-2 ring-green-500 bg-green-50'
  },
  orange: {
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    iconText: 'text-orange-600', 
    accent: 'border-orange-200',
    hover: 'hover:bg-orange-100',
    active: 'ring-2 ring-orange-500 bg-orange-50'
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-red-100',
    iconText: 'text-red-600',
    accent: 'border-red-200', 
    hover: 'hover:bg-red-100',
    active: 'ring-2 ring-red-500 bg-red-50'
  },
  gray: {
    bg: 'bg-gray-50',
    iconBg: 'bg-gray-100',
    iconText: 'text-gray-600',
    accent: 'border-gray-200',
    hover: 'hover:bg-gray-100', 
    active: 'ring-2 ring-gray-500 bg-gray-50'
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-purple-100',
    iconText: 'text-purple-600',
    accent: 'border-purple-200',
    hover: 'hover:bg-purple-100',
    active: 'ring-2 ring-purple-500 bg-purple-50'
  }
}

export function StatsCard({
  title,
  value,
  icon,
  description,
  trend,
  color,
  onClick,
  isActive = false,
  isLoading = false,
  badge
}: StatsCardProps) {
  const colorClass = colorVariants[color] || colorVariants.gray // Fallback to gray if color is invalid
  
  const cardClasses = cn(
    'transition-all duration-200 border cursor-pointer',
    colorClass.bg,
    colorClass.accent,
    onClick && colorClass.hover,
    isActive && colorClass.active,
    isLoading && 'opacity-50 cursor-not-allowed'
  )

  const content = (
    <CardContent className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-4">
          {/* Icon */}
          <div className={cn('p-3 rounded-lg', colorClass.iconBg)}>
            <div className={cn('h-6 w-6', colorClass.iconText)}>
              {icon}
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-medium text-gray-600 truncate">
                {title}
              </h3>
              {badge && (
                <Badge variant={badge.variant || 'secondary'} className="text-xs">
                  {badge.text}
                </Badge>
              )}
            </div>
            
            <div className="flex items-baseline space-x-3">
              {isLoading ? (
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">
                  {value.toLocaleString()}
                </p>
              )}
              
              {trend && !isLoading && (
                <div className={cn(
                  'text-xs font-medium px-2 py-1 rounded-full',
                  trend.isPositive 
                    ? 'text-green-700 bg-green-100' 
                    : 'text-red-700 bg-red-100'
                )}>
                  {trend.isPositive ? '↗' : '↘'} {trend.value > 0 ? '+' : ''}{trend.value}
                </div>
              )}
            </div>
            
            {description && !isLoading && (
              <p className="text-xs text-gray-500 mt-1 truncate">
                {description}
              </p>
            )}
            
            {trend?.label && !isLoading && (
              <p className="text-xs text-gray-400 mt-1">
                {trend.label}
              </p>
            )}
          </div>
        </div>
      </div>
    </CardContent>
  )

  return onClick ? (
    <Card 
      className={cardClasses}
      onClick={!isLoading ? onClick : undefined}
      role="button"
      tabIndex={!isLoading ? 0 : -1}
      onKeyDown={(e) => {
        if (!isLoading && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick?.()
        }
      }}
    >
      {content}
    </Card>
  ) : (
    <Card className={cardClasses}>
      {content}
    </Card>
  )
}