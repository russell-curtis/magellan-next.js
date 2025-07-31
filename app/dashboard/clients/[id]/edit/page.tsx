'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Save,
  User, 
  Globe, 
  GraduationCap, 
  Target, 
  MapPin, 
  Clock, 
  DollarSign, 
  Shield, 
  Users, 
  Plus,
  X,
  CheckCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { 
  CLIENT_CONTACT_METHODS,
  CLIENT_EDUCATION_LEVELS,
  CLIENT_EMPLOYMENT_STATUSES,
  CLIENT_TIMELINES,
  CLIENT_TRAVEL_FREQUENCIES,
  CLIENT_READINESS_LEVELS,
  CLIENT_INVESTMENT_EXPERIENCES,
  CLIENT_BUDGET_RANGES,
  CLIENT_URGENCY_LEVELS,
  type CreateClientInput,
  type FamilyMemberInput
} from '@/lib/validations/clients'
import { CLIENT_STATUSES } from '@/db/schema'

interface ClientWithFullDetails extends CreateClientInput {
  id: string
  createdAt: string | Date
  updatedAt: string | Date
  familyMembers?: Array<FamilyMemberInput & { id?: string }>
}

const EDIT_TABS = [
  {
    id: 'basic',
    label: 'Basic Information',
    icon: User,
    description: 'Contact details and personal information'
  },
  {
    id: 'identity',
    label: 'Identity & Citizenship',
    icon: Globe,
    description: 'Citizenship, residency, and documents'
  },
  {
    id: 'professional',
    label: 'Professional',
    icon: GraduationCap,
    description: 'Employment and education background'
  },
  {
    id: 'goals',
    label: 'Goals & Timeline',
    icon: Target,
    description: 'Immigration objectives and urgency'
  },
  {
    id: 'preferences',
    label: 'Preferences',
    icon: MapPin,
    description: 'Geographic and lifestyle preferences'
  },
  {
    id: 'history',
    label: 'Immigration History',
    icon: Clock,
    description: 'Previous applications and issues'
  },
  {
    id: 'financial',
    label: 'Financial Profile',
    icon: DollarSign,
    description: 'Investment capacity and readiness'
  },
  {
    id: 'compliance',
    label: 'Compliance',
    icon: Shield,
    description: 'Background checks and due diligence'
  },
  {
    id: 'family',
    label: 'Family Members',
    icon: Users,
    description: 'Dependents and family composition'
  }
]

