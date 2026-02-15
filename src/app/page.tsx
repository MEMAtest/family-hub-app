'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AuthView } from '@neondatabase/neon-js/auth/react/ui'
import { authClient } from '@/lib/auth/client'
import { useAuth } from '@/contexts/AuthContext'

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
  const { data: session, isPending } = authClient.useSession()
  const { isLoading, needsOnboarding } = useAuth()

  useEffect(() => {
    if (isPending || isLoading) return
    if (session?.user && needsOnboarding) {
      router.push('/onboarding')
    }
  }, [isLoading, isPending, needsOnboarding, router, session?.user])

  if (isPending || isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading Family Hub...</p>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-900">
          <AuthView pathname="sign-in" />
        </div>
      </div>
    )
  }

  if (needsOnboarding) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Preparing onboarding...</p>
        </div>
      </div>
    )
  }

  return <OmosanyaFamilyHub />
}
