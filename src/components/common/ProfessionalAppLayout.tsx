'use client'

import React, { useState } from 'react'
import ProfessionalSidebar from './ProfessionalSidebar'
import ProfessionalHeader from './ProfessionalHeader'

interface ProfessionalAppLayoutProps {
  children: React.ReactNode
  title?: string
  subtitle?: string
  showAddButton?: boolean
  onAddClick?: () => void
  addButtonLabel?: string
}

export default function ProfessionalAppLayout({
  children,
  title = 'Dashboard',
  subtitle,
  showAddButton = false,
  onAddClick,
  addButtonLabel = 'Add New'
}: ProfessionalAppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Sidebar */}
      <ProfessionalSidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content area */}
      <div className="lg:pl-80">
        {/* Header */}
        <ProfessionalHeader
          onMenuToggle={handleMenuToggle}
          title={title}
          subtitle={subtitle}
          showAddButton={showAddButton}
          onAddClick={onAddClick}
          addButtonLabel={addButtonLabel}
        />

        {/* Page content */}
        <main className="flex-1">
          <div className="px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}