import React from 'react'
import { LucideIcon } from 'lucide-react'

interface DashboardWidgetProps {
  title: string
  children: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  size?: 'small' | 'medium' | 'large'
  className?: string
  loading?: boolean
}

export default function DashboardWidget({
  title,
  children,
  action,
  size = 'medium',
  className = '',
  loading = false
}: DashboardWidgetProps) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3'
  }

  return (
    <div className={`dashboard-widget ${sizeClasses[size]} ${className}`}>
      {/* Widget header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {action && (
          <button
            onClick={action.onClick}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors duration-200"
            disabled={loading}
          >
            {action.icon && <action.icon className="w-4 h-4 mr-1" />}
            {action.label}
          </button>
        )}
      </div>

      {/* Widget content */}
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="loading-spinner" />
            <span className="ml-2 text-sm text-gray-500">Loading...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}