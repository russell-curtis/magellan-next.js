'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useClientAuth } from '@/lib/client-auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { HelpCircle, MessageSquare, Phone, Mail, FileText, Clock, CheckCircle } from 'lucide-react'

export default function ClientSupportPage() {
  const { client, isLoading } = useClientAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !client) {
      router.push('/client/login')
    }
  }, [client, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!client) {
    return null
  }

  // Placeholder data for support tickets
  const supportTickets = [
    {
      id: '1',
      subject: 'Question about investment requirements',
      status: 'open',
      priority: 'medium',
      createdAt: '2024-07-20',
      lastUpdated: '2024-07-22',
    },
    {
      id: '2',
      subject: 'Document submission clarification',
      status: 'resolved',
      priority: 'low',
      createdAt: '2024-07-15', 
      lastUpdated: '2024-07-18',
    },
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <HelpCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-yellow-100 text-yellow-800'
      case 'resolved':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-orange-100 text-orange-800'
      case 'low':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="text-gray-600 mt-1">
            Get help and support for your immigration journey
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contact Options */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Your Advisory Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Button 
                className="h-auto py-4 justify-start"
                variant="outline"
                onClick={() => router.push('/client/dashboard/messages')}
              >
                <MessageSquare className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Send Message</div>
                  <div className="text-xs text-gray-600">Chat with your advisor</div>
                </div>
              </Button>

              <Button 
                className="h-auto py-4 justify-start"
                variant="outline"
              >
                <Phone className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Schedule Call</div>
                  <div className="text-xs text-gray-600">Book a consultation</div>
                </div>
              </Button>

              <Button 
                className="h-auto py-4 justify-start"
                variant="outline"
              >
                <Mail className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">Email Support</div>
                  <div className="text-xs text-gray-600">Send detailed inquiry</div>
                </div>
              </Button>

              <Button 
                className="h-auto py-4 justify-start"
                variant="outline"
              >
                <FileText className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-medium">FAQ</div>
                  <div className="text-xs text-gray-600">Common questions</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Submit New Request */}
        <Card>
          <CardHeader>
            <CardTitle>Submit Support Request</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                placeholder="Brief description of your question or issue"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="application">Application Status</SelectItem>
                  <SelectItem value="documents">Document Questions</SelectItem>
                  <SelectItem value="investment">Investment Requirements</SelectItem>
                  <SelectItem value="timeline">Process Timeline</SelectItem>
                  <SelectItem value="technical">Technical Issues</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority level" />
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
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Please provide detailed information about your question or issue"
                className="min-h-[120px]"
              />
            </div>

            <Button className="w-full">
              Submit Request
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Support Tickets History */}
      <Card>
        <CardHeader>
          <CardTitle>Your Support Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {supportTickets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">No support requests yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Submit a request above if you need assistance
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {supportTickets.map((ticket) => (
                <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(ticket.status)}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {ticket.subject}
                      </h4>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500">
                          Created: {new Date(ticket.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          Updated: {new Date(ticket.lastUpdated).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(ticket.status)}`}>
                      {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.charAt(0).toUpperCase() + ticket.priority.slice(1)}
                    </span>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Help Resources</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <h3 className="font-medium text-gray-900 mb-1">User Guide</h3>
              <p className="text-sm text-gray-600 mb-3">
                Complete guide to using the client portal
              </p>
              <Button variant="outline" size="sm">
                Download PDF
              </Button>
            </div>

            <div className="p-4 border rounded-lg text-center">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <h3 className="font-medium text-gray-900 mb-1">FAQ</h3>
              <p className="text-sm text-gray-600 mb-3">
                Frequently asked questions and answers
              </p>
              <Button variant="outline" size="sm">
                View FAQ
              </Button>
            </div>

            <div className="p-4 border rounded-lg text-center">
              <Phone className="h-8 w-8 mx-auto mb-2 text-purple-600" />
              <h3 className="font-medium text-gray-900 mb-1">Emergency Contact</h3>
              <p className="text-sm text-gray-600 mb-3">
                24/7 support for urgent matters
              </p>
              <Button variant="outline" size="sm">
                Call Now
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}