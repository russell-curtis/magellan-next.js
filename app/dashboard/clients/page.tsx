'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, RefreshCw } from 'lucide-react'
import { ClientStats } from './_components/client-stats'
import { ClientFilters } from './_components/client-filters'
import { ClientTable } from './_components/client-table'
import { useToast } from '@/hooks/use-toast'

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

interface ClientStats {
  total: number
  prospects: number
  active: number
  approved: number
  rejected: number
  totalNetWorth: string
  avgInvestmentBudget: string
}

interface Advisor {
  id: string
  name: string
  email: string
  role: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<ClientWithAdvisor[]>([])
  const [stats, setStats] = useState<ClientStats>({
    total: 0,
    prospects: 0,
    active: 0,
    approved: 0,
    rejected: 0,
    totalNetWorth: '0',
    avgInvestmentBudget: '0'
  })
  const [advisors, setAdvisors] = useState<Advisor[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    advisorId: '',
    page: 1
  })
  const [pagination, setPagination] = useState({
    totalCount: 0,
    totalPages: 0
  })

  const { toast } = useToast()

  const fetchClients = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      if (filters.search && filters.search.trim()) params.append('search', filters.search.trim())
      if (filters.status && filters.status !== '' && filters.status !== 'all') params.append('status', filters.status)
      if (filters.advisorId && filters.advisorId !== '' && filters.advisorId !== 'all') params.append('advisorId', filters.advisorId)
      params.append('page', filters.page.toString())
      
      const response = await fetch(`/api/clients?${params}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch clients' }))
        throw new Error(errorData.error || 'Failed to fetch clients')
      }
      
      const data = await response.json()
      setClients(data.clients)
      setPagination({
        totalCount: data.totalCount,
        totalPages: data.totalPages
      })
    } catch (error) {
      console.error('Error fetching clients:', error)
      
      if (error instanceof Error) {
        const errorMessage = error.message.includes('User setup required') 
          ? 'Please complete your account setup first'
          : 'Failed to fetch clients'
          
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive'
        })
      } else {
        toast({
          title: 'Error',
          description: 'Failed to fetch clients',
          variant: 'destructive'
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/clients/analytics')
      
      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }
      
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchAdvisors = async () => {
    try {
      // This would be a separate API endpoint
      // For now, we'll simulate it
      setAdvisors([])
    } catch (error) {
      console.error('Error fetching advisors:', error)
    }
  }

  useEffect(() => {
    fetchClients()
    fetchStats()
    fetchAdvisors()
  }, [filters]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearchChange = (search: string) => {
    setFilters(prev => ({ ...prev, search, page: 1 }))
  }

  const handleStatusChange = (status: string) => {
    setFilters(prev => ({ ...prev, status: status === 'all' ? '' : status, page: 1 }))
  }

  const handleAdvisorChange = (advisorId: string) => {
    setFilters(prev => ({ ...prev, advisorId: advisorId === 'all' ? '' : advisorId, page: 1 }))
  }

  const handleClearFilters = () => {
    setFilters({
      search: '',
      status: '',
      advisorId: '',
      page: 1
    })
  }

  const handleEdit = (client: ClientWithAdvisor) => {
    router.push(`/dashboard/clients/${client.id}/edit`)
  }


  const handleDelete = async (clientId: string) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Failed to delete client')
      }
      
      toast({
        title: 'Success',
        description: 'Client deleted successfully'
      })
      
      fetchClients()
      fetchStats()
    } catch (error) {
      console.error('Error deleting client:', error)
      toast({
        title: 'Error',
        description: 'Failed to delete client',
        variant: 'destructive'
      })
    }
  }

  const handleRefresh = () => {
    fetchClients()
    fetchStats()
  }

  return (
    <section className="flex flex-col items-start justify-start p-6 w-full">
      <div className="w-full space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Client Directory</h1>
            <p className="text-sm" style={{color: '#00000080'}}>
              Manage your CRBI clients and track their applications
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => router.push('/dashboard/clients/intake')}>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </div>
        </div>

      <ClientStats stats={stats} />

      <Card>
        <CardHeader>
          <CardTitle>Client Directory</CardTitle>
          <CardDescription>
            Search and filter your client database
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ClientFilters
            onSearchChange={handleSearchChange}
            onStatusChange={handleStatusChange}
            onAdvisorChange={handleAdvisorChange}
            onClearFilters={handleClearFilters}
            advisors={advisors}
            currentFilters={filters}
          />
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <ClientTable
              clients={clients}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          )}
          
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{color: '#00000080'}}>
                Showing {(filters.page - 1) * 50 + 1} to {Math.min(filters.page * 50, pagination.totalCount)} of {pagination.totalCount} clients
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={filters.page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={filters.page === pagination.totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


      </div>
    </section>
  )
}