'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { AlertTriangle, X, Trash2 } from 'lucide-react'

interface CancelRequestModalProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  originalDocumentId: string
  documentName: string
  currentStatus: string
  onCancellationComplete: () => void
}

export function CancelRequestModal({
  isOpen,
  onOpenChange,
  originalDocumentId,
  documentName,
  currentStatus,
  onCancellationComplete
}: CancelRequestModalProps) {
  const [loading, setLoading] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'originals_requested':
        return 'bg-yellow-100 text-yellow-800'
      case 'originals_shipped':
        return 'bg-blue-100 text-blue-800'
      case 'originals_received':
        return 'bg-orange-100 text-orange-800'
      case 'originals_verified':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatStatusText = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  const handleCancel = async () => {
    setLoading(true)

    try {
      const response = await fetch(`/api/original-documents/${originalDocumentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (response.ok) {
        toast.success('Original document request cancelled successfully')
        onCancellationComplete()
        onOpenChange(false)
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to cancel original document request')
      }
    } catch (error) {
      console.error('Error cancelling original document request:', error)
      toast.error('Network error while cancelling request')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            Cancel Original Document Request
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900 mb-1">Warning: Permanent Action</h4>
                <p className="text-sm text-red-800">
                  This action cannot be undone. The original document tracking will be permanently removed 
                  from the system and the client will no longer see this request.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Document to Cancel:</label>
              <p className="text-lg font-semibold text-gray-900 mt-1">{documentName}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Current Status:</label>
              <div className="mt-1">
                <Badge className={getStatusColor(currentStatus)}>
                  {formatStatusText(currentStatus)}
                </Badge>
              </div>
            </div>
          </div>

          {currentStatus === 'originals_shipped' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 mb-1">Document Already Shipped</p>
                  <p className="text-amber-800">
                    The client has already shipped this document. Consider contacting them before cancelling.
                  </p>
                </div>
              </div>
            </div>
          )}

          {(currentStatus === 'originals_received' || currentStatus === 'originals_verified') && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-amber-900 mb-1">Document Already Processed</p>
                  <p className="text-amber-800">
                    This document has already been received and may be processed. Cancelling will remove all tracking data.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Keep Request
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleCancel}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Cancelling...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Cancel Request
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}