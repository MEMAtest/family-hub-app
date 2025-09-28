import React from 'react'
import { formatDistanceToNow } from 'date-fns'
import {
  Calendar,
  DollarSign,
  UtensilsCrossed,
  ShoppingCart,
  Target,
  Trophy
} from 'lucide-react'

interface Activity {
  id: string
  type: 'event' | 'budget' | 'meal' | 'shopping' | 'goal' | 'achievement'
  title: string
  description: string
  timestamp: string
  user: string
  userColor: string
}

interface RecentActivityProps {
  activities: Activity[]
}

export default function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (type: Activity['type']) => {
    switch (type) {
      case 'event':
        return Calendar
      case 'budget':
        return DollarSign
      case 'meal':
        return UtensilsCrossed
      case 'shopping':
        return ShoppingCart
      case 'goal':
        return Target
      case 'achievement':
        return Trophy
      default:
        return Calendar
    }
  }

  const getActivityColor = (type: Activity['type']) => {
    switch (type) {
      case 'event':
        return 'text-blue-600 bg-blue-100'
      case 'budget':
        return 'text-green-600 bg-green-100'
      case 'meal':
        return 'text-orange-600 bg-orange-100'
      case 'shopping':
        return 'text-purple-600 bg-purple-100'
      case 'goal':
        return 'text-indigo-600 bg-indigo-100'
      case 'achievement':
        return 'text-yellow-600 bg-yellow-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center">
          <Calendar className="h-6 w-6 text-gray-400" />
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">No recent activity</h3>
        <p className="mt-1 text-sm text-gray-500">
          Family activities will appear here as they happen.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {activities.slice(0, 8).map((activity) => {
        const Icon = getActivityIcon(activity.type)
        const colorClasses = getActivityColor(activity.type)

        return (
          <div key={activity.id} className="flex items-start space-x-3">
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {activity.title}
              </p>
              <p className="text-sm text-gray-500">
                {activity.description}
              </p>
              <div className="flex items-center space-x-2 mt-1">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center text-xs text-white font-medium"
                  style={{ backgroundColor: activity.userColor }}
                >
                  {activity.user.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        )
      })}

      {activities.length > 8 && (
        <button className="w-full text-center py-2 text-sm text-primary-600 hover:text-primary-700 font-medium">
          View all activity
        </button>
      )}
    </div>
  )
}