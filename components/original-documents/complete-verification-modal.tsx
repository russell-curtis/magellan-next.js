'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle, XCircle, AlertTriangle, FileCheck, Building } from 'lucide-react'
import { toast } from 'sonner'

interface CompleteVerificationModalProps {
  originalDocumentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onVerificationCompleted: () => void
}

export function CompleteVerificationModal({
  originalDocumentId,
  open,
  onOpenChange,
  onVerificationCompleted
}: CompleteVerificationModalProps) {
  const [loading, setLoading] = useState(false)
  const [verificationStatus, setVerificationStatus] = useState<'verified' | 'rejected'>('verified')
  const [verificationNotes, setVerificationNotes] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authenticationDetails, setAuthenticationDetails] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (verificationStatus === 'rejected' && !verificationNotes.trim()) {
      toast.error('Verification notes are required when rejecting a document')
      return
    }

    setLoading(true)

    try {
      const payload = {
        action: 'complete_verification',
        verificationStatus,
        verificationNotes: verificationNotes.trim() || undefined,
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
        toast.success(data.message || 'Document verification completed successfully')
        onVerificationCompleted()
        onOpenChange(false)
        
        // Reset form
        setVerificationStatus('verified')
        setVerificationNotes('')
        setIsAuthenticated(false)
        setAuthenticationDetails('')
        setInternalNotes('')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to complete document verification')
      }
    } catch (error) {
      console.error('Error completing verification:', error)
      toast.error('Network error while completing verification')
    } finally {
      setLoading(false)
    }
  }

  const isVerified = verificationStatus === 'verified'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Complete Document Verification
          </DialogTitle>
          <DialogDescription>
            Complete the verification process for this original document. 
            This will determine if the document is ready for government submission.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Verification Decision */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Verification Decision</Label>
            <Select
              value={verificationStatus}
              onValueChange={(value: 'verified' | 'rejected') => setVerificationStatus(value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select verification decision" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="verified">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <span className="font-medium text-green-900">Approve Document</span>
                      <p className="text-xs text-green-700">Ready for government submission</p>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="rejected">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-600" />
                    <div>
                      <span className="font-medium text-red-900">Reject Document</span>
                      <p className="text-xs text-red-700">Has issues that need resolution</p>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            
            {/* Visual indication of current selection */}
            <div className={`p-3 border rounded-lg ${
              verificationStatus === 'verified' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {verificationStatus === 'verified' ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <span className="font-medium text-green-900">Document will be approved</span>
                      <p className="text-sm text-green-700">Document meets all requirements and is ready for government submission</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-600" />
                    <div>
                      <span className="font-medium text-red-900">Document will be rejected</span>
                      <p className="text-sm text-red-700">Document has issues that need to be resolved</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Verification Notes */}
          <div className="space-y-2">
            <Label htmlFor="verification-notes">
              Verification Notes {!isVerified && <span className="text-red-500">*</span>}
            </Label>
            <Textarea
              id="verification-notes"
              placeholder={
                isVerified 
                  ? "Any observations or notes about the verification process..." 
                  : "Explain why the document is being rejected and what needs to be corrected..."
              }
              value={verificationNotes}
              onChange={(e) => setVerificationNotes(e.target.value)}
              rows={4}
              required={!isVerified}
            />
          </div>

          {/* Authentication Status (only for approved documents) */}
          {isVerified && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="authenticated" className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Document is Properly Authenticated
                  </Label>
                  <p className="text-xs text-gray-600">
                    Confirm if document has required apostille, notarization, or other authentication
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
                    placeholder="Describe the authentication (apostille, notarization, embassy certification, etc.)..."
                    value={authenticationDetails}
                    onChange={(e) => setAuthenticationDetails(e.target.value)}
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          {/* Internal Notes */}
          <div className="space-y-2">
            <Label htmlFor="internal-notes">Internal Notes (Optional)</Label>
            <Textarea
              id="internal-notes"
              placeholder="Any additional notes for the team or future reference..."
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* Status Information */}
          <div className={`border rounded-lg p-4 ${
            isVerified ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-start gap-2">
              {isVerified ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div>
                <h4 className={`font-medium ${
                  isVerified ? 'text-green-900' : 'text-red-900'
                }`}>
                  {isVerified ? 'Document Will Be Approved' : 'Document Will Be Rejected'}
                </h4>
                <ul className={`text-sm mt-1 space-y-1 ${
                  isVerified ? 'text-green-800' : 'text-red-800'
                }`}>
                  {isVerified ? (
                    <>
                      <li>• Status will change to "Originals Verified"</li>
                      <li>• Document will be ready for government submission</li>
                      {isAuthenticated && <li>• Authentication status will be recorded</li>}
                      <li>• Team will be notified of completion</li>
                    </>
                  ) : (
                    <>
                      <li>• Status will revert to "Originals Received"</li>
                      <li>• Document will need corrections or replacement</li>
                      <li>• Client may need to be contacted</li>
                      <li>• Team will be notified of the issues</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

          {/* Special notice for verified documents */}
          {isVerified && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <Building className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900">Ready for Government Submission</h4>
                  <p className="text-sm text-blue-800 mt-1">
                    Once verified, this document will contribute to the application's readiness 
                    for government submission. The system will automatically check if all required 
                    original documents are verified.
                  </p>
                </div>
              </div>
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
              disabled={loading}
              variant={isVerified ? 'default' : 'destructive'}
              className="min-w-[160px]"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Processing...
                </div>
              ) : (
                isVerified ? 'Approve Document' : 'Reject Document'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}