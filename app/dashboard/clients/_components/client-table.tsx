'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency, formatClientName, formatDate, getInitials, getStatusColor } from '@/lib/utils/client-utils'
import type { ClientStatus } from '@/db/schema'

interface ClientWithAdvisor {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  alternativePhone?: string | null
  preferredContactMethod?: string | null
  status: string
  currentCitizenships?: string[] | null
  currentResidency?: string | null
  currentProfession?: string | null
  industry?: string | null
  urgencyLevel?: string | null
  budgetRange?: string | null
  programQualificationScore?: number | null
  // Legacy fields for backward compatibility
  nationality?: string | null
  netWorthEstimate?: string | null
  investmentBudget?: string | null
  sourceOfFunds?: string | null
  notes: string | null
  tags: string[] | null
  lastContactDate?: string | null
  nextFollowUpDate?: string | null
  assignedAdvisor?: {
    id: string
    name: string
    email: string
    role: string
  } | null
  applicationCount?: number
  createdAt: Date | string
}

interface ClientTableProps {
  clients: ClientWithAdvisor[]
  onEdit: (client: ClientWithAdvisor) => void
  onDelete: (clientId: string) => void
}

export function ClientTable({ clients, onEdit, onDelete }: ClientTableProps) {
  const router = useRouter()
  if (clients.length === 0) {
    return (
      <div className="rounded-md border">
        <div className="p-8 text-center">
          <p className="text-muted-foreground">No clients found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Client</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Budget Range</TableHead>
            <TableHead>Goals & Timeline</TableHead>
            <TableHead>Advisor</TableHead>
            <TableHead>Applications</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[70px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Link href={`/dashboard/clients/${client.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {getInitials(client.firstName, client.lastName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-blue-600 hover:text-blue-800 cursor-pointer">
                        {formatClientName(client.firstName, client.lastName)}
                      </div>
                      {client.email && (
                        <div className="text-sm text-muted-foreground">{client.email}</div>
                      )}
                      {client.currentCitizenships && client.currentCitizenships.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {client.currentCitizenships.slice(0, 2).join(', ')}
                          {client.currentCitizenships.length > 2 && ' +more'}
                        </div>
                      )}
                    </div>
                  </Link>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={getStatusColor(client.status as ClientStatus)}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {client.budgetRange ? (
                      client.budgetRange.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                    ) : (
                      formatCurrency(client.investmentBudget) // Fallback to legacy field
                    )}
                  </div>
                  {client.programQualificationScore && (
                    <div className="text-muted-foreground">
                      Score: {client.programQualificationScore}/100
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">
                    {client.primaryGoals && client.primaryGoals.length > 0 ? (
                      client.primaryGoals.slice(0, 2).map(goal => 
                        goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      ).join(', ')
                    ) : (
                      'Not specified'
                    )}
                    {client.primaryGoals && client.primaryGoals.length > 2 && (
                      <span className="text-muted-foreground"> +{client.primaryGoals.length - 2} more</span>
                    )}
                  </div>
                  <div className="text-muted-foreground">
                    {client.desiredTimeline 
                      ? client.desiredTimeline.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                      : 'Timeline not set'
                    }
                    {client.urgencyLevel && client.urgencyLevel !== 'low' && (
                      <Badge variant="outline" className="ml-1 text-xs">
                        {client.urgencyLevel}
                      </Badge>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {client.assignedAdvisor ? (
                  <div className="text-sm">
                    <div className="font-medium">{client.assignedAdvisor.name}</div>
                    <div className="text-muted-foreground">{client.assignedAdvisor.role}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Unassigned</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant="outline">
                  {client.applicationCount || 0}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(client.createdAt)}</TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => router.push(`/dashboard/clients/${client.id}`)}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(client)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Client
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(client.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}