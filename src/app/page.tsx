'use client'

import dynamic from 'next/dynamic'

// Import the component with SSR disabled
const OmosanyaFamilyHub = dynamic(
  () => import('@/components/FamilyHubApp'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Family Hub...</p>
        </div>
      </div>
    )
  }
)

export default function HomePage() {
  return <OmosanyaFamilyHub />
}