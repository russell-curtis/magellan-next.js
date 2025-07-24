/**
 * Formats a date for conversation display with smart formatting
 * - Today: "2:30 PM"
 * - Yesterday: "Yesterday"
 * - This week: "Monday"
 * - Older: "Jan 15"
 */
export function formatConversationDate(date: Date | string): string {
  const messageDate = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  // If the date is today, show time
  if (messageDate >= today) {
    return messageDate.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // If the date is yesterday
  if (messageDate >= yesterday) {
    return 'Yesterday'
  }

  // If the date is within the last week, show day name
  if (messageDate >= oneWeekAgo) {
    return messageDate.toLocaleDateString(undefined, { weekday: 'long' })
  }

  // Otherwise show month and day
  return messageDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric'
  })
}

/**
 * Returns a relative time string for how long ago something happened
 */
export function getRelativeTime(date: Date | string): string {
  const messageDate = new Date(date)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatConversationDate(messageDate)
}

/**
 * Checks if a date is within the last 24 hours
 */
export function isRecent(date: Date | string): boolean {
  const messageDate = new Date(date)
  const now = new Date()
  const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60)
  
  return diffInHours <= 24
}