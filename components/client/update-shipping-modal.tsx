'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Truck, Package } from 'lucide-react'

interface UpdateShippingModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  originalDocumentId: string
  documentName: string
  onShippingUpdated: () => void
  batchMode?: boolean
  selectedDocumentIds?: Set<string>
}

const courierOptions = [
  { value: 'dhl', label: 'DHL' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'ups', label: 'UPS' },
  { value: 'usps', label: 'USPS' },
  { value: 'canada_post', label: 'Canada Post' },
  { value: 'purolator', label: 'Purolator' },
  { value: 'other', label: 'Other' }
]

export function UpdateShippingModal({
  isOpen,
  onOpenChange,
  originalDocumentId,
  documentName,
  onShippingUpdated,
  batchMode = false,
  selectedDocumentIds
}: UpdateShippingModalProps) {
  const [courierService, setCourierService] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippedDate, setShippedDate] = useState('')
  const [clientReference, setClientReference] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courierService.trim()) {
      toast.error('Please select a courier service')
      return
    }

    if (!trackingNumber.trim()) {
      toast.error('Please provide a tracking number')
      return
    }

    setLoading(true)

    try {
      const token = localStorage.getItem('clientToken')
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      }

      const shippingData = {
        courierService: courierService === 'other' ? `Other` : courierOptions.find(opt => opt.value === courierService)?.label,
        trackingNumber: trackingNumber.trim(),
        shippedAt: shippedDate || new Date().toISOString(),
        clientReference: clientReference.trim() || undefined
      }

      if (batchMode && selectedDocumentIds && selectedDocumentIds.size > 0) {
        // Batch update multiple documents
        const documentIds = Array.from(selectedDocumentIds)
        const promises = documentIds.map(docId => 
          fetch(`/api/client/original-documents/${docId}/shipping`, {
            method: 'POST',
            headers,
            body: JSON.stringify(shippingData)
          })
        )

        const responses = await Promise.all(promises)
        const failedUpdates: string[] = []
        
        for (let i = 0; i < responses.length; i++) {
          if (!responses[i].ok) {
            failedUpdates.push(documentIds[i])
          }
        }

        if (failedUpdates.length === 0) {
          toast.success(`Shipping information updated for ${documentIds.length} documents`)
        } else if (failedUpdates.length < documentIds.length) {
          toast.success(`Shipping updated for ${documentIds.length - failedUpdates.length} documents. ${failedUpdates.length} failed.`)
        } else {
          toast.error('Failed to update shipping information for all documents')
        }
      } else {
        // Single document update
        const response = await fetch(`/api/client/original-documents/${originalDocumentId}/shipping`, {
          method: 'POST',
          headers,
          body: JSON.stringify(shippingData)
        })

        if (response.ok) {
          toast.success('Shipping information updated successfully')
        } else {
          const errorData = await response.json()
          toast.error(errorData.error || 'Failed to update shipping information')
          return
        }
      }

      // Success - close modal and refresh
      onShippingUpdated()
      onOpenChange(false)
      
      // Reset form
      setCourierService('')
      setTrackingNumber('')
      setShippedDate('')
      setClientReference('')
      
    } catch (error) {
      console.error('Error updating shipping:', error)
      toast.error('Network error while updating shipping information')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
      // Reset form when closing
      setCourierService('')
      setTrackingNumber('')
      setShippedDate('')
      setClientReference('')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Update Shipping Information
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {batchMode ? (
              <>
                Provide tracking details for <span className="font-medium">{selectedDocumentIds?.size || 0} selected documents</span>
              </>
            ) : (
              <>
                Provide tracking details for: <span className="font-medium">{documentName}</span>
              </>
            )}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="courier">Courier Service *</Label>
            <Select value={courierService} onValueChange={setCourierService} required>
              <SelectTrigger>
                <SelectValue placeholder="Select courier service" />
              </SelectTrigger>
              <SelectContent>
                {courierOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tracking">Tracking Number *</Label>
            <Input
              id="tracking"
              type="text"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              required
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shipped-date">Shipped Date</Label>
            <Input
              id="shipped-date"
              type="date"
              value={shippedDate}
              onChange={(e) => setShippedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
            />
            <p className="text-xs text-gray-500">
              Leave blank to use current date
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Your Reference (Optional)</Label>
            <Input
              id="reference"
              type="text"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              placeholder="Personal reference or notes"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <Package className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-1">
                  {batchMode ? 'Batch Shipping Tips' : 'Important Shipping Tips'}
                </p>
                <ul className="text-blue-800 space-y-1 text-xs">
                  <li>• Use a trackable courier service for security</li>
                  <li>• Keep your tracking receipt until documents arrive</li>
                  {batchMode ? (
                    <>
                      <li>• Package all documents in the same shipment</li>
                      <li>• The same tracking details will apply to all selected documents</li>
                    </>
                  ) : (
                    <li>• Package documents in a protective envelope</li>
                  )}
                  <li>• We&apos;ll notify you once we receive your documents</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Truck className="h-4 w-4 mr-2" />
                  {batchMode ? `Update ${selectedDocumentIds?.size || 0} Documents` : 'Update Shipping'}
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}