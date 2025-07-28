'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar,
  MapPin,
  Truck,
  Clock,
  AlertTriangle,
  CheckCircle,
  Package,
  FileText,
  User,
  MoreHorizontal,
  Edit,
  Eye,
  ExternalLink
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { UpdateShippingModal } from './update-shipping-modal'
import { ConfirmReceiptModal } from './confirm-receipt-modal'
import { CompleteVerificationModal } from './complete-verification-modal'
import { CancelRequestModal } from './cancel-request-modal'

interface OriginalDocument {
  id: string
  applicationId: string
  documentRequirementId: string
  digitalDocumentId: string | null
  status: string
  documentName: string
  category: string | null
  isRequired: boolean
  
  // Shipping & Logistics
  shippedAt: string | null
  courierService: string | null
  trackingNumber: string | null
  shippingAddress: string | null
  clientReference: string | null
  
  // Receipt & Verification
  receivedAt: string | null
  receivedBy: string | null
  verifiedAt: string | null
  verifiedBy: string | null
  
  // Document Condition & Quality
  documentCondition: string | null
  qualityNotes: string | null
  isAuthenticated: boolean
  authenticationDetails: string | null
  
  // Deadlines & Communication
  deadline: string | null
  isUrgent: boolean
  governmentDeadline: string | null
  requestedAt: string | null
  requestedBy: string | null
  clientNotifiedAt: string | null
  remindersSent: number
  
  // Notes
  internalNotes: string | null
  clientInstructions: string | null
  
  // Related Data
  application: {
    applicationNumber: string
    status: string
  }
  documentRequirement: {
    documentName: string
    category: string
    isRequired: boolean
  }
  
  createdAt: string
  updatedAt: string
}

interface OriginalDocumentCardProps {
  document: OriginalDocument
  onStatusUpdate: () => void
  getStatusColor: (status: string) => string
  getStatusIcon: (status: string) => React.ReactNode
  formatStatusText: (status: string) => string
}

export function OriginalDocumentCard({
  document,
  onStatusUpdate,
  getStatusColor,
  getStatusIcon,
  formatStatusText
}: OriginalDocumentCardProps) {
  const [shippingModalOpen, setShippingModalOpen] = useState(false)
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [verificationModalOpen, setVerificationModalOpen] = useState(false)
  const [cancelModalOpen, setCancelModalOpen] = useState(false)

  // Check if document is overdue
  const isOverdue = document.deadline && new Date(document.deadline) < new Date()

  // Get next action based on status
  const getNextAction = () => {
    switch (document.status) {
      case 'originals_requested':
        return { 
          label: 'Update Shipping', 
          action: () => setShippingModalOpen(true),
          color: 'blue'
        }
      case 'originals_shipped':
        return { 
          label: 'Confirm Receipt', 
          action: () => setReceiptModalOpen(true),
          color: 'orange'
        }
      case 'originals_received':
        return { 
          label: 'Complete Verification', 
          action: () => setVerificationModalOpen(true),
          color: 'green'
        }
      default:
        return null
    }
  }

  const nextAction = getNextAction()

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{document.documentName}</h3>
              {document.isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="mr-1 h-3 w-3" />
                  Urgent
                </Badge>
              )}
              {document.isRequired && (
                <Badge variant="outline" className="text-xs">
                  Required
                </Badge>
              )}
              {isOverdue && (
                <Badge variant="destructive" className="text-xs">
                  <Clock className="mr-1 h-3 w-3" />
                  Overdue
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {document.application.applicationNumber}
              </span>
              {document.category && (
                <span className="capitalize">{document.category}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Badge className={getStatusColor(document.status)}>
                {getStatusIcon(document.status)}
                <span className="ml-1">{formatStatusText(document.status)}</span>
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {nextAction && (
              <Button
                size="sm"
                variant="outline"
                onClick={nextAction.action}
                className={`border-${nextAction.color}-200 text-${nextAction.color}-700 hover:bg-${nextAction.color}-50`}
              >
                {nextAction.label}
              </Button>
            )}
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Notes
                </DropdownMenuItem>
                {document.trackingNumber && (
                  <DropdownMenuItem>
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Track Package
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => setCancelModalOpen(true)}
                >
                  Cancel Request
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Status-specific information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          {/* Shipping Information */}
          {document.status !== 'originals_requested' && document.courierService && (
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium">{document.courierService}</p>
                {document.trackingNumber && (
                  <p className="text-gray-600">{document.trackingNumber}</p>
                )}
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <div>
              {document.shippedAt && (
                <p className="font-medium">
                  Shipped: {format(new Date(document.shippedAt), 'MMM dd, yyyy')}
                </p>
              )}
              {document.receivedAt && (
                <p className="font-medium">
                  Received: {format(new Date(document.receivedAt), 'MMM dd, yyyy')}
                </p>
              )}
              {document.deadline && (
                <p className={`text-xs ${isOverdue ? 'text-red-600' : 'text-gray-600'}`}>
                  Due: {format(new Date(document.deadline), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* Document Condition */}
          {document.documentCondition && (
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-gray-400" />
              <div>
                <p className="font-medium capitalize">{document.documentCondition}</p>
                {document.isAuthenticated && (
                  <p className="text-green-600 text-xs">
                    <CheckCircle className="inline h-3 w-3 mr-1" />
                    Authenticated
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Notes */}
        {(document.clientInstructions || document.internalNotes || document.qualityNotes) && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            {document.clientInstructions && (
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Client Instructions
                </p>
                <p className="text-sm text-gray-700">{document.clientInstructions}</p>
              </div>
            )}
            {document.qualityNotes && (
              <div className="mb-2">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Quality Notes
                </p>
                <p className="text-sm text-gray-700">{document.qualityNotes}</p>
              </div>
            )}
            {document.internalNotes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Internal Notes
                </p>
                <p className="text-sm text-gray-700">{document.internalNotes}</p>
              </div>
            )}
          </div>
        )}

        {/* Shipping Address */}
        {document.shippingAddress && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                  Shipping Address
                </p>
                <p className="text-sm text-gray-700 whitespace-pre-line">
                  {document.shippingAddress}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      {/* Modals */}
      <UpdateShippingModal
        originalDocumentId={document.id}
        open={shippingModalOpen}
        onOpenChange={setShippingModalOpen}
        onShippingUpdated={onStatusUpdate}
      />

      <ConfirmReceiptModal
        originalDocumentId={document.id}
        open={receiptModalOpen}
        onOpenChange={setReceiptModalOpen}
        onReceiptConfirmed={onStatusUpdate}
      />

      <CompleteVerificationModal
        originalDocumentId={document.id}
        open={verificationModalOpen}
        onOpenChange={setVerificationModalOpen}
        onVerificationCompleted={onStatusUpdate}
      />

      <CancelRequestModal
        isOpen={cancelModalOpen}
        onOpenChange={setCancelModalOpen}
        originalDocumentId={document.id}
        documentName={document.documentName}
        currentStatus={document.status}
        onCancellationComplete={onStatusUpdate}
      />
    </Card>
  )
}