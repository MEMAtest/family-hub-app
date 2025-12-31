'use client';

import React, { useMemo, useState } from 'react';
import { FamilyMember, FamilyMilestone, MilestoneType } from '@/types';
import { useFamilyStore } from '@/store/familyStore';
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
  Line
} from 'recharts';
import {
  Users,
  Clock,
  Calendar,
  Target,
  Star,
  Filter,
  Download,
  Share2,
  BarChart3,
  PieChart as PieChartIcon,
  LineChart as LineChartIcon,
  Trophy
} from 'lucide-react';

interface FamilyAnalyticsProps {
  familyMembers: FamilyMember[];
  milestones: FamilyMilestone[];
}

const metricOptions = [
  { value: 'activity', label: 'Family Activity' },
  { value: 'engagement', label: 'Member Engagement' },
  { value: 'goals', label: 'Goal Completion' },
  { value: 'milestones', label: 'Milestones by Type' },
] as const;

type MetricOption = typeof metricOptions[number]['value'];

type GoalLike = {
  currentProgress?: number;
  deadline?: string;
  createdAt?: string;
  participants?: string[];
};

type EventLike = {
  date?: string;
  eventDate?: string;
  personId?: string;
  person?: string;
  type?: string;
};

const formatDayLabel = (date: Date) => date.toLocaleDateString('en-US', { weekday: 'short' });

const toDateKey = (value: string | Date) => {
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().split('T')[0];
};

const isSameDay = (dateA: string, dateB: string) => dateA === dateB;

const getDateFromGoal = (goal: GoalLike) => {
  if (goal.createdAt) return new Date(goal.createdAt);
  if (goal.deadline) return new Date(goal.deadline);
  return null;
};

const getDateFromEvent = (event: EventLike) => {
  if (event.date) return new Date(event.date);
  if (event.eventDate) return new Date(event.eventDate);
  return null;
};

const milestoneTypeLabels: Record<MilestoneType, string> = {
  birthday: 'Birthday',
  anniversary: 'Anniversary',
  achievement: 'Achievement',
  life_event: 'Life Event',
  family_event: 'Family Event',
  other: 'Other',
};

