'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Building2, Users, Sparkles } from 'lucide-react'

interface UserSetupProps {
  onSetupComplete: () => void
}

export function UserSetup({ onSetupComplete }: UserSetupProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    firmName: '',
    firmSlug: '',
    role: 'admin'
  })

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 50)
  }

  const handleFirmNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      firmName: name,
      firmSlug: generateSlug(name)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/user/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Setup API error:', error)
        throw new Error(error.details || error.error || 'Setup failed')
      }

      toast({
        title: 'Welcome!',
        description: 'Your CRBI firm has been set up successfully.'
      })

      onSetupComplete()
    } catch (error) {
      console.error('Setup error:', error)
      toast({
        title: 'Setup Failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (step === 1) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Sparkles className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">Welcome to CRBI Platform</CardTitle>
            <CardDescription>
              Let&apos;s set up your firm to get started with managing your CRBI clients and programs.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => setStep(2)} 
              className="w-full"
              size="lg"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Set Up Your Firm</CardTitle>
          <CardDescription>
            Create your CRBI advisory firm profile to start managing clients and programs.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="firmName">Firm Name *</Label>
              <Input
                id="firmName"
                placeholder="e.g. Global Investment Advisory"
                value={formData.firmName}
                onChange={(e) => handleFirmNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="firmSlug">Firm URL Identifier</Label>
              <div className="flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 text-sm">
                  platform.com/
                </span>
                <Input
                  id="firmSlug"
                  className="rounded-l-none"
                  value={formData.firmSlug}
                  onChange={(e) => setFormData(prev => ({ ...prev, firmSlug: e.target.value }))}
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This will be used for your firm&apos;s unique identifier
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Your Role</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Firm Administrator</SelectItem>
                  <SelectItem value="advisor">Senior Advisor</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 space-y-3">
              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Users className="mr-2 h-4 w-4 animate-pulse" />
                    Setting up your firm...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create My Firm
                  </>
                )}
              </Button>
              
              <p className="text-xs text-center text-muted-foreground">
                You can invite team members and modify settings later
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}