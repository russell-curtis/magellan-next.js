'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
import { Package, Calendar, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface ConfirmReceiptModalProps {
  originalDocumentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onReceiptConfirmed: () => void
}

const DOCUMENT_CONDITIONS = [
  { value: 'excellent', label: 'Excellent', description: 'Perfect condition, no issues' },
  { value: 'good', label: 'Good', description: 'Minor wear but fully acceptable' },
  { value: 'acceptable', label: 'Acceptable', description: 'Some wear but still usable' },
  { value: 'damaged', label: 'Damaged', description: 'Significant damage, may need replacement' }
]

export function ConfirmReceiptModal({
  originalDocumentId,
  open,
  onOpenChange,
  onReceiptConfirmed
}: ConfirmReceiptModalProps) {
  const [loading, setLoading] = useState(false)
  const [receivedAt, setReceivedAt] = useState('')
  const [documentCondition, setDocumentCondition] = useState('')
  const [qualityNotes, setQualityNotes] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticationDetails, setAuthenticationDetails] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!documentCondition) {
      toast.error('Please select document condition')
      return
    }

    if (documentCondition === 'damaged' && !qualityNotes.trim()) {
      toast.error('Quality notes are required for damaged documents')
      return
    }

    setLoading(true)

    try {
      const payload = {
        action: 'confirm_receipt',
        receivedAt: receivedAt || undefined,
        documentCondition,
        qualityNotes: qualityNotes.trim() || undefined,
        isAuthenticated,
        authenticationDetails: authenticationDetails.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      }

      const response = await fetch(`/api/original-documents/${originalDocumentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(data.message || 'Document receipt confirmed successfully')
        onReceiptConfirmed()
        onOpenChange(false)
        
        // Reset form
        setReceivedAt('')
        setDocumentCondition('')
        setQualityNotes('')
        setIsAuthenticated(false)
        setAuthenticationDetails('')
        setInternalNotes('')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to confirm document receipt')
      }
    } catch (error) {
      console.error('Error confirming receipt:', error)
      toast.error('Network error while confirming receipt')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill received date with current time when modal opens
  useState(() => {
    if (open && !receivedAt) {
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      setReceivedAt(now.toISOString().slice(0, 16))
    }
  })

  const selectedCondition = DOCUMENT_CONDITIONS.find(c => c.value === documentCondition)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Confirm Document Receipt
          </DialogTitle>
          <DialogDescription>
            Confirm that the original document has been received and assess its condition. 
            This will change the status to "Originals Received".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Received Date */}
          <div className="space-y-2">
            <Label htmlFor="received-at" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Received Date & Time
            </Label>
            <Input
              id="received-at"
              type="datetime-local"
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
            />
            <p className="text-xs text-gray-600">
              Leave empty to use current date and time
            </p>
          </div>

          {/* Document Condition */}
          <div className="space-y-2">
            <Label htmlFor="document-condition">Document Condition *</Label>
            <Select value={documentCondition} onValueChange={setDocumentCondition} required>
              <SelectTrigger>
                <SelectValue placeholder="Select document condition" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_CONDITIONS.map((condition) => (
                  <SelectItem key={condition.value} value={condition.value}>
                    <div className="flex flex-col">
                      <span className="font-medium">{condition.label}</span>
                      <span className="text-xs text-gray-600">{condition.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedCondition && (
              <p className="text-xs text-gray-600">{selectedCondition.description}</p>
            )}
          </div>

          {/* Quality Notes */}
          <div className="space-y-2">
            <Label htmlFor="quality-notes">
              Quality Notes {documentCondition === 'damaged' && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="quality-notes"
              placeholder={
                documentCondition === 'damaged' 
                  ? "Describe the damage and any concerns..." 
                  : "Any observations about the document condition..."
              }
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
              rows={3}
              required={documentCondition === 'damaged'}
            />
          </div>

          {/* Authentication Status */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="authenticated" className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Document is Authenticated
                </Label>
                <p className="text-xs text-gray-600">
                  Check if document has apostille, notarization, or other authentication
                </p>
              </div>
              <Switch
                id="authenticated"
                checked={isAuthenticated}
                onCheckedChange={setIsAuthenticated}
              />
            </div>

            {isAuthenticated && (
              <div className="space-y-2">
                <Label htmlFor="authentication-details">Authentication Details</Label>
                <Textarea
                  id="authentication-details"
                  placeholder="Describe the type of authentication (apostille, notarization, etc.)..."
                  value={authenticationDetails}
                  onChange={(e) => setAuthenticationDetails(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal-notes">Internal Notes (Optional)</Label>
            <Textarea
              id="internal-notes"
              placeholder="Any additional notes for the team..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Warning for Damaged Documents */}
          {documentCondition === 'damaged' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Damaged Document Detected</h4>
                  <p className="text-sm text-red-800 mt-1">
                    This document is marked as damaged. Consider contacting the client for a replacement 
                    before proceeding with verification.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Document status will change to "Originals Received"</li>
              <li>• Document will be queued for verification</li>
              <li>• Team will be notified of the receipt</li>
              {isAuthenticated && <li>• Authentication status will be recorded</li>}
              {documentCondition === 'damaged' && (
                <li className="text-red-700">• Damage report will be flagged for review</li>
              )}
            </ul>
          </div>

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
              disabled={loading}
              className="min-w-[140px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Confirming...
                </div>
              ) : (
                'Confirm Receipt'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}