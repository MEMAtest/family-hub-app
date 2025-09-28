import React from 'react'
import { Users, Calendar, CheckCircle, Target } from 'lucide-react'

interface QuickStatsProps {
  totalMembers: number
  upcomingEvents: number
  completedTasks: number
  activeGoals: number
}

export default function QuickStats({
  totalMembers,
  upcomingEvents,
  completedTasks,
  activeGoals
}: QuickStatsProps) {
  const stats = [
    {
      name: 'Family Members',
      value: totalMembers,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Upcoming Events',
      value: upcomingEvents,
      icon: Calendar,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Tasks Done Today',
      value: completedTasks,
      icon: CheckCircle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100'
    },
    {
      name: 'Active Goals',
      value: activeGoals,
      icon: Target,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.name}
            className="bg-white p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="ml-3">
                <p className="text-2xl font-semibold text-gray-900">
                  {stat.value}
                </p>
                <p className="text-sm text-gray-500">
                  {stat.name}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}