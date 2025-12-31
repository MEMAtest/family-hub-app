'use client'

import React from 'react'
import { Menu, Search, Plus, Filter, MoreVertical } from 'lucide-react'
import NotificationBell from '@/components/notifications/NotificationBell'

interface ProfessionalHeaderProps {
  onMenuToggle: () => void
  title?: string
  subtitle?: string
  showAddButton?: boolean
  onAddClick?: () => void
  addButtonLabel?: string
}

export default function ProfessionalHeader({
  onMenuToggle,
  title = 'Dashboard',
  subtitle,
  showAddButton = false,
  onAddClick,
  addButtonLabel = 'Add New'
}: ProfessionalHeaderProps) {
  return (
    <header className="bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-200/50 sticky top-0 z-30">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center space-x-6">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 lg:hidden transition-all duration-200"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-gray-900 lg:text-3xl">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-gray-600 mt-1">
                {subtitle}
              </p>
            )}
            <p className="text-sm text-gray-500 hidden sm:block mt-1">
              Today's Overview
            </p>
          </div>
        </div>

        {/* Right side - Search, actions, and notifications */}
        <div className="flex items-center space-x-4">
          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search family data..."
                className="pl-10 pr-4 py-2.5 w-72 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-gray-50/50 hover:bg-white"
              />
            </div>
          </div>

          {/* Mobile search button */}
          <button
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 md:hidden transition-all duration-200"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Filter button */}
          <button
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 transition-all duration-200"
            aria-label="Filter"
          >
            <Filter className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <NotificationBell className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 transition-all duration-200" />

          {/* Add button */}
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonLabel}</span>
            </button>
          )}

          {/* Mobile add button */}
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="p-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl shadow-lg hover:shadow-xl sm:hidden transition-all duration-200 transform hover:scale-105"
              aria-label={addButtonLabel}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}

          {/* More options */}
          <button
            className="p-2.5 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-100/70 transition-all duration-200"
            aria-label="More options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
