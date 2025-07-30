'use client'

import { useState, useEffect, useCallback } from 'react'
import { authClient } from '@/lib/auth-client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  Briefcase, 
  Search, 
  RefreshCcw, 
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileText,
  Archive,
  Activity,
  Eye,
  Edit
} from 'lucide-react'
import { ApplicationCard } from '@/components/ui/application-card'
import { ApplicationEditModal } from './_components/application-edit-modal'
import { StatsCard } from '@/components/ui/stats-card'

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
  assignedAdvisorId: string | null
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

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [programFilter, setProgramFilter] = useState<string>('all')
  const [customFilter, setCustomFilter] = useState<string[]>([])
  const [currentUser, setCurrentUser] = useState<{
    id: string
    role: string
    firmId: string
  } | null>(null)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingApplicationId, setEditingApplicationId] = useState<string | null>(null)

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const url = new URL('/api/applications', window.location.origin)
      if (statusFilter && statusFilter !== 'all') {
        url.searchParams.set('statusFilter', statusFilter)
      }
      
      const response = await fetch(url.toString())
      
      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to load applications')
      }
    } catch (err) {
      console.error('Error fetching applications:', err)
      setError('Network error while loading applications')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  // Handle edit application
  const handleEditApplication = (applicationId: string) => {
    setEditingApplicationId(applicationId)
    setEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setEditModalOpen(false)
    setEditingApplicationId(null)
  }

  const handleApplicationUpdated = () => {
    fetchApplications() // Refresh the applications list
    handleCloseEditModal()
  }

  // Handle stats card click filtering
  const handleStatsFilter = (filterType: string) => {
    // Reset other filters when using stats card filters
    setPriorityFilter('all')
    setProgramFilter('all')
    
    switch (filterType) {
      case 'active':
        setStatusFilter('all')
        setCustomFilter(['started', 'submitted', 'ready_for_submission', 'submitted_to_government', 'under_review'])
        break
      case 'review':
        setStatusFilter('all')
        setCustomFilter(['submitted', 'ready_for_submission', 'under_review'])
        break
      case 'completed':
        setStatusFilter('all')
        setCustomFilter(['approved', 'rejected'])
        break
      case 'draft':
        setStatusFilter('draft')
        setCustomFilter([])
        break
      default:
        setStatusFilter('all')
        setCustomFilter([])
    }
  }

  // Clear custom filter when regular status filter is used
  const handleStatusFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter)
    setCustomFilter([])
  }

  // Fetch current user
  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const userResponse = await fetch('/api/user/check-setup')
        if (userResponse.ok) {
          const userData = await userResponse.json()
          if (userData.isSetup && userData.user) {
            setCurrentUser({
              id: userData.user.id,
              role: userData.user.role || 'advisor',
              firmId: userData.user.firmId || ''
            })
          }
        }
      } catch (error) {
        console.error('Error fetching current user:', error)
      }
    }
    
    fetchCurrentUser()
    fetchApplications()
  }, [fetchApplications])


  // Filter applications based on search and filters
  const filteredApplications = applications.filter(app => {
    const matchesSearch = 
      app.applicationNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.client?.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.client?.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.client?.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.program?.countryName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.program?.programName.toLowerCase().includes(searchQuery.toLowerCase())

    // Use custom filter if active, otherwise use regular status filter
    const matchesStatus = customFilter.length > 0 
      ? customFilter.includes(app.status)
      : (statusFilter === 'all' || app.status === statusFilter)
    
    const matchesPriority = priorityFilter === 'all' || app.priority === priorityFilter
    const matchesProgram = programFilter === 'all' || app.program?.id === programFilter

    return matchesSearch && matchesStatus && matchesPriority && matchesProgram
  })

  // Get unique programs for filter
  const uniquePrograms = Array.from(
    new Set(applications.map(app => app.program?.id).filter(Boolean))
  ).map(programId => 
    applications.find(app => app.program?.id === programId)?.program
  ).filter(Boolean)

  // Statistics - consolidated metrics
  const stats = {
    total: applications.length,
    draft: applications.filter(app => app.status === 'draft').length,
    started: applications.filter(app => app.status === 'started').length,
    submitted: applications.filter(app => app.status === 'submitted').length,
    ready_for_submission: applications.filter(app => app.status === 'ready_for_submission').length,
    submitted_to_government: applications.filter(app => app.status === 'submitted_to_government').length,
    under_review: applications.filter(app => app.status === 'under_review').length,
    approved: applications.filter(app => app.status === 'approved').length,
    rejected: applications.filter(app => app.status === 'rejected').length,
    archived: applications.filter(app => app.status === 'archived').length,
    // Consolidated metrics
    active: applications.filter(app => ['started', 'submitted', 'ready_for_submission', 'submitted_to_government', 'under_review'].includes(app.status)).length,
    needsReview: applications.filter(app => ['submitted', 'ready_for_submission', 'under_review'].includes(app.status)).length,
    completed: applications.filter(app => ['approved', 'rejected'].includes(app.status)).length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading applications...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Client Applications</h1>
          <p className="mt-1" style={{color: '#00000080'}}>
            Manage CRBI applications across all clients
          </p>
        </div>
        <Button onClick={fetchApplications} disabled={loading}>
          <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Applications"
          value={stats.active}
          icon={<Activity />}
          description="In progress applications"
          color="blue"
          onClick={() => handleStatsFilter('active')}
          isActive={customFilter.length > 0 && customFilter.includes('started') && customFilter.includes('submitted') && customFilter.includes('ready_for_submission') && customFilter.includes('submitted_to_government') && customFilter.includes('under_review')}
          badge={stats.active > 0 ? { text: `${stats.submitted_to_government} At Government`, variant: 'secondary' } : undefined}
        />

        <StatsCard
          title="Needs Review"
          value={stats.needsReview}
          icon={<Eye />}
          description="Awaiting review or processing"
          color="orange"
          onClick={() => handleStatsFilter('review')}
          isActive={customFilter.length > 0 && customFilter.includes('submitted') && customFilter.includes('ready_for_submission') && customFilter.includes('under_review')}
          badge={stats.ready_for_submission > 0 ? { text: `${stats.ready_for_submission} Ready`, variant: 'outline' } : undefined}
        />

        <StatsCard
          title="Completed"
          value={stats.completed}
          icon={<CheckCircle />}
          description={`${stats.approved} approved, ${stats.rejected} rejected`}
          color="green"
          onClick={() => handleStatsFilter('completed')}
          isActive={customFilter.length > 0 && customFilter.includes('approved') && customFilter.includes('rejected')}
          trend={stats.approved > 0 ? { 
            value: Math.round((stats.approved / Math.max(stats.completed, 1)) * 100), 
            label: 'success rate',
            isPositive: true 
          } : undefined}
        />

        <StatsCard
          title="Drafts"
          value={stats.draft}
          icon={<Edit />}
          description="Ready to start"
          color="gray"
          onClick={() => handleStatsFilter('draft')}
          isActive={statusFilter === 'draft'}
          badge={stats.draft > 0 ? { text: 'Needs action', variant: 'outline' } : undefined}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 p-4 bg-white rounded-lg">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search applications, clients, or programs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="started">Started</SelectItem>
              <SelectItem value="submitted">Internal Review</SelectItem>
              <SelectItem value="ready_for_submission">Ready for Submission</SelectItem>
              <SelectItem value="submitted_to_government">Submitted to Government</SelectItem>
              <SelectItem value="under_review">Under Review</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Program" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {uniquePrograms.map((program) => program && (
                <SelectItem key={program.id} value={program.id}>
                  {program.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchApplications}
                className="ml-auto"
              >
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {filteredApplications.length === 0 && !error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || programFilter !== 'all' 
                ? 'No matching applications found' 
                : 'No applications yet'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' || programFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Applications will appear here when clients start their CRBI journey'
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredApplications.map((application) => (
            <ApplicationCard 
              key={application.id} 
              application={application}
              currentUser={currentUser}
              onEditApplication={handleEditApplication}
              onStatusChange={(applicationId, newStatus) => {
                if (newStatus === 'deleted') {
                  // Remove deleted application from the list
                  setApplications(prev => 
                    prev.filter(app => app.id !== applicationId)
                  )
                } else {
                  // Update the local application state for status changes
                  setApplications(prev => 
                    prev.map(app => 
                      app.id === applicationId 
                        ? { ...app, status: newStatus }
                        : app
                    )
                  )
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Edit Application Modal */}
      <ApplicationEditModal
        applicationId={editingApplicationId}
        open={editModalOpen}
        onOpenChange={handleCloseEditModal}
        onApplicationUpdated={handleApplicationUpdated}
      />
    </div>
  )
}