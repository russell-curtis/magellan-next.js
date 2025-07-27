import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Determines if an application has access to workflow features based on its status
 * @param status - The application status
 * @returns true if the application can access workflow features, false otherwise
 */
export function hasWorkflowAccess(status: string): boolean {
  // Draft applications cannot access workflow features
  // All other statuses (started, submitted, under_review, approved, rejected, archived) can access workflow
  return status !== 'draft'
}

/**
 * Gets a list of application statuses that have workflow access
 * @returns Array of status strings that can access workflow features
 */
export function getWorkflowAccessibleStatuses(): string[] {
  return ['started', 'submitted', 'under_review', 'approved', 'rejected', 'archived']
}
