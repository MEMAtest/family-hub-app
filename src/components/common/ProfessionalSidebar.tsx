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
  LogOut,
  Bell
} from 'lucide-react'

interface NavigationItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  iconBg: string
  description: string
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '/',
    icon: Home,
    gradient: 'from-blue-500 to-blue-600',
    iconBg: 'bg-blue-500',
    description: 'Family overview and key metrics'
  },
  {
    name: 'Calendar',
    href: '/calendar',
    icon: Calendar,
    gradient: 'from-green-500 to-green-600',
    iconBg: 'bg-green-500',
    description: 'Family events and schedules'
  },
  {
    name: 'Budget',
    href: '/budget',
    icon: DollarSign,
    gradient: 'from-emerald-500 to-emerald-600',
    iconBg: 'bg-emerald-500',
    description: 'Income and expense tracking'
  },
  {
    name: 'Meals',
    href: '/meals',
    icon: UtensilsCrossed,
    gradient: 'from-orange-500 to-orange-600',
    iconBg: 'bg-orange-500',
    description: 'Meal planning and nutrition'
  },
  {
    name: 'Shopping',
    href: '/shopping',
    icon: ShoppingCart,
    gradient: 'from-purple-500 to-purple-600',
    iconBg: 'bg-purple-500',
    description: 'Shopping lists and groceries'
  },
  {
    name: 'Goals',
    href: '/goals',
    icon: Target,
    gradient: 'from-indigo-500 to-indigo-600',
    iconBg: 'bg-indigo-500',
    description: 'Family and personal goals'
  },
  {
    name: 'Family',
    href: '/family',
    icon: Users,
    gradient: 'from-pink-500 to-pink-600',
    iconBg: 'bg-pink-500',
    description: 'Manage family members'
  },
  {
    name: 'News',
    href: '/news',
    icon: Newspaper,
    gradient: 'from-cyan-500 to-cyan-600',
    iconBg: 'bg-cyan-500',
    description: 'Family and local news'
  }
]

const secondaryNavigation = [
  {
    name: 'Settings',
    href: '/settings',
    icon: Settings,
    gradient: 'from-gray-500 to-gray-600',
    iconBg: 'bg-gray-500',
    description: 'App preferences and configuration'
  }
]

interface ProfessionalSidebarProps {
  isOpen?: boolean
  onClose?: () => void
}

export default function ProfessionalSidebar({ isOpen = true, onClose }: ProfessionalSidebarProps) {
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
          fixed inset-y-0 left-0 z-50 w-80 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl transform transition-transform duration-300 ease-in-out
          lg:translate-x-0 lg:static lg:inset-0
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo and family info */}
          <div className="flex items-center justify-between px-6 py-6 border-b border-slate-700/50">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Family Hub</h1>
                <p className="text-sm text-slate-300">The Smith Family</p>
              </div>
            </div>
            <button className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/50 transition-colors">
              <Bell className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {/* Primary navigation */}
            <div className="space-y-2">
              {navigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden
                      ${active
                        ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }
                    `}
                    title={item.description}
                  >
                    {/* Active indicator */}
                    {active && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-600/20 rounded-xl" />
                    )}

                    {/* Icon with gradient background */}
                    <div className={`
                      relative w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-transform duration-200
                      ${active
                        ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                        : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                      }
                      ${active ? 'scale-110' : 'group-hover:scale-105'}
                    `}>
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-300'}`} />
                    </div>

                    <span className="relative z-10">{item.name}</span>

                    {/* Hover gradient overlay */}
                    <div className={`
                      absolute inset-0 bg-gradient-to-r ${item.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-xl
                    `} />
                  </Link>
                )
              })}
            </div>

            {/* Divider */}
            <div className="border-t border-slate-700/50 my-6" />

            {/* Secondary navigation */}
            <div className="space-y-2">
              {secondaryNavigation.map((item) => {
                const Icon = item.icon
                const active = isActive(item.href)

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden
                      ${active
                        ? 'bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/20'
                        : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }
                    `}
                    title={item.description}
                  >
                    <div className={`
                      w-8 h-8 rounded-lg flex items-center justify-center mr-3 transition-transform duration-200
                      ${active
                        ? `bg-gradient-to-br ${item.gradient} shadow-lg`
                        : 'bg-slate-700/50 group-hover:bg-slate-600/50'
                      }
                      ${active ? 'scale-110' : 'group-hover:scale-105'}
                    `}>
                      <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </nav>

          {/* User profile section */}
          <div className="px-4 py-4 border-t border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-lg">
                JS
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  John Smith
                </p>
                <p className="text-xs text-slate-400 truncate">
                  john@smithfamily.com
                </p>
              </div>
            </div>

            <button
              className="w-full flex items-center px-4 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors duration-200 group"
              title="Sign out"
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center mr-3 bg-slate-700/50 group-hover:bg-red-500/20 transition-colors duration-200">
                <LogOut className="w-4 h-4" />
              </div>
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}