'use client'

import { useState, useEffect } from 'react'
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

interface ClientWithAdvisor {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  status: string
  nationality: string | null
  netWorthEstimate: string | null
  investmentBudget: string | null
  sourceOfFunds: string | null
  notes: string | null
  tags: string[] | null
  assignedAdvisor?: {
    id: string
    name: string
    email: string
    role: string
  } | null
}

interface ClientEditModalProps {
  client: ClientWithAdvisor | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientUpdated: () => void
  advisors: Array<{ id: string; name: string }>
}

export function ClientEditModal({ 
  client, 
  open, 
  onOpenChange, 
  onClientUpdated,
  advisors 
}: ClientEditModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    nationality: '',
    status: 'prospect',
    netWorthEstimate: '',
    investmentBudget: '',
    sourceOfFunds: '',
    assignedAdvisorId: '',
    notes: '',
    tags: [] as string[]
  })
  const [newTag, setNewTag] = useState('')

  // Update form data when client changes
  useEffect(() => {
    if (client) {
      setFormData({
        firstName: client.firstName || '',
        lastName: client.lastName || '',
        email: client.email || '',
        phone: client.phone || '',
        nationality: client.nationality || '',
        status: client.status || 'prospect',
        netWorthEstimate: client.netWorthEstimate || '',
        investmentBudget: client.investmentBudget || '',
        sourceOfFunds: client.sourceOfFunds || '',
        assignedAdvisorId: client.assignedAdvisor?.id || '',
        notes: client.notes || '',
        tags: client.tags || []
      })
    }
  }, [client])

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
    if (!client) return

    setLoading(true)
    try {
      const response = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          netWorthEstimate: formData.netWorthEstimate ? parseFloat(formData.netWorthEstimate) : null,
          investmentBudget: formData.investmentBudget ? parseFloat(formData.investmentBudget) : null,
          assignedAdvisorId: formData.assignedAdvisorId || null
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update client')
      }

      toast({
        title: 'Success',
        description: 'Client updated successfully'
      })

      onClientUpdated()
      onOpenChange(false)
    } catch (error) {
      console.error('Error updating client:', error)
      toast({
        title: 'Error',
        description: 'Failed to update client',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Client: {client.firstName} {client.lastName}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  value={formData.nationality}
                  onChange={(e) => handleInputChange('nationality', e.target.value)}
                />
              </div>
              <div>
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
              <div>
                <Label htmlFor="netWorthEstimate">Net Worth Estimate</Label>
                <Input
                  id="netWorthEstimate"
                  type="number"
                  step="0.01"
                  value={formData.netWorthEstimate}
                  onChange={(e) => handleInputChange('netWorthEstimate', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="investmentBudget">Investment Budget</Label>
                <Input
                  id="investmentBudget"
                  type="number"
                  step="0.01"
                  value={formData.investmentBudget}
                  onChange={(e) => handleInputChange('investmentBudget', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="sourceOfFunds">Source of Funds</Label>
                <Textarea
                  id="sourceOfFunds"
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
            <div>
              <Label htmlFor="assignedAdvisor">Assigned Advisor</Label>
              <Select 
                value={formData.assignedAdvisorId} 
                onValueChange={(value) => handleInputChange('assignedAdvisorId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select advisor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {advisors.map((advisor) => (
                    <SelectItem key={advisor.id} value={advisor.id}>
                      {advisor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tags */}
            <div>
              <Label>Tags</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  />
                  <Button type="button" variant="outline" onClick={addTag}>
                    Add
                  </Button>
                </div>
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
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}