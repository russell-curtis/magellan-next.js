'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MapPin, Clock, DollarSign, Users, Filter } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface CRBIRequirements {
  minimum_stay?: string
  investment_options?: string[]
  language_requirement?: boolean
  criminal_background_check?: boolean
  [key: string]: unknown
}

interface CRBIProgram {
  id: string
  countryCode: string
  countryName: string
  programType: 'citizenship' | 'residency'
  programName: string
  minInvestment: string
  processingTimeMonths: number | null
  requirements: CRBIRequirements | null
  isActive: boolean
}

interface CRBIProgramsProps {
  onSelectProgram?: (program: CRBIProgram) => void
  selectedCountries?: string[]
  maxInvestment?: number
  programType?: 'citizenship' | 'residency' | 'all'
}

export function CRBIPrograms({ 
  onSelectProgram,
  selectedCountries = [],
  maxInvestment,
  programType = 'all'
}: CRBIProgramsProps) {
  const [programs, setPrograms] = useState<CRBIProgram[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState({
    type: programType,
    country: 'all',
    sortBy: 'investment'
  })

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/crbi-programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data)
      }
    } catch (error) {
      console.error('Error fetching CRBI programs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}K`
    }
    return `$${num.toLocaleString()}`
  }

  const getCountryFlag = (countryCode: string) => {
    const flagMap: Record<string, string> = {
      'PT': '🇵🇹', 'CY': '🇨🇾', 'MT': '🇲🇹', 'GR': '🇬🇷', 'ES': '🇪🇸',
      'AG': '🇦🇬', 'DM': '🇩🇲', 'GD': '🇬🇩', 'KN': '🇰🇳'
    }
    return flagMap[countryCode] || '🏳️'
  }

  const filteredPrograms = programs
    .filter(program => {
      if (filter.type !== 'all' && program.programType !== filter.type) return false
      if (filter.country !== 'all' && program.countryCode !== filter.country) return false
      if (selectedCountries.length > 0 && !selectedCountries.includes(program.countryCode)) return false
      if (maxInvestment && parseFloat(program.minInvestment) > maxInvestment) return false
      return program.isActive
    })
    .sort((a, b) => {
      switch (filter.sortBy) {
        case 'investment':
          return parseFloat(a.minInvestment) - parseFloat(b.minInvestment)
        case 'time':
          return (a.processingTimeMonths || 999) - (b.processingTimeMonths || 999)
        case 'country':
          return a.countryName.localeCompare(b.countryName)
        default:
          return 0
      }
    })

  const uniqueCountries = Array.from(new Set(programs.map(p => p.countryCode)))
    .map(code => programs.find(p => p.countryCode === code)!)
    .filter(Boolean)

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>CRBI Programs</CardTitle>
          <CardDescription>Available Citizenship & Residency by Investment programs</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          CRBI Programs
        </CardTitle>
        <CardDescription>
          {filteredPrograms.length} available programs from {uniqueCountries.length} countries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Select value={filter.type} onValueChange={(value) => setFilter(prev => ({ ...prev, type: value as 'all' | 'citizenship' | 'residency' }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="citizenship">Citizenship</SelectItem>
              <SelectItem value="residency">Residency</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filter.country} onValueChange={(value) => setFilter(prev => ({ ...prev, country: value }))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Countries</SelectItem>
              {uniqueCountries.map(program => (
                <SelectItem key={program.countryCode} value={program.countryCode}>
                  {getCountryFlag(program.countryCode)} {program.countryName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filter.sortBy} onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value }))}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investment">By Investment</SelectItem>
              <SelectItem value="time">By Time</SelectItem>
              <SelectItem value="country">By Country</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Programs Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPrograms.map(program => (
            <Card key={program.id} className="relative hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getCountryFlag(program.countryCode)}</span>
                      <div>
                        <h4 className="font-semibold text-sm">{program.countryName}</h4>
                        <Badge variant={program.programType === 'citizenship' ? 'default' : 'secondary'} className="text-xs">
                          {program.programType}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {program.programName}
                </p>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">{formatCurrency(program.minInvestment)}</p>
                      <p className="text-xs text-muted-foreground">Min. Investment</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">
                        {program.processingTimeMonths ? `${program.processingTimeMonths}mo` : 'TBD'}
                      </p>
                      <p className="text-xs text-muted-foreground">Processing</p>
                    </div>
                  </div>
                </div>

                {program.requirements && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Key Requirements
                    </h5>
                    <div className="space-y-1">
                      {program.requirements.minimum_stay && (
                        <p className="text-xs flex items-center gap-2">
                          <Users className="h-3 w-3" />
                          Stay: {program.requirements.minimum_stay}
                        </p>
                      )}
                      {program.requirements.investment_options && (
                        <p className="text-xs">
                          Options: {program.requirements.investment_options.slice(0, 2).join(', ')}
                          {program.requirements.investment_options.length > 2 && '...'}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {onSelectProgram && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => onSelectProgram(program)}
                  >
                    Learn More
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredPrograms.length === 0 && (
          <div className="text-center py-8">
            <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No programs found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your filters to see more programs
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}