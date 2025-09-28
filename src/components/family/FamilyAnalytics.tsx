'use client';

import React, { useState } from 'react';
import { FamilyMember, FamilyActivity, FamilyStats } from '@/types/family.types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';
import {
  TrendingUp,
  Users,
  Clock,
  Calendar,
  MessageSquare,
  Photo,
  Target,
  Activity,
  Heart,
  Star,
  Gift,
  Home,
  School,
  Filter,
  Download,
  Share2,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon
} from 'lucide-react';

interface FamilyAnalyticsProps {
  familyMembers: FamilyMember[];
  activities: FamilyActivity[];
  stats: FamilyStats;
}

export const FamilyAnalytics: React.FC<FamilyAnalyticsProps> = ({
  familyMembers,
  activities: initialActivities,
  stats: initialStats
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'activity' | 'engagement' | 'goals' | 'communication'>('activity');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  const mockStats: FamilyStats = initialStats || {
    totalActivities: 156,
    weeklyEngagement: 78,
    goalsCompleted: 23,
    photosShared: 89,
    messagesExchanged: 342,
    milestones: 12,
    familyTime: 42.5,
    averageResponse: 2.3
  };

  const mockActivities: FamilyActivity[] = initialActivities.length > 0 ? initialActivities : [
    {
      id: '1',
      type: 'message',
      memberId: 'ade',
      timestamp: '2024-01-15T08:00:00',
      description: 'Sent family message',
      metadata: { count: 1 }
    },
    {
      id: '2',
      type: 'goal',
      memberId: 'askia',
      timestamp: '2024-01-15T10:30:00',
      description: 'Completed homework goal',
      metadata: { progress: 100 }
    },
    {
      id: '3',
      type: 'photo',
      memberId: 'angela',
      timestamp: '2024-01-15T14:20:00',
      description: 'Uploaded family photo',
      metadata: { count: 3 }
    },
    {
      id: '4',
      type: 'milestone',
      memberId: 'amari',
      timestamp: '2024-01-15T16:45:00',
      description: 'Piano recital milestone',
      metadata: { achievement: 'performance' }
    }
  ];

  const activityData = [
    { name: 'Mon', messages: 24, photos: 5, goals: 3, milestones: 1 },
    { name: 'Tue', messages: 18, photos: 8, goals: 5, milestones: 0 },
    { name: 'Wed', messages: 32, photos: 3, goals: 4, milestones: 2 },
    { name: 'Thu', messages: 28, photos: 12, goals: 2, milestones: 1 },
    { name: 'Fri', messages: 45, photos: 15, goals: 6, milestones: 0 },
    { name: 'Sat', messages: 38, photos: 22, goals: 1, milestones: 3 },
    { name: 'Sun', messages: 29, photos: 18, goals: 4, milestones: 1 }
  ];

  const engagementData = [
    { name: 'Ade', value: 85, color: '#3B82F6' },
    { name: 'Angela', value: 92, color: '#EF4444' },
    { name: 'Askia', value: 76, color: '#10B981' },
    { name: 'Amari', value: 68, color: '#F59E0B' }
  ];

  const goalCompletionData = [
    { month: 'Oct', completed: 8, total: 12 },
    { month: 'Nov', completed: 15, total: 18 },
    { month: 'Dec', completed: 12, total: 15 },
    { month: 'Jan', completed: 9, total: 14 }
  ];

  const communicationTrends = [
    { date: '2024-01-08', messages: 15, responses: 12 },
    { date: '2024-01-09', messages: 23, responses: 19 },
    { date: '2024-01-10', messages: 18, responses: 16 },
    { date: '2024-01-11', messages: 31, responses: 28 },
    { date: '2024-01-12', messages: 28, responses: 24 },
    { date: '2024-01-13', messages: 42, responses: 38 },
    { date: '2024-01-14', messages: 35, responses: 32 },
    { date: '2024-01-15', messages: 29, responses: 26 }
  ];

  const familyTimeData = [
    { activity: 'Meals Together', hours: 12.5, percentage: 29 },
    { activity: 'Movie Nights', hours: 8.0, percentage: 19 },
    { activity: 'Outdoor Activities', hours: 7.5, percentage: 18 },
    { activity: 'Game Time', hours: 6.0, percentage: 14 },
    { activity: 'Study/Homework', hours: 5.5, percentage: 13 },
    { activity: 'Other', hours: 3.0, percentage: 7 }
  ];

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#F97316'];

  const getChartData = () => {
    switch (selectedMetric) {
      case 'activity':
        return activityData;
      case 'engagement':
        return engagementData;
      case 'goals':
        return goalCompletionData;
      case 'communication':
        return communicationTrends;
      default:
        return activityData;
    }
  };

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    change?: string;
    changeType?: 'positive' | 'negative' | 'neutral';
    color: string;
  }> = ({ icon: IconComponent, title, value, change, changeType = 'neutral', color }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${
              changeType === 'positive' ? 'text-green-600' :
              changeType === 'negative' ? 'text-red-600' : 'text-gray-600'
            }`}>
              <TrendingUp className="w-4 h-4" />
              <span>{change}</span>
            </div>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <IconComponent className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const renderChart = () => {
    const data = getChartData();

    if (selectedMetric === 'engagement' && chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={engagementData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {engagementData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="messages" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="photos" stroke="#EF4444" strokeWidth={2} />
            <Line type="monotone" dataKey="goals" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="messages" fill="#3B82F6" />
          <Bar dataKey="photos" fill="#EF4444" />
          <Bar dataKey="goals" fill="#10B981" />
          <Bar dataKey="milestones" fill="#F59E0B" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Family Analytics</h2>
              <p className="text-sm text-gray-600">
                Insights into your family's activities and engagement
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
              <Share2 className="w-4 h-4" />
              Share
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="activity">Family Activity</option>
              <option value="engagement">Member Engagement</option>
              <option value="goals">Goal Completion</option>
              <option value="communication">Communication</option>
            </select>
          </div>

          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setChartType('bar')}
              className={`p-2 transition-colors ${
                chartType === 'bar' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-2 transition-colors ${
                chartType === 'line' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setChartType('pie')}
              className={`p-2 transition-colors ${
                chartType === 'pie' ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <PieChartIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={Activity}
            title="Total Activities"
            value={mockStats.totalActivities}
            change="+12% from last month"
            changeType="positive"
            color="blue"
          />
          <StatCard
            icon={Users}
            title="Weekly Engagement"
            value={`${mockStats.weeklyEngagement}%`}
            change="+5% from last week"
            changeType="positive"
            color="green"
          />
          <StatCard
            icon={Target}
            title="Goals Completed"
            value={mockStats.goalsCompleted}
            change="+3 this month"
            changeType="positive"
            color="purple"
          />
          <StatCard
            icon={MessageSquare}
            title="Messages Exchanged"
            value={mockStats.messagesExchanged}
            change="+18% this week"
            changeType="positive"
            color="red"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {selectedMetric === 'activity' && 'Family Activity Overview'}
                {selectedMetric === 'engagement' && 'Member Engagement Levels'}
                {selectedMetric === 'goals' && 'Goal Completion Trends'}
                {selectedMetric === 'communication' && 'Communication Patterns'}
              </h3>
              {renderChart()}
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Photo className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Photos Shared</span>
                  </div>
                  <span className="font-semibold text-gray-900">{mockStats.photosShared}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">Milestones</span>
                  </div>
                  <span className="font-semibold text-gray-900">{mockStats.milestones}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Family Time (hrs)</span>
                  </div>
                  <span className="font-semibold text-gray-900">{mockStats.familyTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Avg Response (hrs)</span>
                  </div>
                  <span className="font-semibold text-gray-900">{mockStats.averageResponse}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Activities</h3>
              <div className="space-y-3">
                {familyTimeData.slice(0, 4).map((activity, index) => (
                  <div key={activity.activity} className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full bg-${colors[index]}`} style={{ backgroundColor: colors[index] }} />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">{activity.activity}</span>
                        <span className="text-sm text-gray-600">{activity.hours}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                        <div
                          className="bg-blue-600 h-1.5 rounded-full"
                          style={{ width: `${activity.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Participation</h3>
            <div className="space-y-4">
              {familyMembers.map((member, index) => {
                const participation = engagementData.find(e => e.name === member.firstName)?.value || 0;
                return (
                  <div key={member.id} className="flex items-center gap-3">
                    {member.profilePicture ? (
                      <img
                        src={member.profilePicture}
                        alt={`${member.firstName} ${member.lastName}`}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {member.firstName[0]}{member.lastName[0]}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{member.firstName}</span>
                        <span className="text-sm text-gray-600">{participation}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full`}
                          style={{
                            width: `${participation}%`,
                            backgroundColor: colors[index % colors.length]
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Achievements</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Trophy className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Askia's Soccer Trophy</p>
                  <p className="text-sm text-gray-600">Championship victory</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Angela's Master's Degree</p>
                  <p className="text-sm text-gray-600">Education milestone</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Family Vacation</p>
                  <p className="text-sm text-gray-600">Disney World adventure</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};