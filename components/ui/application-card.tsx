'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  XCircle, 
  FileText,
  Globe,
  DollarSign,
  Calendar,
  MoreHorizontal,
  Edit,
  MessageSquare
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface Application {
  id: string
  applicationNumber: string
  status: string
  priority: string
  investmentAmount: string | null
  investmentType: string | null
  submittedAt: string | null
  decisionExpectedAt: string | null
  decidedAt: string | null
  notes: string | null
  internalNotes: string | null
  createdAt: string
  updatedAt: string
  client: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
  program: {
    id: string
    countryName: string
    programName: string
    programType: string
    minInvestment: string
    processingTimeMonths: number
  } | null
}

interface ApplicationCardProps {
  application: Application
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'under_review':
        return <Clock className="h-5 w-5 text-blue-600" />
      case 'submitted':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />
      case 'draft':
      default:
        return <FileText className="h-5 w-5 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800'
      case 'under_review':
        return 'bg-blue-100 text-blue-800'
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800'
      case 'rejected':
        return 'bg-red-100 text-red-800'
      case 'draft':
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800'
      case 'high':
        return 'bg-orange-100 text-orange-800'
      case 'medium':
        return 'bg-blue-100 text-blue-800'
      case 'low':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatus = (status: string) => {
    return status.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
  }

  const formatPriority = (priority: string) => {
    return priority.charAt(0).toUpperCase() + priority.slice(1)
  }

  // Get contextual information based on status
  const getContextualInfo = () => {
    switch (application.status) {
      case 'submitted':
        return {
          label: 'Submitted',
          value: application.submittedAt ? formatDate(application.submittedAt) : 'Recently',
          icon: <Calendar className="h-4 w-4 text-gray-400" />
        }
      case 'under_review':
        return {
          label: 'Expected Decision',
          value: application.decisionExpectedAt ? formatDate(application.decisionExpectedAt) : 'TBD',
          icon: <Clock className="h-4 w-4 text-gray-400" />
        }
      case 'approved':
        return {
          label: 'Approved',
          value: application.decidedAt ? formatDate(application.decidedAt) : 'Recently',
          icon: <CheckCircle className="h-4 w-4 text-green-500" />
        }
      case 'rejected':
        return {
          label: 'Rejected',
          value: application.decidedAt ? formatDate(application.decidedAt) : 'Recently',
          icon: <XCircle className="h-4 w-4 text-red-500" />
        }
      default:
        return {
          label: 'Created',
          value: formatDate(application.createdAt),
          icon: <Calendar className="h-4 w-4 text-gray-400" />
        }
    }
  }

  const contextualInfo = getContextualInfo()

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-x-6">
          {/* Left section: Status icon, Application info, Client */}
          <div className="flex items-center space-x-4 min-w-0 flex-1">
            {/* Status icon */}
            <div className="flex-shrink-0">
              {getStatusIcon(application.status)}
            </div>

            {/* Application details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {application.applicationNumber}
                </h3>
                <Badge className={getStatusColor(application.status)}>
                  {formatStatus(application.status)}
                </Badge>
                {application.priority !== 'medium' && (
                  <Badge variant="outline" className={getPriorityColor(application.priority)}>
                    {formatPriority(application.priority)}
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-600">
                {/* Client info */}
                <div className="flex items-center space-x-2 min-w-0">
                  <Avatar className="h-6 w-6 flex-shrink-0">
                    <AvatarFallback>
                      <AvatarInitials 
                        name={application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown'} 
                      />
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium truncate">
                    {application.client ? `${application.client.firstName} ${application.client.lastName}` : 'Unknown Client'}
                  </span>
                </div>

                <span className="text-gray-300">•</span>

                {/* Program info */}
                <div className="flex items-center space-x-1 min-w-0">
                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate">
                    {application.program?.countryName || 'Unknown Program'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Center section: Investment & Contextual info */}
          <div className="flex items-center space-x-8 flex-shrink-0">
            {/* Investment amount */}
            <div className="text-center">
              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                <DollarSign className="h-4 w-4" />
                <span>Investment</span>
              </div>
              <div className="font-semibold text-gray-900">
                {application.investmentAmount ? 
                  formatCurrency(parseFloat(application.investmentAmount)) : 
                  'Not specified'
                }
              </div>
            </div>

            {/* Contextual information */}
            <div className="text-center">
              <div className="flex items-center space-x-1 text-sm text-gray-500 mb-1">
                {contextualInfo.icon}
                <span>{contextualInfo.label}</span>
              </div>
              <div className="font-semibold text-gray-900">
                {contextualInfo.value}
              </div>
            </div>
          </div>

          {/* Right section: Actions */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            {/* Primary action - Open Application */}
            <Link href={`/dashboard/applications/${application.id}/workflow`}>
              <Button 
                size="sm" 
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4"
              >
                Open Application
              </Button>
            </Link>

            {/* Secondary actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Application
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message Client
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}