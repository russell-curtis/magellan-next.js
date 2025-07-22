'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { CLIENT_STATUSES } from '@/db/schema'

interface ClientCreateModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientCreated: () => void
  advisors: Array<{ id: string; name: string }>
}

export function ClientCreateModal({ 
  open, 
  onOpenChange, 
  onClientCreated,
  advisors 
}: ClientCreateModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    dateOfBirth: '',
    passportNumber: '',
    status: 'prospect' as const,
    netWorthEstimate: '',
    investmentBudget: '',
    sourceOfFunds: '',
    assignedAdvisorId: '',
    notes: '',
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      dateOfBirth: '',
      passportNumber: '',
      status: 'prospect',
      netWorthEstimate: '',
      investmentBudget: '',
      sourceOfFunds: '',
      assignedAdvisorId: '',
      notes: '',
      tags: []
    })
    setNewTag('')
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }))
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          email: formData.email || null,
          phone: formData.phone || null,
          nationality: formData.nationality || null,
          dateOfBirth: formData.dateOfBirth || null,
          passportNumber: formData.passportNumber || null,
          netWorthEstimate: formData.netWorthEstimate || null,
          investmentBudget: formData.investmentBudget || null,
          sourceOfFunds: formData.sourceOfFunds || null,
          notes: formData.notes || null,
          assignedAdvisorId: formData.assignedAdvisorId === 'unassigned' ? null : formData.assignedAdvisorId || null,
          tags: formData.tags.length > 0 ? formData.tags : null
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create client')
      }

      toast({
        title: 'Success',
        description: 'Client created successfully'
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

  const handleClose = () => {
    resetForm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Client</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input
                  id="passportNumber"
                  value={formData.passportNumber}
                  onChange={(e) => handleInputChange('passportNumber', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
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
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="netWorthEstimate">Net Worth Estimate (USD)</Label>
                <Input
                  id="netWorthEstimate"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 5000000"
                  value={formData.netWorthEstimate}
                  onChange={(e) => handleInputChange('netWorthEstimate', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="investmentBudget">Investment Budget (USD)</Label>
                <Input
                  id="investmentBudget"
                  type="number"
                  step="0.01"
                  placeholder="e.g. 500000"
                  value={formData.investmentBudget}
                  onChange={(e) => handleInputChange('investmentBudget', e.target.value)}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="sourceOfFunds">Source of Funds</Label>
                <Textarea
                  id="sourceOfFunds"
                  placeholder="Describe the source of funds (e.g., business sale, investments, inheritance...)"
                  value={formData.sourceOfFunds}
                  onChange={(e) => handleInputChange('sourceOfFunds', e.target.value)}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Assignment & Notes */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Assignment & Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="assignedAdvisor">Assigned Advisor</Label>
              <Select 
                value={formData.assignedAdvisorId} 
                onValueChange={(value) => handleInputChange('assignedAdvisorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {advisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag (e.g. VIP, urgent, follow-up...)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => removeTag(tag)}
                        />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any additional notes about this client..."
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Client'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}