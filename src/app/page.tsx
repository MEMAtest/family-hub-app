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
    let canRenderApp = false

    const bootstrap = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)

      try {
        const response = await fetch('/api/auth/me', {
          signal: controller.signal,
        })
        if (!mounted) return

        if (response.status === 401) {
          router.replace('/auth/sign-in')
          return
        }

        if (!response.ok) {
          router.replace('/auth/sign-in')
          return
        }

        const data = await response.json()
        if (data?.accessPending) {
          router.replace('/auth/join')
          return
        }
        canRenderApp = true
      } catch {
        if (process.env.NEXT_PUBLIC_E2E === 'true') {
          canRenderApp = true
          return
        }
        if (mounted) router.replace('/auth/sign-in')
      } finally {
        clearTimeout(timeoutId)
        if (mounted && canRenderApp) {
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
