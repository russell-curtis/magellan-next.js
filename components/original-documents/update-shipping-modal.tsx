'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Truck, Calendar, Package } from 'lucide-react'
import { toast } from 'sonner'

interface UpdateShippingModalProps {
  originalDocumentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onShippingUpdated: () => void
}

const COURIER_SERVICES = [
  'DHL',
  'FedEx',
  'UPS',
  'USPS',
  'Royal Mail',
  'Other'
]

export function UpdateShippingModal({
  originalDocumentId,
  open,
  onOpenChange,
  onShippingUpdated
}: UpdateShippingModalProps) {
  const [loading, setLoading] = useState(false)
  const [courierService, setCourierService] = useState('')
  const [trackingNumber, setTrackingNumber] = useState('')
  const [shippedAt, setShippedAt] = useState('')
  const [clientReference, setClientReference] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!courierService) {
      toast.error('Please select a courier service')
      return
    }

    if (!trackingNumber.trim()) {
      toast.error('Tracking number is required')
      return
    }

    setLoading(true)

    try {
      const payload = {
        action: 'update_shipping',
        courierService,
        trackingNumber: trackingNumber.trim(),
        shippedAt: shippedAt || undefined,
        clientReference: clientReference.trim() || undefined,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
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
        toast.success(data.message || 'Shipping information updated successfully')
        onShippingUpdated()
        onOpenChange(false)
        
        // Reset form
        setCourierService('')
        setTrackingNumber('')
        setShippedAt('')
        setClientReference('')
        setExpectedDeliveryDate('')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update shipping information')
      }
    } catch (error) {
      console.error('Error updating shipping information:', error)
      toast.error('Network error while updating shipping information')
    } finally {
      setLoading(false)
    }
  }

  // Auto-fill shipped date with current time when modal opens
  useState(() => {
    if (open && !shippedAt) {
      const now = new Date()
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
      setShippedAt(now.toISOString().slice(0, 16))
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Update Shipping Information
          </DialogTitle>
          <DialogDescription>
            Update the shipping details for the original document. This will change the status to "Originals Shipped".
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Courier Service */}
          <div className="space-y-2">
            <Label htmlFor="courier-service">Courier Service *</Label>
            <Select value={courierService} onValueChange={setCourierService} required>
              <SelectTrigger>
                <SelectValue placeholder="Select courier service" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_SERVICES.map((service) => (
                  <SelectItem key={service} value={service}>
                    {service}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tracking Number */}
          <div className="space-y-2">
            <Label htmlFor="tracking-number">Tracking Number *</Label>
            <Input
              id="tracking-number"
              placeholder="Enter tracking number"
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              required
            />
          </div>

          {/* Shipped Date */}
          <div className="space-y-2">
            <Label htmlFor="shipped-at" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Shipped Date & Time
            </Label>
            <Input
              id="shipped-at"
              type="datetime-local"
              value={shippedAt}
              onChange={(e) => setShippedAt(e.target.value)}
            />
            <p className="text-xs text-gray-600">
              Leave empty to use current date and time
            </p>
          </div>

          {/* Client Reference */}
          <div className="space-y-2">
            <Label htmlFor="client-reference">Client Reference (Optional)</Label>
            <Input
              id="client-reference"
              placeholder="Client's own tracking reference"
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
            />
          </div>

          {/* Expected Delivery Date */}
          <div className="space-y-2">
            <Label htmlFor="expected-delivery" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Expected Delivery Date (Optional)
            </Label>
            <Input
              id="expected-delivery"
              type="datetime-local"
              value={expectedDeliveryDate}
              onChange={(e) => setExpectedDeliveryDate(e.target.value)}
            />
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What happens next?</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Document status will change to "Originals Shipped"</li>
              <li>• Client will be notified with tracking information</li>
              <li>• Team can track progress until receipt confirmation</li>
              {expectedDeliveryDate && (
                <li>• Expected delivery: {new Date(expectedDeliveryDate).toLocaleDateString()}</li>
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
              className="min-w-[120px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Updating...
                </div>
              ) : (
                'Update Shipping'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}