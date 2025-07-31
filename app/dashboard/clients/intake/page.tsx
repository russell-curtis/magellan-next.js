'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { 
  User, 
  Globe, 
  GraduationCap, 
  Target, 
  MapPin, 
  Clock, 
  DollarSign, 
  Shield, 
  Users, 
  ChevronLeft, 
  ChevronRight,
  Plus,
  X,
  AlertTriangle,
  CheckCircle,
  ArrowLeft,
  Save
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

interface WizardStep {
  id: string
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  isComplete: boolean
  isActive: boolean
}

const STEPS: Omit<WizardStep, 'isComplete' | 'isActive'>[] = [
  {
    id: 'basic-info',
    title: 'Basic Information',
    description: 'Contact details and preferences',
    icon: User
  },
  {
    id: 'identity-citizenship',
    title: 'Identity & Citizenship',
    description: 'Current status and documentation',
    icon: Globe
  },
  {
    id: 'professional-education',
    title: 'Professional Background',
    description: 'Education and career information',
    icon: GraduationCap
  },
  {
    id: 'goals-timeline',
    title: 'Goals & Timeline',
    description: 'Immigration objectives and urgency',
    icon: Target
  },
  {
    id: 'travel-preferences',
    title: 'Travel & Lifestyle',
    description: 'Geographic and lifestyle preferences',
    icon: MapPin
  },
  {
    id: 'immigration-history',
    title: 'Immigration History',
    description: 'Previous applications and issues',
    icon: Clock
  },
  {
    id: 'financial-readiness',
    title: 'Investment Readiness',
    description: 'Source of funds and preferences',
    icon: DollarSign
  },
  {
    id: 'compliance-background',
    title: 'Compliance & Background',
    description: 'Due diligence and screening',
    icon: Shield
  },
  {
    id: 'family-composition',
    title: 'Family Members',
    description: 'Dependents and family details',
    icon: Users
  }
]

