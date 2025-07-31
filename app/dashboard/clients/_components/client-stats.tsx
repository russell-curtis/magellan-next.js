'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Eye, UserCheck, TrendingUp } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/client-utils'

interface ClientStatsProps {
  stats: {
    total: number
    prospects: number
    active: number
    approved: number
    rejected: number
    totalNetWorth: string
    avgInvestmentBudget: string
  }
}

export function ClientStats({ stats }: ClientStatsProps) {
  const statCards: Array<{
    title: string
    value: number | string
    icon: React.ComponentType<{ className?: string }>
    color: string
    subtitle?: string
  }> = [
    {
      title: 'Total Clients',
      value: stats.total,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Prospects',
      value: stats.prospects,
      icon: Eye,
      color: 'text-orange-600'
    },
    {
      title: 'Active',
      value: stats.active,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Approved',
      value: stats.approved,
      icon: UserCheck,
      color: 'text-emerald-600'
    },
    {
      title: 'Portfolio Value',
      value: formatCurrency(stats.totalNetWorth),
      icon: TrendingUp,
      color: 'text-purple-600',
      subtitle: `Avg: ${formatCurrency(stats.avgInvestmentBudget)}`
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
      {statCards.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {stat.subtitle && (
              <div className="text-xs text-muted-foreground mt-1">{stat.subtitle}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}