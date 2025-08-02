"use client"

import { useEffect, useState } from 'react'

export function useVersion() {
  const [version, setVersion] = useState<string>('0.1.0')

  useEffect(() => {
    // In production, this would typically be injected at build time
    // For now, we'll use a default version that can be updated
    const getVersion = async () => {
      try {
        // Try to get version from a build-time injected value or use default
        const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0'
        setVersion(appVersion)
      } catch (error) {
        console.warn('Could not load version, using default')
        setVersion('0.1.0')
      }
    }

    getVersion()
  }, [])

  // Format version to match the design (v-x.xx)
  const formatVersion = (ver: string) => {
    // Remove 'v' prefix if it exists and add our format
    const cleanVersion = ver.replace(/^v/, '')
    return `v-${cleanVersion}`
  }

  return {
    version: formatVersion(version),
    rawVersion: version
  }
}