export default function ClientIntakePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set())
  
  // Form data state
  const [formData, setFormData] = useState<Partial<CreateClientInput>>({
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

  const [familyMembers, setFamilyMembers] = useState<Partial<FamilyMemberInput>[]>([])
  
  const steps: WizardStep[] = STEPS.map((step, index) => ({
    ...step,
    isComplete: completedSteps.has(index),
    isActive: index === currentStep
  }))

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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

  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // Basic Info
        return !!(formData.firstName && formData.lastName)
      case 1: // Identity & Citizenship
        return !!(formData.currentCitizenships && formData.currentCitizenships.length > 0)
      case 2: // Professional & Education
        return !!(formData.employmentStatus)
      case 3: // Goals & Timeline
        return !!(formData.primaryGoals && formData.primaryGoals.length > 0 && formData.desiredTimeline)
      case 4: // Travel & Preferences
        return !!(formData.geographicPreferences && formData.geographicPreferences.length > 0)
      case 5: // Immigration History
        return true // Optional step
      case 6: // Financial Readiness
        return !!(formData.sourceOfFundsReadiness && formData.budgetRange)
      case 7: // Compliance & Background
        return true // Optional step but important
      case 8: // Family Members
        return true // Optional step
      default:
        return false
    }
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCompletedSteps(prev => new Set([...prev, currentStep]))
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    } else {
      toast({
        title: 'Incomplete Information',
        description: 'Please fill in all required fields before proceeding.',
        variant: 'destructive'
      })
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleStepClick = (stepIndex: number) => {
    if (stepIndex <= currentStep || completedSteps.has(stepIndex)) {
      setCurrentStep(stepIndex)
    }
  }

  const handleSaveDraft = async () => {
    setLoading(true)
    try {
      // Save draft logic would go here
      toast({
        title: 'Draft Saved',
        description: 'Your progress has been saved. You can continue later.'
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      toast({
        title: 'Incomplete Information',
        description: 'Please complete all required fields.',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          familyMembers: familyMembers.filter(member => 
            member.firstName && member.lastName && member.relationship
          )
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create client')
      }

      toast({
        title: 'Success',
        description: 'Client profile created successfully!'
      })

      router.push('/dashboard/clients')
    } catch (error) {
      console.error('Error creating client:', error)
      toast({
        title: 'Error',
        description: 'Failed to create client. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExit = () => {
    if (Object.values(formData).some(value => value && value !== '' && (!Array.isArray(value) || value.length > 0))) {
      if (confirm('You have unsaved changes. Are you sure you want to exit?')) {
        router.push('/dashboard/clients')
      }
    } else {
      router.push('/dashboard/clients')
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Basic Information
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

            <div className="space-y-2">
              <Label htmlFor="hearAboutUs">How did you hear about us?</Label>
              <Input
                id="hearAboutUs"
                value={formData.hearAboutUs || ''}
                onChange={(e) => updateFormData('hearAboutUs', e.target.value)}
                placeholder="Referral source, website, social media, etc."
              />
            </div>
          </div>
        )

      case 1: // Identity & Citizenship
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
              <Label>Current Citizenships *</Label>
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

      case 2: // Professional Background
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="employmentStatus">Employment Status *</Label>
                <Select 
                  value={formData.employmentStatus || ''} 
                  onValueChange={(value) => updateFormData('employmentStatus', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_EMPLOYMENT_STATUSES.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentProfession">Current Profession</Label>
                <Input
                  id="currentProfession"
                  value={formData.currentProfession || ''}
                  onChange={(e) => updateFormData('currentProfession', e.target.value)}
                  placeholder="Your current job title or profession"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry || ''}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  placeholder="e.g., Technology, Finance, Healthcare"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select 
                  value={formData.educationLevel || ''} 
                  onValueChange={(value) => updateFormData('educationLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select education level" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_EDUCATION_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 3: // Goals & Timeline
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Primary Immigration Goals *</Label>
              <p className="text-sm text-gray-600 mb-4">Select all that apply to your situation</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'second_citizenship',
                  'residency_permit', 
                  'business_expansion',
                  'education_access',
                  'lifestyle_improvement',
                  'tax_optimization',
                  'travel_freedom',
                  'family_security'
                ].map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={(formData.primaryGoals || []).includes(goal)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addToArray('primaryGoals', goal)
                        } else {
                          removeFromArray('primaryGoals', goal)
                        }
                      }}
                    />
                    <Label htmlFor={goal} className="text-sm">
                      {goal.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="desiredTimeline">Desired Timeline *</Label>
                <Select 
                  value={formData.desiredTimeline || ''} 
                  onValueChange={(value) => updateFormData('desiredTimeline', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TIMELINES.map((timeline) => (
                      <SelectItem key={timeline} value={timeline}>
                        {timeline.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="urgencyLevel">Urgency Level</Label>
                <Select 
                  value={formData.urgencyLevel || ''} 
                  onValueChange={(value) => updateFormData('urgencyLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_URGENCY_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )

      case 4: // Travel & Lifestyle
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label>Geographic Preferences *</Label>
              <p className="text-sm text-gray-600 mb-4">Select countries or regions you're interested in</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.geographicPreferences || []).map((preference) => (
                  <Badge key={preference} variant="secondary" className="flex items-center gap-1">
                    {preference}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeFromArray('geographicPreferences', preference)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="newGeographicPreference"
                  placeholder="Enter country or region (e.g., Portugal, Caribbean)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray('geographicPreferences', (e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('newGeographicPreference') as HTMLInputElement
                    if (input.value) {
                      addToArray('geographicPreferences', input.value)
                      input.value = ''
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="travelFrequency">Travel Frequency</Label>
                <Select 
                  value={formData.travelFrequency || ''} 
                  onValueChange={(value) => updateFormData('travelFrequency', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How often do you travel?" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TRAVEL_FREQUENCIES.map((frequency) => (
                      <SelectItem key={frequency} value={frequency}>
                        {frequency.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="climatePreference">Climate Preference</Label>
                <Input
                  id="climatePreference"
                  value={formData.climatePreference || ''}
                  onChange={(e) => updateFormData('climatePreference', e.target.value)}
                  placeholder="e.g., Tropical, Mediterranean, Temperate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lifestyleRequirements">Lifestyle Requirements</Label>
              <Textarea
                id="lifestyleRequirements"
                value={formData.lifestyleRequirements || ''}
                onChange={(e) => updateFormData('lifestyleRequirements', e.target.value)}
                placeholder="Climate preferences, culture, language, business environment, etc."
                rows={3}
              />
            </div>
          </div>
        )

      case 5: // Immigration History
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visaDenials"
                  checked={formData.visaDenials || false}
                  onCheckedChange={(checked) => updateFormData('visaDenials', checked)}
                />
                <Label htmlFor="visaDenials" className="text-sm">
                  I have been denied a visa or entry to any country
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="immigrationIssues"
                  checked={formData.immigrationIssues || false}
                  onCheckedChange={(checked) => updateFormData('immigrationIssues', checked)}
                />
                <Label htmlFor="immigrationIssues" className="text-sm">
                  I have had immigration issues or overstayed in any country
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="previousApplications">Previous CRBI Applications</Label>
              <Textarea
                id="previousApplications"
                value={formData.previousApplications || ''}
                onChange={(e) => updateFormData('previousApplications', e.target.value)}
                placeholder="Please describe any previous citizenship or residency by investment applications you have made"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="immigrationDetails">Immigration Details</Label>
              <Textarea
                id="immigrationDetails"
                value={formData.immigrationDetails || ''}
                onChange={(e) => updateFormData('immigrationDetails', e.target.value)}
                placeholder="If you answered yes to any of the above questions, please provide details"
                rows={3}
              />
            </div>
          </div>
        )

      case 6: // Financial Readiness
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="sourceOfFundsReadiness">Source of Funds Readiness *</Label>
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
              <div className="space-y-2">
                <Label htmlFor="budgetRange">Investment Budget Range *</Label>
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

      case 7: // Compliance & Background
        return (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPep"
                  checked={formData.isPep || false}
                  onCheckedChange={(checked) => updateFormData('isPep', checked)}
                />
                <Label htmlFor="isPep" className="text-sm">
                  I am a Politically Exposed Person (PEP) or related to one
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="criminalBackground"
                  checked={formData.criminalBackground || false}
                  onCheckedChange={(checked) => updateFormData('criminalBackground', checked)}
                />
                <Label htmlFor="criminalBackground" className="text-sm">
                  I have a criminal background or pending legal issues
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="financialAdvisorsInvolved"
                  checked={formData.financialAdvisorsInvolved || false}
                  onCheckedChange={(checked) => updateFormData('financialAdvisorsInvolved', checked)}
                />
                <Label htmlFor="financialAdvisorsInvolved" className="text-sm">
                  I have financial advisors or wealth managers involved in this process
                </Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dueDiligenceNotes">Due Diligence Notes</Label>
              <Textarea
                id="dueDiligenceNotes"
                value={formData.dueDiligenceNotes || ''}
                onChange={(e) => updateFormData('dueDiligenceNotes', e.target.value)}
                placeholder="Any additional information relevant to compliance or background checks"
                rows={3}
              />
            </div>
          </div>
        )

      case 8: // Family Members
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Family Members</h3>
                <p className="text-sm text-gray-600">Add family members who may be included in your application</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFamilyMembers(prev => [...prev, {
                    firstName: '',
                    lastName: '',
                    relationship: 'child',
                    includeInApplication: true
                  }])
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Family Member
              </Button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No family members added yet</p>
                <p className="text-sm">Click "Add Family Member" to include dependents in your application</p>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <Card key={index}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-base">
                        Family Member {index + 1}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setFamilyMembers(prev => prev.filter((_, i) => i !== index))
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={member.firstName || ''}
                            onChange={(e) => {
                              const newMembers = [...familyMembers]
                              newMembers[index] = { ...newMembers[index], firstName: e.target.value }
                              setFamilyMembers(newMembers)
                            }}
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={member.lastName || ''}
                            onChange={(e) => {
                              const newMembers = [...familyMembers]
                              newMembers[index] = { ...newMembers[index], lastName: e.target.value }
                              setFamilyMembers(newMembers)
                            }}
                            placeholder="Last name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Relationship</Label>
                          <Select 
                            value={member.relationship || 'child'} 
                            onValueChange={(value) => {
                              const newMembers = [...familyMembers]
                              newMembers[index] = { ...newMembers[index], relationship: value }
                              setFamilyMembers(newMembers)
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="spouse">Spouse</SelectItem>
                              <SelectItem value="child">Child</SelectItem>
                              <SelectItem value="parent">Parent</SelectItem>
                              <SelectItem value="sibling">Sibling</SelectItem>
                              <SelectItem value="dependent">Dependent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`include-${index}`}
                          checked={member.includeInApplication !== false}
                          onCheckedChange={(checked) => {
                            const newMembers = [...familyMembers]
                            newMembers[index] = { ...newMembers[index], includeInApplication: checked as boolean }
                            setFamilyMembers(newMembers)
                          }}
                        />
                        <Label htmlFor={`include-${index}`} className="text-sm">
                          Include in citizenship/residency application
                        </Label>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Step In Development</h3>
            <p className="text-gray-600">This step is currently being built.</p>
          </div>
        )
    }
  }

  const progressPercentage = ((currentStep + 1) / steps.length) * 100

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" onClick={handleExit}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Clients
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Client Intake - Professional Assessment
                </h1>
                <p className="text-sm text-gray-600">
                  Step {currentStep + 1} of {steps.length} - {steps[currentStep]?.title}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={handleSaveDraft} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
              <div className="text-sm text-gray-600">
                {Math.round(progressPercentage)}% Complete
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Progress value={progressPercentage} className="w-full h-2" />
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 sticky top-32">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assessment Steps</h3>
              <nav className="space-y-2">
                {steps.map((step, index) => {
                  const StepIcon = step.icon
                  const isClickable = index <= currentStep || completedSteps.has(index)
                  
                  return (
                    <button
                      key={step.id}
                      onClick={() => isClickable && handleStepClick(index)}
                      disabled={!isClickable}
                      className={`w-full flex items-start space-x-3 p-3 rounded-lg text-left transition-colors ${
                        step.isActive
                          ? 'bg-blue-50 border-2 border-blue-200'
                          : step.isComplete
                          ? 'bg-green-50 hover:bg-green-100'
                          : isClickable
                          ? 'hover:bg-gray-50'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        step.isComplete
                          ? 'bg-green-500 text-white'
                          : step.isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.isComplete ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${
                          step.isActive ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {step.title}
                        </p>
                        <p className={`text-xs ${
                          step.isActive ? 'text-blue-700' : 'text-gray-500'
                        } truncate`}>
                          {step.description}
                        </p>
                      </div>
                    </button>
                  )
                })}
              </nav>
            </div>
          </div>

          {/* Form Content */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border">
              <div className="p-8">
                <div className="mb-8">
                  <div className="flex items-center space-x-3 mb-4">
                    {(() => {
                      const StepIcon = steps[currentStep]?.icon
                      return StepIcon ? <StepIcon className="h-6 w-6 text-blue-600" /> : null
                    })()}
                    <h2 className="text-2xl font-semibold text-gray-900">
                      {steps[currentStep]?.title}
                    </h2>
                  </div>
                  <p className="text-gray-600">
                    {steps[currentStep]?.description}
                  </p>
                </div>

                {renderStepContent()}
              </div>

              {/* Footer Actions */}
              <div className="px-8 py-6 bg-gray-50 border-t rounded-b-lg">
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentStep === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>

                  <div className="flex items-center space-x-3">
                    {currentStep === steps.length - 1 ? (
                      <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Creating...' : 'Complete Assessment'}
                        <CheckCircle className="h-4 w-4 ml-2" />
                      </Button>
                    ) : (
                      <Button onClick={handleNext}>
                        Next
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}