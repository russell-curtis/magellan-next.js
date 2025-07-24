'use client'

import { createContext, useContext, useEffect, useState } from 'react'

interface ClientUser {
  id: string
  email: string
  firstName: string
  lastName: string
  firmId: string
}

interface ClientAuthContextType {
  client: ClientUser | null
  isLoading: boolean
  login: (token: string) => Promise<void>
  logout: () => void
}

const ClientAuthContext = createContext<ClientAuthContextType | undefined>(undefined)

export function ClientAuthProvider({ children }: { children: React.ReactNode }) {
  const [client, setClient] = useState<ClientUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('clientToken')
    if (token) {
      verifyClient(token)
    } else {
      setIsLoading(false)
    }
  }, [])

  const verifyClient = async (token: string) => {
    try {
      const response = await fetch('/api/client-auth/verify', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setClient(data.client)
      } else {
        localStorage.removeItem('clientToken')
      }
    } catch (error) {
      console.error('Client verification failed:', error)
      localStorage.removeItem('clientToken')
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (token: string) => {
    localStorage.setItem('clientToken', token)
    await verifyClient(token)
  }

  const logout = () => {
    localStorage.removeItem('clientToken')
    setClient(null)
  }

  return (
    <ClientAuthContext.Provider value={{ client, isLoading, login, logout }}>
      {children}
    </ClientAuthContext.Provider>
  )
}

export function useClientAuth() {
  const context = useContext(ClientAuthContext)
  if (context === undefined) {
    throw new Error('useClientAuth must be used within a ClientAuthProvider')
  }
  return context
}