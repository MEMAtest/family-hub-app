'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Calendar,
  DollarSign,
  UtensilsCrossed,
  ShoppingCart,
  Target,
  Users,
  Newspaper,
  Settings,
  LogOut
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    description: 'Overview of family activities'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'Family events and schedules'
  },
  {
    name: 'Budget',
    href: '/budget',
    icon: DollarSign,
    description: 'Income and expense tracking'
  },
  {
    name: 'Meals',
    href: '/meals',
    icon: UtensilsCrossed,
    description: 'Meal planning and nutrition'
  },
  {
    name: 'Shopping',
    href: '/shopping',
    icon: ShoppingCart,
    description: 'Shopping lists and items'
  },
  {
    name: 'Goals',
    href: '/goals',
    icon: Target,
    description: 'Family and personal goals'
  },
  {
    name: 'Family',
    href: '/family',
    icon: Users,
    description: 'Manage family members'
  },
  {
    name: 'News',
    href: '/news',
    icon: Newspaper,
    description: 'Family and local news'
  }
]

const secondaryNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    description: 'App preferences and configuration'
  }
]

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/'
    }
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo and family info */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                <Home className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Family Hub</h1>
                <p className="text-xs text-gray-500">The Smith Family</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {/* Primary navigation */}
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                      ${active
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
                      }
                    `}
                    title={item.description}
                  >
                    <Icon
                      className={`
                        mr-3 h-5 w-5 transition-colors duration-200
                        ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'}
                      `}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 my-6" />

            {/* Secondary navigation */}
            <div className="space-y-1">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      nav-item group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200
                      ${active
                        ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                        : 'text-gray-700 hover:bg-gray-100 hover:text-primary-600'
                      }
                    `}
                    title={item.description}
                  >
                    <Icon
                      className={`
                        mr-3 h-5 w-5 transition-colors duration-200
                        ${active ? 'text-primary-600' : 'text-gray-400 group-hover:text-primary-600'}
                      `}
                    />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User info and logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="family-avatar bg-primary-600">
                JS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  John Smith
                </p>
                <p className="text-xs text-gray-500 truncate">
                  john@smithfamily.com
                </p>
              </div>
            </div>

            <button
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-error-600 rounded-lg transition-colors duration-200"
              title="Sign out"
            >
              <LogOut className="mr-3 h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}