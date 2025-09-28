'use client'

import React, { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'

interface AppLayoutProps {
  children: React.ReactNode
  title?: string
  showAddButton?: boolean
  onAddClick?: () => void
  addButtonLabel?: string
}

export default function AppLayout({
  children,
  title = 'Dashboard',
  showAddButton = false,
  onAddClick,
  addButtonLabel = 'Add New'
}: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleMenuToggle = () => {
    setSidebarOpen(!sidebarOpen)
  }

  const handleSidebarClose = () => {
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={handleSidebarClose} />

      {/* Main content area */}
      <div className="lg:pl-64">
        {/* Header */}
        <Header
          onMenuToggle={handleMenuToggle}
          title={title}
          showAddButton={showAddButton}
          onAddClick={onAddClick}
          addButtonLabel={addButtonLabel}
        />

        {/* Page content */}
        <main className="flex-1">
          <div className="px-4 py-6 lg:px-6 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}