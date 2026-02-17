'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// Import the component with SSR disabled
const OmosanyaFamilyHub = dynamic(
  () => import('@/components/FamilyHubApp'),
  {
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Family Hub...</p>
        </div>
      </div>
    )
  }
)

export default function HomePage() {
  const router = useRouter()
  const [isBootstrapping, setIsBootstrapping] = useState(true)

  useEffect(() => {
    let mounted = true

    const bootstrap = async () => {
      try {
        const response = await fetch('/api/auth/me')
        if (!mounted) return

        if (response.ok) {
          const data = await response.json()
          if (data?.needsOnboarding) {
            router.replace('/onboarding')
            return
          }
        }
      } catch {
        // Keep app usable even if this probe fails.
      } finally {
        if (mounted) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [router])

  if (isBootstrapping) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Family Hub...</p>
        </div>
      </div>
    )
  }

  return <OmosanyaFamilyHub />
}
