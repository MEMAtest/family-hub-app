'use client'

import React, { useState } from 'react'
import {
  Home,
  Calendar,
  PoundSterling,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Target,
  Newspaper,
  Menu,
  X
} from 'lucide-react'

interface MobileLayoutProps {
  children: React.ReactNode
  currentView: string
  onViewChange: (view: string) => void
}

interface NavItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  color: string
}

const navigationItems: NavItem[] = [
  { id: 'dashboard', label: 'Home', icon: Home, color: 'text-blue-600' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, color: 'text-green-600' },
  { id: 'budget', label: 'Budget', icon: PoundSterling, color: 'text-yellow-600' },
  { id: 'meals', label: 'Meals', icon: UtensilsCrossed, color: 'text-orange-600' },
  { id: 'shopping', label: 'Shopping', icon: ShoppingCart, color: 'text-purple-600' },
  { id: 'family', label: 'Family', icon: Users, color: 'text-pink-600' },
  { id: 'goals', label: 'Goals', icon: Target, color: 'text-indigo-600' },
  { id: 'news', label: 'News', icon: Newspaper, color: 'text-gray-600' }
]

export default function MobileLayout({ children, currentView, onViewChange }: MobileLayoutProps) {
  const [showSidebar, setShowSidebar] = useState(false)

  const handleNavigation = (viewId: string) => {
    onViewChange(viewId)
    setShowSidebar(false)
  }

  const currentNavItem = navigationItems.find(item => item.id === currentView)

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Mobile Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 pwa-safe-top">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 lg:hidden touch-friendly"
            aria-label="Open menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            {currentNavItem && (
              <div className={`p-2 rounded-lg bg-gray-50 ${currentNavItem.color}`}>
                <currentNavItem.icon className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {currentNavItem?.label || 'Family Hub'}
              </h1>
              <p className="text-xs text-gray-500">Family Management</p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Database Status Indicator */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500 hidden sm:inline">Online</span>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Overlay */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowSidebar(false)}
          />
          <div className="absolute top-0 left-0 w-80 max-w-[85vw] h-full bg-white shadow-xl">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Home className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Family Hub</h2>
                    <p className="text-xs text-gray-500">Mobile App</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 rounded-lg hover:bg-gray-100 touch-friendly"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

            <nav className="p-2">
              {navigationItems.map((item) => {
                const isActive = currentView === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigation(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl mb-1 touch-friendly transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 border border-blue-100'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-100' : 'bg-gray-100'} ${isActive ? item.color : 'text-gray-600'}`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={`font-medium ${isActive ? 'text-blue-900' : 'text-gray-900'}`}>
                        {item.label}
                      </div>
                      <div className="text-xs text-gray-500">
                        {item.id === 'dashboard' && 'Overview & Stats'}
                        {item.id === 'calendar' && 'Events & Schedule'}
                        {item.id === 'budget' && 'Finance Tracking'}
                        {item.id === 'meals' && 'Meal Planning'}
                        {item.id === 'shopping' && 'Shopping Lists'}
                        {item.id === 'family' && 'Member Management'}
                        {item.id === 'goals' && 'Goals & Achievements'}
                        {item.id === 'news' && 'Family & Local News'}
                      </div>
                    </div>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>
                )
              })}
            </nav>

            {/* Bottom Section */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-center">
                <p className="text-xs text-gray-500">Family Hub v1.0.0</p>
                <p className="text-xs text-gray-400">Progressive Web App</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden">
        <div className="min-h-full overflow-y-auto pb-20 lg:pb-4 overflow-x-hidden">
          {children}
        </div>
      </main>

      {/* Bottom Navigation for Mobile */}
      <nav className="lg:hidden bg-white border-t border-gray-200 px-2 py-2 pwa-safe-bottom fixed bottom-0 left-0 right-0 z-30">
        <div className="flex justify-around">
          {navigationItems.slice(0, 5).map((item) => {
            const isActive = currentView === item.id
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.id)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg touch-friendly transition-colors duration-200 ${
                  isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                }`}
              >
                <div className={`${isActive ? item.color : 'text-gray-400'}`}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? 'text-blue-900' : 'text-gray-500'
                }`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}