'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function ClientLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  // Clear form when component mounts (in case user navigated back)
  useEffect(() => {
    setEmail('')
    setPassword('')
    setError('')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Form submitted with:', { 
      email, 
      emailLength: email.length,
      password: '***',
      passwordLength: password.length,
      emailTrimmed: email.trim(),
      passwordTrimmed: password.trim()
    })
    
    // Basic client-side validation
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!password.trim()) {
      setError('Password is required')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    setError('')
    setIsLoading(true)

    try {
      const requestData = { 
        email: email.trim(), 
        password: password.trim() 
      }
      console.log('📡 Making API call to /api/client-auth/login with:', {
        ...requestData,
        password: '***'
      })
      
      const response = await fetch('/api/client-auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      console.log('📨 Response status:', response.status)
      const data = await response.json()
      console.log('📝 Response data:', data)

      if (!response.ok) {
        console.log('❌ Login failed. Full error details:', data)
        if (data.debug) {
          console.log('🔍 Debug info:', data.debug)
        }
        if (data.details) {
          console.log('📋 Validation details:', data.details)
        }
        throw new Error(data.error || 'Login failed')
      }

      // Store the client token
      console.log('💾 Storing token in localStorage')
      localStorage.setItem('clientToken', data.token)
      
      // Redirect to client dashboard
      console.log('🔄 Redirecting to client dashboard')
      router.push('/client/dashboard')
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 via-purple-500 to-orange-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <Image
              src="/logos/m-logo.svg"
              alt="Magellan Logo"
              width={48}
              height={34}
              className="drop-shadow-sm"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-white drop-shadow-sm">
            Magellan Client Portal
          </h2>
          <p className="mt-2 text-sm text-white/80">
            Sign in to access your account
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-white/95 shadow-2xl border-0">
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access your client portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Need access? Contact your advisor to get invited to the portal.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}