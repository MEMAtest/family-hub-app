'use client'

import React from 'react'
import { Menu, Bell, Search, Plus } from 'lucide-react'

interface HeaderProps {
  onMenuToggle: () => void
  title?: string
  showAddButton?: boolean
  onAddClick?: () => void
  addButtonLabel?: string
}

export default function Header({
  onMenuToggle,
  title = 'Dashboard',
  showAddButton = false,
  onAddClick,
  addButtonLabel = 'Add New'
}: HeaderProps) {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between px-4 py-3 lg:px-6">
        {/* Left side - Menu toggle and title */}
        <div className="flex items-center space-x-4">
          <button
            onClick={onMenuToggle}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 lg:hidden transition-colors duration-200"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div>
            <h1 className="text-xl font-semibold text-gray-900 lg:text-2xl">
              {title}
            </h1>
            <p className="text-sm text-gray-500 hidden sm:block">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>

        {/* Right side - Search, notifications, and actions */}
        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="hidden md:flex items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
              />
            </div>
          </div>

          {/* Mobile search button */}
          <button
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 md:hidden transition-colors duration-200"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button
            className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-error-500 rounded-full"></span>
          </button>

          {/* Add button */}
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="btn-primary flex items-center space-x-2 hidden sm:flex"
            >
              <Plus className="h-4 w-4" />
              <span>{addButtonLabel}</span>
            </button>
          )}

          {/* Mobile add button */}
          {showAddButton && onAddClick && (
            <button
              onClick={onAddClick}
              className="btn-primary p-2 sm:hidden"
              aria-label={addButtonLabel}
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </header>
  )
}