import { ClientStatus } from '@/db/schema'

export const getStatusColor = (status: ClientStatus): string => {
  switch (status) {
    case 'prospect':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
    case 'active':
      return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
    case 'approved':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
    case 'rejected':
      return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'
  }
}

export const getStatusIcon = (status: ClientStatus): string => {
  switch (status) {
    case 'prospect':
      return '👁️'
    case 'active':
      return '🟢'
    case 'approved':
      return '✅'
    case 'rejected':
      return '❌'
    default:
      return '❓'
  }
}

export const formatCurrency = (amount: string | number | null | undefined): string => {
  if (!amount || amount === '0') return '—'
  
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount
  
  if (numAmount >= 1000000) {
    return `€${(numAmount / 1000000).toFixed(1)}M`
  } else if (numAmount >= 1000) {
    return `€${(numAmount / 1000).toFixed(0)}K`
  } else {
    return `€${numAmount.toLocaleString()}`
  }
}

export const formatClientName = (firstName: string, lastName: string): string => {
  return `${firstName} ${lastName}`.trim()
}

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—'
  
  const dateObj = typeof date === 'string' ? new Date(date) : date
  
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export const getInitials = (firstName: string, lastName: string): string => {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}