export const FamilyAnalytics: React.FC<FamilyAnalyticsProps> = ({ familyMembers, milestones }) => {
  const events = useFamilyStore((state) => state.events) as EventLike[];
  const goalsData = useFamilyStore((state) => state.goalsData);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<MetricOption>('activity');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  const goals = useMemo<GoalLike[]>(() => {
    const familyGoals = Array.isArray(goalsData?.familyGoals) ? goalsData?.familyGoals : [];
    const individualGoals = Array.isArray(goalsData?.individualGoals) ? goalsData?.individualGoals : [];
    return [...familyGoals, ...individualGoals];
  }, [goalsData]);

  const completedGoalsCount = useMemo(() =>
    goals.filter((goal) => (goal.currentProgress || 0) >= 100).length,
  [goals]);

  const upcomingEventsCount = useMemo(() => {
    const now = new Date();
    const upcomingLimit = new Date();
    upcomingLimit.setDate(now.getDate() + 30);

    return events.filter((event) => {
      const eventDate = getDateFromEvent(event);
      if (!eventDate) return false;
      return eventDate >= now && eventDate <= upcomingLimit;
    }).length;
  }, [events]);

  const milestonesThisYear = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return milestones.filter((milestone) => new Date(milestone.date).getFullYear() === currentYear).length;
  }, [milestones]);

  const lastActivityDate = useMemo(() => {
    const dates: Date[] = [];
    milestones.forEach((milestone) => {
      const parsed = new Date(milestone.date);
      if (!Number.isNaN(parsed.getTime())) dates.push(parsed);
    });
    events.forEach((event) => {
      const parsed = getDateFromEvent(event);
      if (parsed && !Number.isNaN(parsed.getTime())) dates.push(parsed);
    });
    goals.forEach((goal) => {
      const parsed = getDateFromGoal(goal);
      if (parsed && !Number.isNaN(parsed.getTime())) dates.push(parsed);
    });

    if (dates.length === 0) return null;
    return dates.sort((a, b) => b.getTime() - a.getTime())[0];
  }, [events, goals, milestones]);

  const activitySeries = useMemo(() => {
    const today = new Date();

    const buildDailySeries = (daysCount: number, labelFormatter: (date: Date) => string) => {
      const days = Array.from({ length: daysCount }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() - (daysCount - 1 - index));
        return day;
      });

      return days.map((day) => {
        const dayKey = toDateKey(day) as string;
        const eventsCount = events.filter((event) => {
          const eventDate = getDateFromEvent(event);
          const eventKey = eventDate ? toDateKey(eventDate) : null;
          return eventKey && isSameDay(eventKey, dayKey);
        }).length;

        const milestoneCount = milestones.filter((milestone) => isSameDay(milestone.date, dayKey)).length;

        const goalsCount = goals.filter((goal) => {
          const goalDate = getDateFromGoal(goal);
          const goalKey = goalDate ? toDateKey(goalDate) : null;
          return goalKey && isSameDay(goalKey, dayKey);
        }).length;

        return {
          name: labelFormatter(day),
          events: eventsCount,
          milestones: milestoneCount,
          goals: goalsCount,
        };
      });
    };

    const buildMonthlySeries = (monthsCount: number) => {
      const months = Array.from({ length: monthsCount }, (_, index) => {
        const date = new Date(today.getFullYear(), today.getMonth() - (monthsCount - 1 - index), 1);
        return {
          key: date.toISOString().slice(0, 7),
          label: date.toLocaleDateString('en-US', { month: 'short' }),
        };
      });

      return months.map((month) => {
        const eventsCount = events.filter((event) => {
          const eventDate = getDateFromEvent(event);
          if (!eventDate) return false;
          return eventDate.toISOString().slice(0, 7) === month.key;
        }).length;

        const milestoneCount = milestones.filter((milestone) => milestone.date.slice(0, 7) === month.key).length;

        const goalsCount = goals.filter((goal) => {
          const goalDate = getDateFromGoal(goal);
          if (!goalDate) return false;
          return goalDate.toISOString().slice(0, 7) === month.key;
        }).length;

        return {
          name: month.label,
          events: eventsCount,
          milestones: milestoneCount,
          goals: goalsCount,
        };
      });
    };

    if (selectedTimeframe === 'month') {
      return buildDailySeries(30, (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    if (selectedTimeframe === 'quarter') {
      return buildMonthlySeries(3);
    }

    if (selectedTimeframe === 'year') {
      return buildMonthlySeries(12);
    }

    return buildDailySeries(7, formatDayLabel);
  }, [events, milestones, goals, selectedTimeframe]);

  const engagementData = useMemo(() => {
    const counts = new Map<string, number>();

    familyMembers.forEach((member) => counts.set(member.id, 0));

    events.forEach((event) => {
      const memberId = event.personId || event.person;
      if (memberId && counts.has(memberId)) {
        counts.set(memberId, (counts.get(memberId) || 0) + 1);
      }
    });

    milestones.forEach((milestone) => {
      milestone.participants.forEach((memberId) => {
        if (counts.has(memberId)) {
          counts.set(memberId, (counts.get(memberId) || 0) + 1);
        }
      });
    });

    goals.forEach((goal) => {
      (goal.participants || []).forEach((memberId) => {
        if (counts.has(memberId)) {
          counts.set(memberId, (counts.get(memberId) || 0) + 1);
        }
      });
    });

    const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0) || 1;

    return familyMembers.map((member) => ({
      name: member.name,
      value: Math.round(((counts.get(member.id) || 0) / total) * 100),
      raw: counts.get(member.id) || 0,
      color: member.color || '#3B82F6',
      avatarUrl: member.avatarUrl,
    }));
  }, [events, milestones, goals, familyMembers]);

  const milestoneTypeData = useMemo(() => {
    const counts = milestones.reduce<Record<MilestoneType, number>>((acc, milestone) => {
      const type = milestone.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {
      birthday: 0,
      anniversary: 0,
      achievement: 0,
      life_event: 0,
      family_event: 0,
      other: 0,
    });

    return (Object.keys(counts) as MilestoneType[]).map((type) => ({
      name: milestoneTypeLabels[type],
      count: counts[type],
    }));
  }, [milestones]);

  const goalCompletionData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: date.toISOString().slice(0, 7),
        label: date.toLocaleDateString('en-US', { month: 'short' }),
      };
    });

    return months.map((month) => {
      const inMonth = goals.filter((goal) => {
        const goalDate = getDateFromGoal(goal);
        if (!goalDate) return false;
        return goalDate.toISOString().slice(0, 7) === month.key;
      });
      const completed = inMonth.filter((goal) => (goal.currentProgress || 0) >= 100).length;
      return {
        name: month.label,
        completed,
        total: inMonth.length,
      };
    });
  }, [goals]);

  const eventTypeCounts = useMemo(() => {
    const counts = events.reduce<Record<string, number>>((acc, event) => {
      const key = event.type || 'Other';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([type, count]) => ({ type, count }));
  }, [events]);

  const recentMilestones = useMemo(() =>
    [...milestones]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 3),
  [milestones]);

  const StatCard: React.FC<{
    icon: React.ComponentType<any>;
    title: string;
    value: string | number;
    color: string;
  }> = ({ icon: IconComponent, title, value, color }) => (
    <div className="bg-white p-6 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 bg-${color}-100 rounded-lg`}>
          <IconComponent className={`w-6 h-6 text-${color}-600`} />
        </div>
      </div>
    </div>
  );

  const renderChart = () => {
    if (chartType === 'pie') {
      const pieData = selectedMetric === 'engagement'
        ? engagementData.map((entry) => ({ name: entry.name, value: entry.value, color: entry.color }))
        : selectedMetric === 'milestones'
          ? milestoneTypeData.filter((entry) => entry.count > 0).map((entry, index) => ({
              name: entry.name,
              value: entry.count,
              color: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4'][index % 6],
            }))
          : [];

      if (pieData.length === 0) {
        return <div className="text-sm text-gray-500">No data yet for this chart.</div>;
      }

      return (
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'line') {
      if (selectedMetric === 'goals') {
        return (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={goalCompletionData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} />
              <Line type="monotone" dataKey="total" stroke="#3B82F6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        );
      }

      return (
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={activitySeries}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="events" stroke="#3B82F6" strokeWidth={2} />
            <Line type="monotone" dataKey="milestones" stroke="#F59E0B" strokeWidth={2} />
            <Line type="monotone" dataKey="goals" stroke="#10B981" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (selectedMetric === 'milestones') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={milestoneTypeData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#8B5CF6" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    if (selectedMetric === 'goals') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={goalCompletionData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="completed" fill="#10B981" />
            <Bar dataKey="total" fill="#3B82F6" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={activitySeries}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="events" fill="#3B82F6" />
          <Bar dataKey="milestones" fill="#F59E0B" />
          <Bar dataKey="goals" fill="#10B981" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const activitySummary = useMemo(() => ({
    totalEvents: events.length,
    totalMilestones: milestones.length,
    goalsCompleted: completedGoalsCount,
    activeMembers: familyMembers.length,
  }), [events.length, milestones.length, completedGoalsCount, familyMembers.length]);

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
                Live insights based on events, milestones, and goals
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
              onChange={(e) => setSelectedMetric(e.target.value as MetricOption)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {metricOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
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
          <StatCard icon={Calendar} title="Events Logged" value={activitySummary.totalEvents} color="blue" />
          <StatCard icon={Star} title="Milestones" value={activitySummary.totalMilestones} color="yellow" />
          <StatCard icon={Target} title="Goals Completed" value={activitySummary.goalsCompleted} color="green" />
          <StatCard icon={Users} title="Active Members" value={activitySummary.activeMembers} color="purple" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {metricOptions.find((option) => option.value === selectedMetric)?.label}
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
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-gray-700">Upcoming Events (30d)</span>
                  </div>
                  <span className="font-semibold text-gray-900">{upcomingEventsCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm text-gray-700">Milestones This Year</span>
                  </div>
                  <span className="font-semibold text-gray-900">{milestonesThisYear}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-gray-700">Goals In Progress</span>
                  </div>
                  <span className="font-semibold text-gray-900">{Math.max(goals.length - completedGoalsCount, 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span className="text-sm text-gray-700">Last Activity</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {lastActivityDate ? lastActivityDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Event Types</h3>
              {eventTypeCounts.length === 0 ? (
                <p className="text-sm text-gray-500">No events logged yet.</p>
              ) : (
                <div className="space-y-3">
                  {eventTypeCounts.map((activity, index) => (
                    <div key={activity.type} className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6'][index % 4] }}
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">{activity.type}</span>
                          <span className="text-sm text-gray-600">{activity.count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${Math.min((activity.count / (events.length || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Member Participation</h3>
            <div className="space-y-4">
              {familyMembers.length === 0 ? (
                <p className="text-sm text-gray-500">Add family members to track engagement.</p>
              ) : (
                engagementData.map((member, index) => (
                  <div key={member.name} className="flex items-center gap-3">
                  {member.avatarUrl ? (
                      <img
                        src={member.avatarUrl}
                        alt={member.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: member.color || '#3B82F6' }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-900">{member.name}</span>
                        <span className="text-sm text-gray-600">{member.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${member.value}%`,
                            backgroundColor: member.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Milestones</h3>
            {recentMilestones.length === 0 ? (
              <p className="text-sm text-gray-500">No milestones logged yet.</p>
            ) : (
              <div className="space-y-3">
                {recentMilestones.map((milestone) => (
                  <div key={milestone.id} className="flex items-center gap-3 p-3 bg-white rounded-lg">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <Trophy className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{milestone.title}</p>
                      <p className="text-sm text-gray-600">
                        {milestone.date ? new Date(milestone.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
