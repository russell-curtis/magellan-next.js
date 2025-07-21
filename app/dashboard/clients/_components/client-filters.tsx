'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Filter, X } from 'lucide-react'
import { CLIENT_STATUSES } from '@/db/schema'

interface ClientFiltersProps {
  onSearchChange: (search: string) => void
  onStatusChange: (status: string) => void
  onAdvisorChange: (advisorId: string) => void
  onClearFilters: () => void
  advisors: Array<{ id: string; name: string }>
  currentFilters: {
    search: string
    status: string
    advisorId: string
  }
}

export function ClientFilters({
  onSearchChange,
  onStatusChange,
  onAdvisorChange,
  onClearFilters,
  advisors,
  currentFilters
}: ClientFiltersProps) {
  const [localSearch, setLocalSearch] = useState(currentFilters.search)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchChange(localSearch)
  }

  const hasActiveFilters = currentFilters.search || currentFilters.status || currentFilters.advisorId

  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <form onSubmit={handleSearchSubmit} className="flex gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-9 w-full md:w-[300px]"
          />
        </div>
        <Button type="submit" variant="outline">
          <Filter className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex gap-2">
        <Select value={currentFilters.status || 'all'} onValueChange={onStatusChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CLIENT_STATUSES.map((status) => (
              <SelectItem key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={currentFilters.advisorId || 'all'} onValueChange={onAdvisorChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Advisors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Advisors</SelectItem>
            {advisors.map((advisor) => (
              <SelectItem key={advisor.id} value={advisor.id}>
                {advisor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasActiveFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            <X className="h-4 w-4 mr-2" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}