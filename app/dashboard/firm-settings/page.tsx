'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Building2, MapPin, Phone, Mail, Globe, Calendar, Users } from 'lucide-react'
import { toast } from 'sonner'

interface FirmData {
  id: string
  name: string
  description: string | null
  website: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  country: string | null
  postalCode: string | null
  createdAt: string
  _count: {
    users: number
    applications: number
  }
}

export default function FirmSettingsPage() {
  const [firmData, setFirmData] = useState<FirmData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    website: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: ''
  })

  useEffect(() => {
    fetchFirmData()
  }, [])

  const fetchFirmData = async () => {
    try {
      const response = await fetch('/api/firm/settings')
      if (response.ok) {
        const data = await response.json()
        setFirmData(data.firm)
        setFormData({
          name: data.firm.name || '',
          description: data.firm.description || '',
          website: data.firm.website || '',
          phone: data.firm.phone || '',
          email: data.firm.email || '',
          address: data.firm.address || '',
          city: data.firm.city || '',
          state: data.firm.state || '',
          country: data.firm.country || '',
          postalCode: data.firm.postalCode || ''
        })
      } else {
        toast.error('Failed to load firm settings')
      }
    } catch (error) {
      console.error('Error fetching firm data:', error)
      toast.error('Failed to load firm settings')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/firm/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setFirmData(data.firm)
        toast.success('Firm settings updated successfully')
      } else {
        const errorData = await response.json()
        toast.error(errorData.error || 'Failed to update firm settings')
      }
    } catch (error) {
      console.error('Error updating firm settings:', error)
      toast.error('Failed to update firm settings')
    } finally {
      setSaving(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Firm Settings</h1>
          <p className="text-sm text-gray-600 mt-2">
            Manage your firm's information and settings
          </p>
        </div>
      </div>

      {firmData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Firm Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Firm Overview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Team Members:</span>
                <Badge variant="secondary">{firmData._count.users}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Applications:</span>
                <Badge variant="secondary">{firmData._count.applications}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Created:</span>
                <span className="text-sm">
                  {new Date(firmData.createdAt).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Main Settings Form */}
          <div className="lg:col-span-2 space-y-6">
            <form onSubmit={handleSave} className="space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>
                    Update your firm's basic details and contact information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firm-name">Firm Name *</Label>
                      <Input
                        id="firm-name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Enter firm name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm-website">Website</Label>
                      <Input
                        id="firm-website"
                        type="url"
                        value={formData.website}
                        onChange={(e) => handleInputChange('website', e.target.value)}
                        placeholder="https://www.example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firm-description">Description</Label>
                    <Textarea
                      id="firm-description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Brief description of your firm"
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firm-email">Contact Email</Label>
                      <Input
                        id="firm-email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        placeholder="contact@firm.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm-phone">Phone Number</Label>
                      <Input
                        id="firm-phone"
                        value={formData.phone}
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Address Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Address Information
                  </CardTitle>
                  <CardDescription>
                    Your firm's physical address for legal and correspondence purposes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="firm-address">Street Address</Label>
                    <Input
                      id="firm-address"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="123 Business Street"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firm-city">City</Label>
                      <Input
                        id="firm-city"
                        value={formData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm-state">State/Province</Label>
                      <Input
                        id="firm-state"
                        value={formData.state}
                        onChange={(e) => handleInputChange('state', e.target.value)}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="firm-postal">Postal Code</Label>
                      <Input
                        id="firm-postal"
                        value={formData.postalCode}
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        placeholder="10001"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="firm-country">Country</Label>
                    <Input
                      id="firm-country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="United States"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button type="submit" disabled={saving} className="min-w-[120px]">
                  {saving ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </div>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}