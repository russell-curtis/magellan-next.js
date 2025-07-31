'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

interface ClientIntakeWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated: () => void
  advisors: Array<{ id: string; name: string }>
}

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

export function ClientIntakeWizard({ 
  open, 
  onOpenChange, 
  onClientCreated,
  advisors 
}: ClientIntakeWizardProps) {
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
        return true // All boolean fields with defaults
      case 8: // Family Members
        return true // Optional step
      default:
        return true
    }
  }

  const nextStep = () => {
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

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const goToStep = (stepIndex: number) => {
    setCurrentStep(stepIndex)
  }

  const addFamilyMember = () => {
    setFamilyMembers(prev => [...prev, {
      firstName: '',
      lastName: '',
      relationship: 'child',
      includeInApplication: true
    }])
  }

  const updateFamilyMember = (index: number, field: string, value: any) => {
    setFamilyMembers(prev => prev.map((member, i) => 
      i === index ? { ...member, [field]: value } : member
    ))
  }

  const removeFamilyMember = (index: number) => {
    setFamilyMembers(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const finalData = {
        ...formData,
        familyMembers: familyMembers.filter(member => 
          member.firstName && member.lastName && member.relationship
        )
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      toast({
        title: 'Success',
        description: 'Client profile created successfully'
      })

      resetForm()
      onClientCreated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error creating client:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create client',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
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
    setFamilyMembers([])
    setCurrentStep(0)
    setCompletedSteps(new Set())
  }

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  const progressPercentage = ((completedSteps.size) / steps.length) * 100

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold">
            Client Intake - Professional Assessment
          </DialogTitle>
          <div className="space-y-2">
            <Progress value={progressPercentage} className="w-full" />
            <p className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length} - {steps[currentStep]?.title}
            </p>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Steps Navigation */}
          <div className="lg:col-span-1">
            <div className="space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon
                return (
                  <button
                    key={step.id}
                    onClick={() => goToStep(index)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      step.isActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : step.isComplete 
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        step.isActive 
                          ? 'bg-blue-500 text-white' 
                          : step.isComplete 
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}>
                        {step.isComplete ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Icon className="h-4 w-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium">{step.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {step.description}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Step Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  {(() => {
                    const Icon = steps[currentStep]?.icon
                    return Icon ? <Icon className="h-5 w-5" /> : null
                  })()}
                  <span>{steps[currentStep]?.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Step Content will be rendered here based on currentStep */}
                {renderStepContent()}
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={previousStep}
                disabled={currentStep === 0}
                className="flex items-center space-x-2"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </Button>

              <div className="flex items-center space-x-2">
                {currentStep === steps.length - 1 ? (
                  <Button 
                    onClick={handleSubmit}
                    disabled={loading || !validateStep(currentStep)}
                    className="flex items-center space-x-2"
                  >
                    {loading ? 'Creating...' : 'Create Client'}
                  </Button>
                ) : (
                  <Button 
                    onClick={nextStep}
                    disabled={!validateStep(currentStep)}
                    className="flex items-center space-x-2"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  function renderStepContent() {
    switch (currentStep) {
      case 0: // Basic Information
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            
            <div className="grid grid-cols-2 gap-4">
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

            <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="referralSource">How did you hear about us?</Label>
              <Input
                id="referralSource"
                value={formData.referralSource || ''}
                onChange={(e) => updateFormData('referralSource', e.target.value)}
                placeholder="Referral source, website, social media, etc."
              />
            </div>
          </div>
        )

      case 1: // Identity & Citizenship
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                    addToArray('currentCitizenships', input.value)
                    input.value = ''
                  }}
                >
                  Add
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

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input
                  id="passportNumber"
                  value={formData.passportNumber || ''}
                  onChange={(e) => updateFormData('passportNumber', e.target.value)}
                  placeholder="Primary passport number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportExpiryDate">Passport Expiry</Label>
                <Input
                  id="passportExpiryDate"
                  type="date"
                  value={formData.passportExpiryDate || ''}
                  onChange={(e) => updateFormData('passportExpiryDate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportIssuingCountry">Issuing Country</Label>
                <Input
                  id="passportIssuingCountry"
                  value={formData.passportIssuingCountry || ''}
                  onChange={(e) => updateFormData('passportIssuingCountry', e.target.value)}
                  placeholder="Passport issuing country"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Languages Spoken</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {(formData.languagesSpoken || []).map((language) => (
                  <Badge key={language} variant="secondary" className="flex items-center gap-1">
                    {language}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeFromArray('languagesSpoken', language)}
                    />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  id="newLanguage"
                  placeholder="Enter language (e.g., English, Spanish)"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addToArray('languagesSpoken', (e.target as HTMLInputElement).value)
                      ;(e.target as HTMLInputElement).value = ''
                    }
                  }}
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => {
                    const input = document.getElementById('newLanguage') as HTMLInputElement
                    addToArray('languagesSpoken', input.value)
                    input.value = ''
                  }}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        )

      case 2: // Professional & Educational Background
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="educationDetails">Education Details</Label>
              <Textarea
                id="educationDetails"
                value={formData.educationDetails || ''}
                onChange={(e) => updateFormData('educationDetails', e.target.value)}
                placeholder="Degrees, institutions, certifications, etc."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentProfession">Current Profession</Label>
                <Input
                  id="currentProfession"
                  value={formData.currentProfession || ''}
                  onChange={(e) => updateFormData('currentProfession', e.target.value)}
                  placeholder="Job title or profession"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Input
                  id="industry"
                  value={formData.industry || ''}
                  onChange={(e) => updateFormData('industry', e.target.value)}
                  placeholder="Technology, Finance, Healthcare, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="currentEmployer">Current Employer</Label>
                <Input
                  id="currentEmployer"
                  value={formData.currentEmployer || ''}
                  onChange={(e) => updateFormData('currentEmployer', e.target.value)}
                  placeholder="Company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearsOfExperience">Years of Experience</Label>
                <Input
                  id="yearsOfExperience"
                  type="number"
                  min="0"
                  max="70"
                  value={formData.yearsOfExperience || ''}
                  onChange={(e) => updateFormData('yearsOfExperience', parseInt(e.target.value) || undefined)}
                  placeholder="Years in current field"
                />
              </div>
            </div>
          </div>
        )

      case 3: // Goals & Timeline
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Primary Goals for Citizenship/Residency *</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'global_mobility',
                  'tax_optimization', 
                  'education',
                  'lifestyle',
                  'business_expansion',
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

            <div className="grid grid-cols-2 gap-4">
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

      case 6: // Financial Readiness
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
                        {range.replace('_', '-').replace('under_', 'Under $').replace('k', 'K').replace('m', 'M').replace('plus', '+')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Source of Funds Types</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'business_sale',
                  'investments',
                  'inheritance',
                  'employment',
                  'real_estate',
                  'other'
                ].map((source) => (
                  <div key={source} className="flex items-center space-x-2">
                    <Checkbox
                      id={source}
                      checked={(formData.sourceOfFundsTypes || []).includes(source)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          addToArray('sourceOfFundsTypes', source)
                        } else {
                          removeFromArray('sourceOfFundsTypes', source)
                        }
                      }}
                    />
                    <Label htmlFor={source} className="text-sm">
                      {source.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sourceOfFundsDescription">Source of Funds Description</Label>
              <Textarea
                id="sourceOfFundsDescription"
                value={formData.sourceOfFundsDescription || ''}
                onChange={(e) => updateFormData('sourceOfFundsDescription', e.target.value)}
                placeholder="Provide details about your source of funds..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
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
                        {exp.charAt(0).toUpperCase() + exp.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="liquidityTimeline">Liquidity Timeline</Label>
                <Select 
                  value={formData.liquidityTimeline || ''} 
                  onValueChange={(value) => updateFormData('liquidityTimeline', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select timeline" />
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
          </div>
        )

      case 8: // Family Members
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Family Members</h3>
                <p className="text-sm text-muted-foreground">
                  Add family members who may be included in your application
                </p>
              </div>
              <Button onClick={addFamilyMember} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Family Member
              </Button>
            </div>

            {familyMembers.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed rounded-lg">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Family Members Added</h3>
                <p className="text-gray-600 mb-4">Add family members who will be part of your application</p>
                <Button onClick={addFamilyMember} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Family Member
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {familyMembers.map((member, index) => (
                  <Card key={index}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">Family Member {index + 1}</CardTitle>
                        <Button
                          onClick={() => removeFamilyMember(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>First Name</Label>
                          <Input
                            value={member.firstName || ''}
                            onChange={(e) => updateFamilyMember(index, 'firstName', e.target.value)}
                            placeholder="First name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Last Name</Label>
                          <Input
                            value={member.lastName || ''}
                            onChange={(e) => updateFamilyMember(index, 'lastName', e.target.value)}
                            placeholder="Last name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Relationship</Label>
                          <Select 
                            value={member.relationship || 'child'} 
                            onValueChange={(value) => updateFamilyMember(index, 'relationship', value)}
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
                          onCheckedChange={(checked) => updateFamilyMember(index, 'includeInApplication', checked)}
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
}