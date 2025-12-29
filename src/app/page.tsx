'use client'

import dynamic from 'next/dynamic'

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
  // Auth is optional - just show the app directly
  return <OmosanyaFamilyHub />
}