export default function ClientEditPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const clientId = params.id as string
  
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('basic')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  
  const [formData, setFormData] = useState<Partial<ClientWithFullDetails>>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternativePhone: '',
    preferredContactMethod: 'email',
    currentCitizenships: [],
    languagesSpoken: [],
    primaryGoals: [],
    geographicPreferences: [],
    sourceOfFundsTypes: [],
    investmentPreferences: [],
    professionalLicenses: [],
    tags: [],
    visaDenials: false,
    immigrationIssues: false,
    isPep: false,
    criminalBackground: false,
    financialAdvisorsInvolved: false,
    familyMembers: []
  })

  const [familyMembers, setFamilyMembers] = useState<Array<Partial<FamilyMemberInput & { id?: string }>>>([])

  // Load client data
  useEffect(() => {
    const fetchClient = async () => {
      try {
        const response = await fetch(`/api/clients/${clientId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch client')
        }
        const client = await response.json()
        setFormData(client)
        setFamilyMembers(client.familyMembers || [])
      } catch (error) {
        console.error('Error fetching client:', error)
        toast({
          title: 'Error',
          description: 'Failed to load client data',
          variant: 'destructive'
        })
        router.push('/dashboard/clients')
      } finally {
        setLoading(false)
      }
    }

    if (clientId) {
      fetchClient()
    }
  }, [clientId, router, toast])

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    setHasUnsavedChanges(true)
  }

  const addToArray = (field: string, value: string) => {
    if (!value.trim()) return
    const currentArray = (formData[field as keyof CreateClientInput] as string[]) || []
    if (!currentArray.includes(value.trim())) {
      updateFormData(field, [...currentArray, value.trim()])
    }
  }

  const removeFromArray = (field: string, value: string) => {
    const currentArray = (formData[field as keyof CreateClientInput] as string[]) || []
    updateFormData(field, currentArray.filter(item => item !== value))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          familyMembers: familyMembers.filter(member => 
            member.firstName && member.lastName && member.relationship
          )
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update client')
      }

      toast({
        title: 'Success',
        description: 'Client profile updated successfully!'
      })

      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: 'Error',
        description: 'Failed to update client profile',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const handleExit = () => {
    if (hasUnsavedChanges) {
      if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
        router.push(`/dashboard/clients/${clientId}`)
      }
    } else {
      router.push(`/dashboard/clients/${clientId}`)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName || ''}
                  onChange={(e) => updateFormData('firstName', e.target.value)}
                  placeholder="Enter first name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName || ''}
                  onChange={(e) => updateFormData('lastName', e.target.value)}
                  placeholder="Enter last name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="client@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Primary Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone || ''}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="alternativePhone">Alternative Phone</Label>
                <Input
                  id="alternativePhone"
                  value={formData.alternativePhone || ''}
                  onChange={(e) => updateFormData('alternativePhone', e.target.value)}
                  placeholder="Optional second number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
                <Select 
                  value={formData.preferredContactMethod || 'email'} 
                  onValueChange={(value) => updateFormData('preferredContactMethod', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_CONTACT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="status">Client Status</Label>
                <Select 
                  value={formData.status || 'prospect'} 
                  onValueChange={(value) => updateFormData('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hearAboutUs">How did you hear about us?</Label>
                <Input
                  id="hearAboutUs"
                  value={formData.hearAboutUs || ''}
                  onChange={(e) => updateFormData('hearAboutUs', e.target.value)}
                  placeholder="Referral source, website, etc."
                />
              </div>
            </div>
          </div>
        )

      case 'identity':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth || ''}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="placeOfBirth">Place of Birth</Label>
                <Input
                  id="placeOfBirth"
                  value={formData.placeOfBirth || ''}
                  onChange={(e) => updateFormData('placeOfBirth', e.target.value)}
                  placeholder="City, Country"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Current Citizenships</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.currentCitizenships || []).map((citizenship) => (
                  <Badge key={citizenship} variant="secondary" className="flex items-center gap-1">
                    {citizenship}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeFromArray('currentCitizenships', citizenship)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="newCitizenship"
                  placeholder="Enter country code (e.g., US, CA, UK)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray('currentCitizenships', (e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('newCitizenship') as HTMLInputElement
                    if (input.value) {
                      addToArray('currentCitizenships', input.value)
                      input.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currentResidency">Current Country of Residence</Label>
              <Input
                id="currentResidency"
                value={formData.currentResidency || ''}
                onChange={(e) => updateFormData('currentResidency', e.target.value)}
                placeholder="Country where you currently live"
              />
            </div>
          </div>
        )

      // Add other tab cases here (professional, goals, etc.)
      // For brevity, I'll add placeholders that can be expanded
      case 'financial':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Investment Budget Range</Label>
                <Select 
                  value={formData.budgetRange || ''} 
                  onValueChange={(value) => updateFormData('budgetRange', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select budget range" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_BUDGET_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>
                        {range}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sourceOfFundsReadiness">Source of Funds Readiness</Label>
                <Select 
                  value={formData.sourceOfFundsReadiness || ''} 
                  onValueChange={(value) => updateFormData('sourceOfFundsReadiness', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select readiness" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_READINESS_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investmentExperience">Investment Experience</Label>
              <Select 
                value={formData.investmentExperience || ''} 
                onValueChange={(value) => updateFormData('investmentExperience', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  {CLIENT_INVESTMENT_EXPERIENCES.map((exp) => (
                    <SelectItem key={exp} value={exp}>
                      {exp.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <h3 className="text-lg font-medium mb-2">Section In Development</h3>
              <p>This section is being built. Please use the available sections for now.</p>
            </div>
          </div>
        )
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading client profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleExit}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Profile
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Edit Client: {formData.firstName} {formData.lastName}
                </h1>
                <p className="text-sm text-gray-600">
                  Comprehensive profile management
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              {hasUnsavedChanges && (
                <div className="text-sm text-orange-600 flex items-center">
                  <div className="w-2 h-2 bg-orange-600 rounded-full mr-2"></div>
                  Unsaved changes
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-9 h-auto p-1">
                {EDIT_TABS.map((tab) => {
                  const TabIcon = tab.icon
                  return (
                    <TabsTrigger 
                      key={tab.id} 
                      value={tab.id}
                      className="flex flex-col items-center space-y-1 h-16 text-xs"
                    >
                      <TabIcon className="h-4 w-4" />
                      <span className="truncate">{tab.label}</span>
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </div>

            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-semibold text-gray-900">
                  {EDIT_TABS.find(tab => tab.id === activeTab)?.label}
                </h2>
                <p className="text-gray-600">
                  {EDIT_TABS.find(tab => tab.id === activeTab)?.description}
                </p>
              </div>

              {EDIT_TABS.map((tab) => (
                <TabsContent key={tab.id} value={tab.id} className="mt-0">
                  {renderTabContent()}
                </TabsContent>
              ))}
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}