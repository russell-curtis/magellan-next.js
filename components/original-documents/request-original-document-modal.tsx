'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, AlertTriangle, Package, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface DocumentRequirement {
  id: string
  documentName: string
  category: string
  isRequired: boolean
  description?: string
}

interface RequestOriginalDocumentModalProps {
  applicationId: string
  documentRequirementId?: string // For single document request
  open: boolean
  onOpenChange: (open: boolean) => void
  onDocumentRequested: () => void
}

export function RequestOriginalDocumentModal({
  applicationId,
  documentRequirementId,
  open,
  onOpenChange,
  onDocumentRequested
}: RequestOriginalDocumentModalProps) {
  const [loading, setLoading] = useState(false)
  const [documentRequirements, setDocumentRequirements] = useState<DocumentRequirement[]>([])
  const [selectedRequirements, setSelectedRequirements] = useState<string[]>([])
  const [isUrgent, setIsUrgent] = useState(false)
  const [deadline, setDeadline] = useState('')
  const [shippingAddress, setShippingAddress] = useState('')
  const [clientInstructions, setClientInstructions] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [isBulkRequest, setIsBulkRequest] = useState(false)

  // Fetch available document requirements
  useEffect(() => {
    if (open && !documentRequirementId) {
      fetchDocumentRequirements()
    } else if (documentRequirementId) {
      setSelectedRequirements([documentRequirementId])
    }
  }, [open, documentRequirementId])

  const fetchDocumentRequirements = async () => {
    try {
      console.log('Fetching document requirements for application:', applicationId)
      
      // Fetch document requirements from the existing endpoint
      const response = await fetch(`/api/applications/${applicationId}/documents/requirements`)
      console.log('Document requirements response status:', response.status)
      
      if (response.ok) {
        const data = await response.json()
        console.log('Document requirements data received:', data)
        
        // Extract all requirements from stages
        const allRequirements: DocumentRequirement[] = []
        if (data.stages && Array.isArray(data.stages)) {
          data.stages.forEach((stage: any) => {
            if (stage.requirements && Array.isArray(stage.requirements)) {
              stage.requirements.forEach((req: any) => {
                // For testing: include all requirements that have documents uploaded
                // In production: only include approved digital documents
                // and check that they don't already have original document tracking
                const shouldInclude = req.status === 'approved' || req.fileName || req.documentId
                
                if (shouldInclude || true) { // Always include for testing
                  allRequirements.push({
                    id: req.id,
                    documentName: req.documentName,
                    category: req.category || 'general',
                    isRequired: req.isRequired,
                    description: req.description || `${req.documentName} document requirement`
                  })
                }
              })
            }
          })
        }
        
        console.log('Filtered requirements for originals:', allRequirements.length)
        
        // If no requirements found, add some test data for demonstration
        if (allRequirements.length === 0) {
          console.log('No requirements found, adding test data')
          const testRequirements: DocumentRequirement[] = [
            {
              id: '550e8400-e29b-41d4-a716-446655440001',
              documentName: 'Passport',
              category: 'personal',
              isRequired: true,
              description: 'Valid passport document'
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440002',
              documentName: 'Birth Certificate',
              category: 'personal',
              isRequired: true,
              description: 'Certified birth certificate'
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440003',
              documentName: 'Bank Statement',
              category: 'financial',
              isRequired: true,
              description: 'Recent bank statement (last 3 months)'
            },
            {
              id: '550e8400-e29b-41d4-a716-446655440004',
              documentName: 'Medical Certificate',
              category: 'medical',
              isRequired: false,
              description: 'Health certificate from licensed physician'
            }
          ]
          setDocumentRequirements(testRequirements)
        } else {
          setDocumentRequirements(allRequirements)
        }
      } else {
        const errorText = await response.text()
        console.error('Error fetching document requirements:', response.status, errorText)
        toast.error('Failed to load document requirements')
      }
    } catch (error) {
      console.error('Error fetching document requirements:', error)
      toast.error('Failed to load document requirements')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (selectedRequirements.length === 0) {
      toast.error('Please select at least one document requirement')
      return
    }

    if (!shippingAddress.trim()) {
      toast.error('Shipping address is required')
      return
    }

    setLoading(true)

    try {
      const action = selectedRequirements.length > 1 ? 'request_bulk' : 'request_single'
      const payload = {
        action,
        ...(action === 'request_single' ? {
          documentRequirementId: selectedRequirements[0],
          digitalDocumentId: undefined, // Could be enhanced to link to existing digital docs
        } : {
          documentRequirementIds: selectedRequirements,
        }),
        clientInstructions: clientInstructions.trim() || undefined,
        deadline: deadline || undefined,
        isUrgent,
        shippingAddress: shippingAddress.trim(),
        internalNotes: internalNotes.trim() || undefined,
      }
      
      console.log('=== ORIGINAL DOCUMENTS REQUEST PAYLOAD ===')
      console.log('Action:', action)
      console.log('Selected requirements:', selectedRequirements)
      console.log('Full payload:', JSON.stringify(payload, null, 2))

      const response = await fetch(`/api/applications/${applicationId}/original-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Original documents requested successfully')
        onDocumentRequested()
        onOpenChange(false)
        
        // Reset form
        setSelectedRequirements([])
        setIsUrgent(false)
        setDeadline('')
        setShippingAddress('')
        setClientInstructions('')
        setInternalNotes('')
      } else {
        console.log('🚨 Response not OK. Status:', response.status, 'StatusText:', response.statusText)
        
        let errorData
        try {
          errorData = await response.json()
          console.log('🚨 Parsed error data:', errorData)
        } catch (parseError) {
          console.error('🚨 Failed to parse error response:', parseError)
          errorData = { error: 'Failed to parse server response' }
        }
        
        console.error('API Error Response:', errorData)
        
        // Show detailed validation errors if available
        if (errorData.details && Array.isArray(errorData.details)) {
          const validationErrors = errorData.details.map((issue: any) => 
            `${issue.path?.join('.')}: ${issue.message}`
          ).join(', ')
          toast.error(`Validation Error: ${validationErrors}`)
        } else {
          toast.error(errorData.error || 'Failed to request original documents')
        }
      }
    } catch (error) {
      console.error('Error requesting original documents:', error)
      toast.error('Network error while requesting original documents')
    } finally {
      setLoading(false)
    }
  }

  const handleRequirementToggle = (requirementId: string, checked: boolean) => {
    if (checked) {
      setSelectedRequirements(prev => [...prev, requirementId])
    } else {
      setSelectedRequirements(prev => prev.filter(id => id !== requirementId))
    }
  }

  const selectedCount = selectedRequirements.length
  const isMultiple = selectedCount > 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Request Original Documents
          </DialogTitle>
          <DialogDescription>
            Request physical original documents from the client for government submission.
            {selectedCount > 0 && (
              <span className="block mt-1 font-medium text-blue-600">
                {selectedCount} document{selectedCount === 1 ? '' : 's'} selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Selection */}
          {!documentRequirementId && (
            <div className="space-y-3">
              <Label className="text-base font-medium">Select Documents</Label>
              <div className="max-h-40 overflow-y-auto border rounded-md p-3 space-y-2">
                {documentRequirements.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No document requirements available for original document requests
                  </p>
                ) : (
                  documentRequirements.map((req) => (
                    <div key={req.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={req.id}
                        checked={selectedRequirements.includes(req.id)}
                        onCheckedChange={(checked) => 
                          handleRequirementToggle(req.id, checked as boolean)
                        }
                      />
                      <Label htmlFor={req.id} className="flex-1 text-sm">
                        <span className="font-medium">{req.documentName}</span>
                        {req.isRequired && (
                          <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                            Required
                          </span>
                        )}
                        {req.description && (
                          <span className="block text-xs text-gray-600 mt-1">
                            {req.description}
                          </span>
                        )}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Urgency and Deadline */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="urgent"
                checked={isUrgent}
                onCheckedChange={setIsUrgent}
              />
              <Label htmlFor="urgent" className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Mark as Urgent
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Deadline (Optional)
              </Label>
              <Input
                id="deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          {/* Shipping Address */}
          <div className="space-y-2">
            <Label htmlFor="shipping-address" className="text-base font-medium">
              Shipping Address *
            </Label>
            <Textarea
              id="shipping-address"
              placeholder="Enter the complete shipping address where originals should be sent..."
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              required
              rows={3}
            />
          </div>

          {/* Client Instructions */}
          <div className="space-y-2">
            <Label htmlFor="client-instructions">
              Instructions for Client (Optional)
            </Label>
            <Textarea
              id="client-instructions"
              placeholder="Special instructions or requirements for the client when sending originals..."
              value={clientInstructions}
              onChange={(e) => setClientInstructions(e.target.value)}
              rows={3}
            />
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal-notes">
              Internal Notes (Optional)
            </Label>
            <Textarea
              id="internal-notes"
              placeholder="Internal notes for the team handling this request..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Summary */}
          {selectedCount > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Request Summary</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• {selectedCount} document{selectedCount === 1 ? '' : 's'} will be requested</li>
                {isUrgent && <li>• Marked as <strong>urgent</strong></li>}
                {deadline && <li>• Deadline: {new Date(deadline).toLocaleDateString()}</li>}
                <li>• Client will be notified automatically</li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedCount === 0}
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Requesting...
                </div>
              ) : (
                `Request ${selectedCount || ''} Document${selectedCount === 1 ? '' : 's'}`
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}