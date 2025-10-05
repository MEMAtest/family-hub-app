'use client'

import React from 'react'
import {
  Calendar,
  PoundSterling,
  UtensilsCrossed,
  ShoppingCart,
  Users,
  Target,
  TrendingUp,
  AlertCircle,
  Plus,
  ArrowRight,
  Activity
} from 'lucide-react'

interface MobileDashboardProps {
  onViewChange: (view: string) => void
  dashboardData?: any
}

interface QuickStatProps {
  icon: React.ComponentType<any>
  label: string
  value: string | number
  change?: string
  color: string
  bgColor: string
  onClick?: () => void
}

function QuickStat({ icon: Icon, label, value, change, color, bgColor, onClick }: QuickStatProps) {
  return (
    <div
      onClick={onClick}
      className={`${bgColor} rounded-xl p-4 border border-opacity-20 cursor-pointer hover:scale-105 transition-all duration-200 touch-friendly active:scale-95`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2 rounded-lg bg-white bg-opacity-20 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        {change && (
          <span className={`text-xs font-medium ${color} bg-white bg-opacity-20 px-2 py-1 rounded-full`}>
            {change}
          </span>
        )}
      </div>
      <div>
        <div className={`text-2xl font-bold ${color} mb-1`}>{value}</div>
        <div className={`text-sm ${color} opacity-80`}>{label}</div>
      </div>
    </div>
  )
}

interface QuickActionProps {
  icon: React.ComponentType<any>
  label: string
  description: string
  color: string
  onClick: () => void
}

function QuickAction({ icon: Icon, label, description, color, onClick }: QuickActionProps) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition-all duration-200 touch-friendly active:scale-95 text-left"
    >
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-xl bg-gray-50 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <div className="font-medium text-gray-900">{label}</div>
          <div className="text-sm text-gray-500">{description}</div>
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400" />
      </div>
    </button>
  )
}

export default function MobileDashboard({ onViewChange, dashboardData }: MobileDashboardProps) {
  const stats = [
    {
      icon: Calendar,
      label: "Today's Events",
      value: "3",
      change: "+1",
      color: "text-blue-700",
      bgColor: "bg-blue-100",
      onClick: () => onViewChange('calendar')
    },
    {
      icon: PoundSterling,
      label: "This Month",
      value: "£2,450",
      change: "-8%",
      color: "text-green-700",
      bgColor: "bg-green-100",
      onClick: () => onViewChange('budget')
    },
    {
      icon: UtensilsCrossed,
      label: "Meals Planned",
      value: "5/7",
      color: "text-orange-700",
      bgColor: "bg-orange-100",
      onClick: () => onViewChange('meals')
    },
    {
      icon: Target,
      label: "Goals Progress",
      value: "73%",
      change: "+12%",
      color: "text-purple-700",
      bgColor: "bg-purple-100",
      onClick: () => onViewChange('goals')
    }
  ]

  const quickActions = [
    {
      icon: Plus,
      label: "Add Event",
      description: "Schedule a new family event",
      color: "text-blue-600",
      onClick: () => onViewChange('calendar')
    },
    {
      icon: ShoppingCart,
      label: "Shopping List",
      description: "Manage your shopping items",
      color: "text-purple-600",
      onClick: () => onViewChange('shopping')
    },
    {
      icon: Users,
      label: "Family Members",
      description: "View and manage family",
      color: "text-pink-600",
      onClick: () => onViewChange('family')
    },
    {
      icon: Activity,
      label: "Activity Report",
      description: "Track family activities",
      color: "text-indigo-600",
      onClick: () => onViewChange('goals')
    }
  ]

  const upcomingEvents = [
    { title: "Soccer Practice", time: "4:00 PM", person: "Alex", color: "bg-blue-100 text-blue-700" },
    { title: "Parent Meeting", time: "7:30 PM", person: "Parents", color: "bg-green-100 text-green-700" },
    { title: "Doctor Appointment", time: "Tomorrow 10:00 AM", person: "Emma", color: "bg-red-100 text-red-700" }
  ]

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-4 py-6 text-white overflow-x-hidden">
        <div className="mb-4">
          <h2 className="text-2xl font-bold mb-1">Good afternoon! 👋</h2>
          <p className="text-blue-100">Here's what's happening with your family today</p>
        </div>

        {/* Today's Weather/Date */}
        <div className="bg-white bg-opacity-10 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-medium">Tuesday, October 1</div>
              <div className="text-sm text-blue-100">Clear skies, 22°C</div>
            </div>
            <div className="text-3xl">☀️</div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6 overflow-x-hidden">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-3 max-w-full">
          {stats.map((stat, index) => (
            <QuickStat key={index} {...stat} />
          ))}
        </div>

        {/* Upcoming Events */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Upcoming Events</h3>
              <button
                onClick={() => onViewChange('calendar')}
                className="text-sm text-blue-600 font-medium touch-friendly"
              >
                View All
              </button>
            </div>
          </div>
          <div className="p-4 space-y-3">
            {upcomingEvents.map((event, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${event.color.split(' ')[0]}`} />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{event.title}</div>
                  <div className="text-sm text-gray-500">{event.time} • {event.person}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <QuickAction key={index} {...action} />
            ))}
          </div>
        </div>

        {/* Family Activity Summary */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Family Activity</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Week's Budget Usage</span>
                <span className="font-medium text-gray-900">68%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '68%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Goals Completed</span>
                <span className="font-medium text-gray-900">4/6</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '67%' }} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600">Meals Planned</span>
                <span className="font-medium text-gray-900">5/7</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-orange-600 h-2 rounded-full" style={{ width: '71%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Soccer practice added</div>
                <div className="text-xs text-gray-500">2 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <PoundSterling className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Budget updated</div>
                <div className="text-xs text-gray-500">5 hours ago</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <UtensilsCrossed className="w-4 h-4 text-orange-600" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">Meal plan completed</div>
                <div className="text-xs text-gray-500">1 day ago</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}