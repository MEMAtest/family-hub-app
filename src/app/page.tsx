'use client'

import FamilyHubApp from '@/components/FamilyHubApp'
import DataInitializer from '@/components/DataInitializer'

export default function HomePage() {
  return (
    <>
      <DataInitializer />
      <FamilyHubApp />
    </>
  )
}