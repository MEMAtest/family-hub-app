import React from 'react'
import { LucideIcon, MoreHorizontal, TrendingUp, TrendingDown } from 'lucide-react'

interface DashboardWidgetProps {
  title: string
  children: React.ReactNode
  action?: {
    label: string
    onClick: () => void
    icon?: LucideIcon
  }
  size?: 'small' | 'medium' | 'large' | 'full'
  className?: string
  loading?: boolean
  trend?: {
    value: number
    label: string
    type: 'up' | 'down' | 'neutral'
  }
  value?: string | number
  subtitle?: string
  gradient?: string
}

export default function SophisticatedDashboardWidget({
  title,
  children,
  action,
  size = 'medium',
  className = '',
  loading = false,
  trend,
  value,
  subtitle,
  gradient
}: DashboardWidgetProps) {
  const sizeClasses = {
    small: 'col-span-1',
    medium: 'col-span-1 md:col-span-2',
    large: 'col-span-1 md:col-span-2 lg:col-span-3',
    full: 'col-span-full'
  }

  const getTrendIcon = () => {
    if (!trend) return null
    return trend.type === 'up' ? TrendingUp : trend.type === 'down' ? TrendingDown : null
  }

  const getTrendColor = () => {
    if (!trend) return ''
    return trend.type === 'up' ? 'text-green-600' : trend.type === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  const TrendIcon = getTrendIcon()

  return (
    <div className={`
      bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200/50 p-6
      hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-out
      ${sizeClasses[size]} ${className}
      ${gradient ? `bg-gradient-to-br ${gradient}` : ''}
    `}>
      {/* Widget header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-semibold ${gradient ? 'text-white' : 'text-gray-900'}`}>
              {title}
            </h3>
            <div className="flex items-center space-x-2">
              {trend && (
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  gradient ? 'bg-white/20 text-white' : `bg-gray-100 ${getTrendColor()}`
                }`}>
                  {TrendIcon && <TrendIcon className="w-3 h-3" />}
                  <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
                </div>
              )}
              <button className={`p-1.5 rounded-lg transition-colors duration-200 ${
                gradient ? 'hover:bg-white/20 text-white' : 'hover:bg-gray-100 text-gray-400'
              }`}>
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {value && (
            <div className="mt-2">
              <div className={`text-3xl font-bold ${gradient ? 'text-white' : 'text-gray-900'}`}>
                {value}
              </div>
              {subtitle && (
                <div className={`text-sm ${gradient ? 'text-white/80' : 'text-gray-600'}`}>
                  {subtitle}
                </div>
              )}
            </div>
          )}

          {trend && (
            <p className={`text-xs mt-1 ${gradient ? 'text-white/80' : 'text-gray-500'}`}>
              {trend.label}
            </p>
          )}
        </div>

        {action && (
          <button
            onClick={action.onClick}
            className={`
              inline-flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200
              ${gradient
                ? 'text-white hover:bg-white/20 border border-white/30'
                : 'text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200'
              }
            `}
            disabled={loading}
          >
            {action.icon && <action.icon className="w-4 h-4 mr-2" />}
            {action.label}
          </button>
        )}
      </div>

      {/* Widget content */}
      <div className="relative">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className={`loading-spinner ${gradient ? 'border-white/30 border-t-white' : ''}`} />
            <span className={`ml-3 text-sm ${gradient ? 'text-white/80' : 'text-gray-500'}`}>
              Loading...
            </span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  )
}