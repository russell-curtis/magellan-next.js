'use client'

import { useState, useEffect, useCallback } from 'react'
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
  
  const [formData, setFormData] = useState({
    programId: '',
    investmentAmount: '',
    investmentType: '',
    priority: 'medium',
    decisionExpectedAt: '',
    notes: ''
  })

  const { toast } = useToast()

  const fetchPrograms = useCallback(async () => {
    setLoadingPrograms(true)
    try {
      const response = await fetch('/api/crbi-programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data.programs || [])
      }
    } catch (error) {
      console.error('Error fetching programs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load CRBI programs',
        variant: 'destructive'
      })
    } finally {
      setLoadingPrograms(false)
    }
  }, [toast])

  useEffect(() => {
    if (open) {
      fetchPrograms()
    }
  }, [open, fetchPrograms])

  useEffect(() => {
    if (formData.programId) {
      const program = programs.find(p => p.id === formData.programId)
      setSelectedProgram(program || null)
    } else {
      setSelectedProgram(null)
    }
  }, [formData.programId, programs])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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
    if (!formData.programId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a CRBI program',
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
    if (selectedProgram && investmentAmount < parseFloat(selectedProgram.minInvestment)) {
      toast({
        title: 'Validation Error',
        description: `Investment amount must be at least ${formatCurrency(selectedProgram.minInvestment)}`,
        variant: 'destructive'
      })
      return false
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
      investmentAmount: '',
      investmentType: '',
      priority: 'medium',
      decisionExpectedAt: '',
      notes: ''
    })
    setSelectedProgram(null)
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            Create New Application for {clientName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Program Selection */}
          <div className="space-y-2">
            <Label htmlFor="program">CRBI Program *</Label>
            <Select 
              value={formData.programId} 
              onValueChange={(value) => handleInputChange('programId', value)}
              disabled={loadingPrograms}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingPrograms ? "Loading programs..." : "Select a CRBI program"} />
              </SelectTrigger>
              <SelectContent>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    <div className="flex items-center space-x-2">
                      <Globe className="h-4 w-4" />
                      <span>{program.countryName} - {program.programName}</span>
                      <Badge variant={program.programType === 'citizenship' ? 'default' : 'secondary'}>
                        {program.programType}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
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

          {/* Investment Details */}
          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Investment Details
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="investmentAmount">Investment Amount (USD) *</Label>
                <Input
                  id="investmentAmount"
                  type="number"
                  placeholder="e.g., 500000"
                  value={formData.investmentAmount}
                  onChange={(e) => handleInputChange('investmentAmount', e.target.value)}
                />
                {selectedProgram && formData.investmentAmount && (
                  <p className="text-xs text-muted-foreground">
                    Minimum required: {formatCurrency(selectedProgram.minInvestment)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="investmentType">Investment Type</Label>
                <Select 
                  value={formData.investmentType} 
                  onValueChange={(value) => handleInputChange('investmentType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select investment type" />
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
            disabled={loading || !formData.programId || !formData.investmentAmount}
          >
            {loading ? 'Creating...' : 'Create Application'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}