import React from 'react'
import { User, Calendar, Target, Trophy, Activity, Plus } from 'lucide-react'
import { FamilyMember } from '@/types'

interface FamilyMemberCardsProps {
  members: FamilyMember[]
  onAddMember: () => void
  onViewMember: (memberId: string) => void
}

export default function FamilyMemberCards({ members, onAddMember, onViewMember }: FamilyMemberCardsProps) {
  const getRoleGradient = (role: string) => {
    switch (role) {
      case 'Parent':
        return 'from-blue-500 to-blue-600'
      case 'Student':
        return 'from-green-500 to-green-600'
      case 'Family Member':
        return 'from-purple-500 to-purple-600'
      default:
        return 'from-gray-500 to-gray-600'
    }
  }

  const getAgeGroupIcon = (ageGroup: string) => {
    switch (ageGroup) {
      case 'Adult':
        return '👤'
      case 'Teen':
        return '🧑‍🎓'
      case 'Child':
        return '🧒'
      case 'Preschool':
        return '👶'
      case 'Toddler':
        return '🍼'
      default:
        return '👤'
    }
  }

  // Mock activity data for demonstration - using consistent values to avoid hydration issues
  const getActivityStats = (memberId: string) => {
    // Use member ID to generate consistent "random" values
    const seed = memberId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const mockStats = {
      upcomingEvents: (seed % 8) + 2,
      completedGoals: (seed % 4) + 1,
      totalGoals: ((seed * 2) % 3) + 4,
      weeklyActivity: (seed % 6) + 2
    }
    return mockStats
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Family Members</h3>
          <p className="text-sm text-gray-600">{members.length} active members</p>
        </div>
        <button
          onClick={onAddMember}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {members.map((member) => {
          const stats = getActivityStats(member.id)
          const completionRate = stats.totalGoals > 0 ? (stats.completedGoals / stats.totalGoals) * 100 : 0

          return (
            <div
              key={member.id}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 cursor-pointer group"
              onClick={() => onViewMember(member.id)}
            >
              {/* Header with avatar and basic info */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="relative">
                  {/* Avatar */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    style={{ backgroundColor: member.color }}
                  >
                    {member.icon || member.name.charAt(0).toUpperCase()}
                  </div>
                  {/* Age group indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs shadow-md border border-gray-200">
                    {getAgeGroupIcon(member.ageGroup)}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                    {member.name}
                  </h4>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r ${getRoleGradient(member.role)} text-white`}>
                      {member.role}
                    </span>
                    <span className="text-xs text-gray-500">
                      {member.ageGroup}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity stats */}
              <div className="space-y-3">
                {/* Upcoming events */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm text-gray-600">Upcoming Events</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.upcomingEvents}</span>
                </div>

                {/* Goals progress */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-green-600" />
                    </div>
                    <span className="text-sm text-gray-600">Goals</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.completedGoals}/{stats.totalGoals}
                  </span>
                </div>

                {/* Weekly activity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Activity className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-sm text-gray-600">Active Days</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">{stats.weeklyActivity}/7</span>
                </div>

                {/* Progress bar for goals */}
                <div className="pt-2">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Goal Completion</span>
                    <span>{completionRate.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${completionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Fitness goals (if any) */}
              {member.fitnessGoals && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <h5 className="text-xs font-medium text-gray-700 mb-2">Fitness Goals</h5>
                  <div className="grid grid-cols-2 gap-2">
                    {member.fitnessGoals.steps && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Steps</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {member.fitnessGoals.steps.toLocaleString()}
                        </div>
                      </div>
                    )}
                    {member.fitnessGoals.workouts && (
                      <div className="text-center">
                        <div className="text-xs text-gray-500">Workouts</div>
                        <div className="text-sm font-semibold text-gray-900">
                          {member.fitnessGoals.workouts}/week
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action indicator */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-center text-xs text-gray-500 group-hover:text-blue-600 transition-colors">
                  <User className="w-3 h-3 mr-1" />
                  Click to view profile
                </div>
              </div>
            </div>
          )
        })}

        {/* Add member card */}
        <div
          className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-2xl p-6 hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 cursor-pointer group"
          onClick={onAddMember}
        >
          <div className="text-center">
            <div className="w-14 h-14 mx-auto bg-gray-200 group-hover:bg-blue-200 rounded-2xl flex items-center justify-center mb-4 transition-colors duration-300">
              <Plus className="w-6 h-6 text-gray-400 group-hover:text-blue-600 transition-colors duration-300" />
            </div>
            <h4 className="font-semibold text-gray-700 group-hover:text-blue-700 transition-colors duration-300 mb-2">
              Add Family Member
            </h4>
            <p className="text-sm text-gray-500">
              Invite a new member to join your family hub
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}