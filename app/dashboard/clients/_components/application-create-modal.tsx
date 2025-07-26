'use client'

import { useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { DollarSign, FileText, Globe } from 'lucide-react'

interface CRBIProgram {
  id: string
  countryCode: string
  countryName: string
  programType: string
  programName: string
  minInvestment: string
  processingTimeMonths: number
  requirements: Record<string, unknown>
  isActive: boolean
}

interface InvestmentOption {
  id: string
  optionType: string
  optionName: string
  description: string
  baseAmount: string
  familyPricing: Record<string, unknown>
  holdingPeriod: number | null
  conditions: Record<string, unknown>
  eligibilityRequirements: Record<string, unknown>
  sortOrder: number
  isActive: boolean
}

interface ApplicationCreateModalProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onApplicationCreated?: () => void
}

export function ApplicationCreateModal({
  clientId,
  clientName,
  open,
  onOpenChange,
  onApplicationCreated
}: ApplicationCreateModalProps) {
  const [loading, setLoading] = useState(false)
  const [programs, setPrograms] = useState<CRBIProgram[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<CRBIProgram | null>(null)
  
  // Investment options state
  const [investmentOptions, setInvestmentOptions] = useState<InvestmentOption[]>([])
  const [loadingInvestmentOptions, setLoadingInvestmentOptions] = useState(false)
  const [selectedInvestmentOption, setSelectedInvestmentOption] = useState<InvestmentOption | null>(null)
  
  
  const [formData, setFormData] = useState({
    programId: '',
    selectedInvestmentOptionId: '',
    investmentAmount: '',
    investmentType: '',
    priority: 'medium',
    decisionExpectedAt: '',
    notes: ''
  })

  const { toast } = useToast()

  const fetchPrograms = async () => {
    console.log('Starting fetchPrograms, setting loading to true')
    setLoadingPrograms(true)
    
    try {
      console.log('Fetching CRBI programs...')
      const response = await fetch('/api/crbi-programs')
      console.log('Response status:', response.status, response.ok)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Programs data:', data)
        
        if (data.programs && Array.isArray(data.programs)) {
          setPrograms(data.programs)
          console.log(`Successfully loaded ${data.programs.length} programs`)
          // Explicitly set loading to false after successful load
          setLoadingPrograms(false)
          console.log('Set loading to false after successful load')
          return
        } else {
          console.error('Invalid programs data structure:', data)
          setPrograms([])
          toast({
            title: 'Error',
            description: 'Invalid programs data received',
            variant: 'destructive'
          })
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API error:', response.status, errorData)
        setPrograms([])
        toast({
          title: 'Error',
          description: `Failed to load CRBI programs: ${errorData.error || response.status}`,
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
      setPrograms([])
      toast({
        title: 'Error',
        description: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive'
      })
    }
    
    // Always set loading to false, regardless of success or error
    console.log('Setting loading to false in cleanup')
    setLoadingPrograms(false)
  }

  // Manual modal state management to avoid useEffect loops
  const handleModalOpen = () => {
    console.log('Manual modal open triggered')
    setPrograms([])
    setLoadingPrograms(true)
    fetchPrograms()
  }

  const handleModalClose = () => {
    console.log('Manual modal close triggered')
    setLoadingPrograms(false)
    setPrograms([])
    resetForm()
  }

  // Fetch investment options for selected program
  const fetchInvestmentOptions = useCallback(async (programId: string) => {
    console.log('Fetching investment options for program:', programId)
    setLoadingInvestmentOptions(true)
    setInvestmentOptions([])
    setSelectedInvestmentOption(null)
    
    try {
      const response = await fetch(`/api/crbi-programs/${programId}/investment-options`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Investment options data:', data)
        
        if (data.investmentOptions && Array.isArray(data.investmentOptions)) {
          setInvestmentOptions(data.investmentOptions)
          console.log(`Successfully loaded ${data.investmentOptions.length} investment options`)
        } else {
          console.error('Invalid investment options data structure:', data)
          setInvestmentOptions([])
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('API error fetching investment options:', response.status, errorData)
        setInvestmentOptions([])
      }
    } catch (error) {
      console.error('Error fetching investment options:', error)
      setInvestmentOptions([])
    } finally {
      setLoadingInvestmentOptions(false)
      console.log('Finished fetching investment options')
    }
  }, [])

  // Removed problematic useEffects - logic moved to handleInputChange

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
    
    // Handle program selection directly
    if (field === 'programId' && value) {
      const program = programs.find(p => p.id === value)
      setSelectedProgram(program || null)
      fetchInvestmentOptions(value)
    } else if (field === 'programId' && !value) {
      setSelectedProgram(null)
      setInvestmentOptions([])
      setSelectedInvestmentOption(null)
    }
    
    // Handle investment option selection directly
    if (field === 'selectedInvestmentOptionId' && value) {
      const option = investmentOptions.find(opt => opt.id === value)
      setSelectedInvestmentOption(option || null)
    } else if (field === 'selectedInvestmentOptionId' && !value) {
      setSelectedInvestmentOption(null)
    }
  }

  const formatCurrency = (amount: string | null) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount))
  }

  const validateForm = () => {
    // Basic required field validation
    if (!formData.programId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a CRBI program',
        variant: 'destructive'
      })
      return false
    }

    if (!formData.selectedInvestmentOptionId) {
      toast({
        title: 'Validation Error',
        description: 'Please select an investment option',
        variant: 'destructive'
      })
      return false
    }

    if (!formData.investmentAmount) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an investment amount',
        variant: 'destructive'
      })
      return false
    }

    const investmentAmount = parseFloat(formData.investmentAmount)
    
    // Investment amount validation
    if (isNaN(investmentAmount) || investmentAmount <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a valid investment amount',
        variant: 'destructive'
      })
      return false
    }

    // Program-specific minimum investment validation
    if (selectedProgram && investmentAmount < parseFloat(selectedProgram.minInvestment)) {
      toast({
        title: 'Validation Error',
        description: `Investment amount must be at least ${formatCurrency(selectedProgram.minInvestment)} for ${selectedProgram.programName}`,
        variant: 'destructive'
      })
      return false
    }
    
    // Investment option specific validation
    if (selectedInvestmentOption) {
      const baseAmount = parseFloat(selectedInvestmentOption.baseAmount)
      
      if (investmentAmount < baseAmount) {
        toast({
          title: 'Validation Error',
          description: `Investment amount must be at least ${formatCurrency(selectedInvestmentOption.baseAmount)} for ${selectedInvestmentOption.optionName}`,
          variant: 'destructive'
        })
        return false
      }

      // Special validation for private real estate options
      if (selectedInvestmentOption.optionType === 'Private Real Estate') {
        const familyPricing = selectedInvestmentOption.familyPricing as Record<string, unknown>
        if (familyPricing?.singleFamily && investmentAmount >= parseFloat(familyPricing.singleFamily.amount)) {
          // Valid for single-family home
        } else if (familyPricing?.condominium && investmentAmount >= parseFloat(familyPricing.condominium.amount)) {
          // Valid for condominium
        } else {
          toast({
            title: 'Validation Error',
            description: `For Private Real Estate: Minimum ${formatCurrency(familyPricing?.condominium?.amount || baseAmount)} for condominium or ${formatCurrency(familyPricing?.singleFamily?.amount || '600000')} for single-family home`,
            variant: 'destructive'
          })
          return false
        }
      }

      // Family pricing validation for SISC
      if (selectedInvestmentOption.optionType === 'SISC') {
        const familyPricing = selectedInvestmentOption.familyPricing as Record<string, unknown>
        if (familyPricing?.baseFamily && investmentAmount < parseFloat(familyPricing.baseFamily.amount)) {
          toast({
            title: 'Validation Error',
            description: `SISC minimum investment is ${formatCurrency(familyPricing.baseFamily.amount)} for families up to 4 members`,
            variant: 'destructive'
          })
          return false
        }
      }
    }

    // Date validation
    if (formData.decisionExpectedAt) {
      const selectedDate = new Date(formData.decisionExpectedAt)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      if (selectedDate < today) {
        toast({
          title: 'Validation Error',
          description: 'Expected decision date cannot be in the past',
          variant: 'destructive'
        })
        return false
      }
    }

    return true
  }

  const handleSubmit = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          clientId,
          programId: formData.programId,
          selectedInvestmentOptionId: formData.selectedInvestmentOptionId,
          investmentAmount: formData.investmentAmount,
          investmentType: formData.investmentType || null,
          priority: formData.priority,
          decisionExpectedAt: formData.decisionExpectedAt || null,
          notes: formData.notes || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create application' }))
        throw new Error(errorData.error || 'Failed to create application')
      }

      const result = await response.json()

      toast({
        title: 'Success',
        description: `Application ${result.application.applicationNumber} created successfully`
      })

      // Reset form
      setFormData({
        programId: '',
        selectedInvestmentOptionId: '',
        investmentAmount: '',
        investmentType: '',
        priority: 'medium',
        decisionExpectedAt: '',
        notes: ''
      })

      onApplicationCreated?.()
      onOpenChange(false)

    } catch (error) {
      console.error('Error creating application:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create application',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      programId: '',
      selectedInvestmentOptionId: '',
      investmentAmount: '',
      investmentType: '',
      priority: 'medium',
      decisionExpectedAt: '',
      notes: ''
    })
    setSelectedProgram(null)
    setInvestmentOptions([])
    setSelectedInvestmentOption(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (isOpen) {
        handleModalOpen()
      } else {
        handleModalClose()
      }
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Application for {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label htmlFor="program">CRBI Program *</Label>
            {/* Debug info - remove in production */}
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              Loading: {loadingPrograms ? 'Yes' : 'No'} | Programs: {programs.length}
              <button 
                type="button"
                onClick={() => {
                  console.log('Manual refresh clicked')
                  setLoadingPrograms(false)
                  fetchPrograms()
                }}
                className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs hover:bg-blue-200"
              >
                Refresh
              </button>
            </div>
            <Select 
              value={formData.programId} 
              onValueChange={(value) => handleInputChange('programId', value)}
              disabled={loadingPrograms}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPrograms ? "Loading programs..." : "Select a CRBI program"} />
              </SelectTrigger>
              <SelectContent>
                {programs.length === 0 && !loadingPrograms ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No CRBI programs available
                  </div>
                ) : (
                  programs.map((program) => (
                    <SelectItem key={program.id} value={program.id}>
                      <div className="flex items-center space-x-2">
                        <Globe className="h-4 w-4" />
                        <span>{program.countryName} - {program.programName}</span>
                        <Badge variant={program.programType === 'citizenship' ? 'default' : 'secondary'}>
                          {program.programType}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Program Details */}
          {selectedProgram && (
            <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Program Details</h4>
                <Badge variant={selectedProgram.programType === 'citizenship' ? 'default' : 'secondary'}>
                  {selectedProgram.programType}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Country:</span>
                  <div className="font-medium">{selectedProgram.countryName}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Min Investment:</span>
                  <div className="font-medium">{formatCurrency(selectedProgram.minInvestment)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Processing Time:</span>
                  <div className="font-medium">{selectedProgram.processingTimeMonths} months</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Program:</span>
                  <div className="font-medium">{selectedProgram.programName}</div>
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Investment Options */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Investment Options
            </h4>

            {formData.programId && (
              <div className="space-y-2">
                <Label htmlFor="selectedInvestmentOption">Select Investment Option *</Label>
                <Select 
                  value={formData.selectedInvestmentOptionId} 
                  onValueChange={(value) => handleInputChange('selectedInvestmentOptionId', value)}
                  disabled={loadingInvestmentOptions}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingInvestmentOptions ? "Loading options..." : "Choose an investment option"} />
                  </SelectTrigger>
                  <SelectContent>
                    {investmentOptions.length === 0 && !loadingInvestmentOptions ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No investment options available for this program
                      </div>
                    ) : (
                      investmentOptions.map((option) => (
                        <SelectItem key={option.id} value={option.id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{option.optionName}</span>
                            <span className="text-xs text-muted-foreground">
                              Minimum: {formatCurrency(option.baseAmount)}
                              {option.holdingPeriod && ` • ${Math.floor(option.holdingPeriod / 12)} year holding period`}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Investment Option Details */}
            {selectedInvestmentOption && (
              <div className="p-4 border rounded-lg bg-gray-50 space-y-3">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">Investment Option Details</h5>
                  <Badge variant="secondary">{selectedInvestmentOption.optionType}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{selectedInvestmentOption.description}</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-muted-foreground">Base Amount:</span>
                      <div className="font-medium">{formatCurrency(selectedInvestmentOption.baseAmount)}</div>
                    </div>
                    {selectedInvestmentOption.holdingPeriod && (
                      <div>
                        <span className="text-muted-foreground">Holding Period:</span>
                        <div className="font-medium">{Math.floor(selectedInvestmentOption.holdingPeriod / 12)} years</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Investment Amount */}
            <div className="space-y-2">
              <Label htmlFor="investmentAmount">Investment Amount (USD) *</Label>
              <Input
                id="investmentAmount"
                type="number"
                placeholder={selectedInvestmentOption ? `Minimum: ${formatCurrency(selectedInvestmentOption.baseAmount)}` : "Enter investment amount"}
                value={formData.investmentAmount}
                onChange={(e) => handleInputChange('investmentAmount', e.target.value)}
              />
              {selectedInvestmentOption && formData.investmentAmount && (
                <div className="text-xs space-y-1">
                  {(() => {
                    const amount = parseFloat(formData.investmentAmount)
                    const baseAmount = parseFloat(selectedInvestmentOption.baseAmount)
                    
                    if (amount >= baseAmount) {
                      // Check for special cases like Private Real Estate
                      if (selectedInvestmentOption.optionType === 'Private Real Estate') {
                        const familyPricing = selectedInvestmentOption.familyPricing as Record<string, unknown>
                        const singleFamilyMin = familyPricing?.singleFamily?.amount ? parseFloat(familyPricing.singleFamily.amount) : 600000
                        const condoMin = familyPricing?.condominium?.amount ? parseFloat(familyPricing.condominium.amount) : baseAmount
                        
                        if (amount >= singleFamilyMin) {
                          return <p className="text-green-600">✅ Qualifies for single-family home or condominium</p>
                        } else if (amount >= condoMin) {
                          return <p className="text-green-600">✅ Qualifies for condominium investment</p>
                        }
                      }
                      return <p className="text-green-600">✅ Amount meets minimum requirement</p>
                    } else {
                      return <p className="text-amber-600">⚠️ Minimum required: {formatCurrency(selectedInvestmentOption.baseAmount)}</p>
                    }
                  })()}
                  
                  {/* Additional context for investment options */}
                  {selectedInvestmentOption.optionType === 'Private Real Estate' && (
                    <p className="text-muted-foreground">
                      Condominium: {formatCurrency(selectedInvestmentOption.familyPricing?.condominium?.amount || selectedInvestmentOption.baseAmount)} • 
                      Single-family: {formatCurrency(selectedInvestmentOption.familyPricing?.singleFamily?.amount || '600000')}
                    </p>
                  )}
                  
                  {selectedInvestmentOption.optionType === 'SISC' && (
                    <p className="text-muted-foreground">
                      Base family (up to 4): {formatCurrency(selectedInvestmentOption.familyPricing?.baseFamily?.amount || selectedInvestmentOption.baseAmount)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Investment Type (Legacy field for additional categorization) */}
            <div className="space-y-2">
              <Label htmlFor="investmentType">Additional Investment Type (Optional)</Label>
              <Select 
                value={formData.investmentType} 
                onValueChange={(value) => handleInputChange('investmentType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select additional type if applicable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="real_estate">Real Estate</SelectItem>
                  <SelectItem value="government_bonds">Government Bonds</SelectItem>
                  <SelectItem value="business_investment">Business Investment</SelectItem>
                  <SelectItem value="donation">Donation</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Application Settings */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Application Settings
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(value) => handleInputChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="decisionExpectedAt">Expected Decision Date</Label>
                <Input
                  id="decisionExpectedAt"
                  type="date"
                  value={formData.decisionExpectedAt}
                  onChange={(e) => handleInputChange('decisionExpectedAt', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes or requirements..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading || !formData.programId || !formData.selectedInvestmentOptionId || !formData.investmentAmount}
          >
            {loading ? 'Creating...' : 'Create Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}