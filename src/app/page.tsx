'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { DatabaseBootstrapFamily } from '@/services/databaseService'

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
  const [bootstrapFamily, setBootstrapFamily] = useState<DatabaseBootstrapFamily | null>(null)
  const [bootstrapError, setBootstrapError] = useState<string | null>(null)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    let mounted = true
    let canRenderApp = false

    const bootstrap = async () => {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000)
      let nextBootstrapError: string | null = null
      setBootstrapError(null)

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
          nextBootstrapError = 'Your session is signed in, but the account could not be loaded. Try again in a moment.'
          setBootstrapError(nextBootstrapError)
          return
        }

        const data = await response.json()
        if (data?.accessPending) {
          router.replace('/auth/join')
          return
        }
        if (data?.family?.id) {
          setBootstrapFamily({
            id: data.family.id,
            familyName: data.family.familyName,
            members: Array.isArray(data.family.members) ? data.family.members : [],
          })
        }
        canRenderApp = true
      } catch {
        if (process.env.NEXT_PUBLIC_E2E === 'true') {
          canRenderApp = true
          return
        }
        if (mounted) {
          nextBootstrapError = 'Family Hub could not confirm your session. Check the connection and try again.'
          setBootstrapError(nextBootstrapError)
        }
      } finally {
        clearTimeout(timeoutId)
        if (mounted && canRenderApp) {
          setIsBootstrapping(false)
        } else if (mounted && nextBootstrapError) {
          setIsBootstrapping(false)
        }
      }
    }

    void bootstrap()

    return () => {
      mounted = false
    }
  }, [router, retryNonce])

  if (isBootstrapping || bootstrapError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          {bootstrapError ? (
            <>
              <p className="mx-auto max-w-sm text-sm text-gray-600 dark:text-gray-300">{bootstrapError}</p>
              <button
                type="button"
                onClick={() => {
                  setIsBootstrapping(true)
                  setBootstrapError(null)
                  setRetryNonce((value) => value + 1)
                }}
                className="mt-4 rounded-md bg-[#147c72] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0f625a]"
              >
                Retry
              </button>
            </>
          ) : (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Family Hub...</p>
            </>
          )}
        </div>
      </div>
    )
  }

  return <OmosanyaFamilyHub bootstrapFamily={bootstrapFamily} />
}
