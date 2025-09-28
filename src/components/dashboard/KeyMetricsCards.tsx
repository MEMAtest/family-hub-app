import React from 'react'
import {
  Users,
  Calendar,
  DollarSign,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  CheckCircle2
} from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change: number
  changeLabel: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  iconColor: string
}

function MetricCard({ title, value, change, changeLabel, icon: Icon, gradient, iconColor }: MetricCardProps) {
  const isPositive = change >= 0
  const TrendIcon = isPositive ? TrendingUp : TrendingDown

  return (
    <div className={`
      relative overflow-hidden rounded-2xl p-6 text-white
      bg-gradient-to-br ${gradient}
      shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105
    `}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-white/5 rounded-full" />
      <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 bg-white/5 rounded-full" />

      <div className="relative z-10">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm mb-4`}>
          <Icon className={`w-6 h-6 ${iconColor}`} />
        </div>

        {/* Value */}
        <div className="space-y-1 mb-4">
          <h3 className="text-2xl font-bold">{value}</h3>
          <p className="text-white/80 text-sm font-medium">{title}</p>
        </div>

        {/* Trend */}
        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
            isPositive ? 'bg-green-400/20 text-green-100' : 'bg-red-400/20 text-red-100'
          }`}>
            <TrendIcon className="w-3 h-3" />
            <span>{change > 0 ? '+' : ''}{change}%</span>
          </div>
          <span className="text-xs text-white/70">{changeLabel}</span>
        </div>
      </div>
    </div>
  )
}

interface KeyMetricsCardsProps {
  totalMembers: number
  upcomingEvents: number
  monthlyBudget: number
  completedGoals: number
}

export default function KeyMetricsCards({
  totalMembers,
  upcomingEvents,
  monthlyBudget,
  completedGoals
}: KeyMetricsCardsProps) {
  const metrics = [
    {
      title: 'Family Members',
      value: totalMembers,
      change: 0,
      changeLabel: 'No changes',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      iconColor: 'text-white'
    },
    {
      title: 'Upcoming Events',
      value: upcomingEvents,
      change: 12,
      changeLabel: 'vs last week',
      icon: Calendar,
      gradient: 'from-emerald-500 to-emerald-600',
      iconColor: 'text-white'
    },
    {
      title: 'Monthly Budget',
      value: `£${monthlyBudget.toLocaleString()}`,
      change: -5,
      changeLabel: 'vs last month',
      icon: DollarSign,
      gradient: 'from-purple-500 to-purple-600',
      iconColor: 'text-white'
    },
    {
      title: 'Goals Completed',
      value: `${completedGoals}/8`,
      change: 25,
      changeLabel: 'completion rate',
      icon: Target,
      gradient: 'from-orange-500 to-orange-600',
      iconColor: 'text-white'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {metrics.map((metric) => (
        <MetricCard key={metric.title} {...metric} />
      ))}
    </div>
  )
}