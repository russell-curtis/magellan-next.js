'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatCurrency, formatClientName, formatDate, getInitials, getStatusColor } from '@/lib/utils/client-utils'
import type { ClientStatus } from '@/db/schema'
import Link from 'next/link'

interface ClientWithAdvisor {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: string
  nationality: string | null
  netWorthEstimate: string | null
  investmentBudget: string | null
  sourceOfFunds: string | null
  notes: string | null
  tags: string[] | null
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
            <TableHead>Net Worth</TableHead>
            <TableHead>Investment Budget</TableHead>
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
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(client.firstName, client.lastName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-medium">
                      {formatClientName(client.firstName, client.lastName)}
                    </div>
                    {client.email && (
                      <div className="text-sm text-muted-foreground">{client.email}</div>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={getStatusColor(client.status as ClientStatus)}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </Badge>
              </TableCell>
              <TableCell>{formatCurrency(client.netWorthEstimate)}</TableCell>
              <TableCell>{formatCurrency(client.investmentBudget)}</TableCell>
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
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/clients/${client.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Link>
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