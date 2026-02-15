'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dumbbell,
  Plus,
  Calendar,
  Flame,
  Clock,
  TrendingUp,
  Target,
  Activity,
  ChevronRight,
  Zap,
  Trophy,
  RefreshCw,
  Settings,
  Watch,
  Pencil,
  Trash2,
} from 'lucide-react';
import { ActivityLoggingWizard } from './ActivityLoggingWizard';
import DeviceConnections from './DeviceConnections';
import type { FitnessActivity, FitnessStats } from '@/types/fitness.types';
import { categoryDisplayNames } from '@/data/exerciseLibrary';

interface FitnessDashboardProps {
  familyId: string;
  personId: string;
  personName: string;
  personColor?: string;
  onViewAll?: () => void;
}

const activityTypeIcons: Record<string, React.ComponentType<any>> = {
  gym: Dumbbell,
  run: Activity,
  swim: Activity,
  cycle: Activity,
  walk: Activity,
  sports: Activity,
  yoga: Activity,
  cardio: Activity,
  other: Activity,
};

const FitnessDashboard: React.FC<FitnessDashboardProps> = ({
  familyId,
  personId,
  personName,
  personColor = '#3B82F6',
  onViewAll,
}) => {
  const [showWizard, setShowWizard] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FitnessActivity | null>(null);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [activities, setActivities] = useState<FitnessActivity[]>([]);
  const [stats, setStats] = useState<FitnessStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [activitiesRes, statsRes] = await Promise.all([
        fetch(`/api/families/${familyId}/fitness?personId=${personId}&limit=10`),
        fetch(`/api/families/${familyId}/fitness/stats?personId=${personId}`),
      ]);

      if (!activitiesRes.ok || !statsRes.ok) {
        throw new Error('Failed to fetch fitness data');
      }

      const activitiesData = await activitiesRes.json();
      const statsData = await statsRes.json();

      setActivities(activitiesData.activities || []);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching fitness data:', err);
      setError('Failed to load fitness data');
    } finally {
      setLoading(false);
    }
  }, [familyId, personId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActivityComplete = (activity: FitnessActivity) => {
    setActivities((prev) => {
      if (editingActivity) {
        return prev.map((item) => (item.id === activity.id ? activity : item));
      }
      return [activity, ...prev];
    });
    fetchData(); // Refresh stats
    setShowWizard(false);
    setEditingActivity(null);
  };

  const handleDeleteActivity = useCallback(async (activityId: string) => {
    if (!confirm('Delete this activity?')) return;

    try {
      const response = await fetch(`/api/families/${familyId}/fitness/${activityId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete activity');
      }

      setActivities((prev) => prev.filter((a) => a.id !== activityId));
      await fetchData();
    } catch (err) {
      console.error('Failed to delete activity:', err);
      setError('Failed to delete activity');
    }
  }, [familyId, fetchData]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    }).format(date);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100">
            Fitness Tracking
          </h2>
          <p className="text-gray-600 dark:text-slate-400">
            {personName}'s workout activity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            className={`p-2 rounded-lg transition-colors ${
              showDeviceSettings
                ? 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20'
                : 'text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
            title="Connect devices"
          >
            <Watch className="w-5 h-5" />
          </button>
          <button
            onClick={fetchData}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setEditingActivity(null);
              setShowWizard(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Log Activity
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Device Connections Panel */}
      {showDeviceSettings && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <DeviceConnections familyId={familyId} personId={personId} />
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Workouts this week */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Dumbbell className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">This Week</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats?.totalWorkouts || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">workouts</p>
        </div>

        {/* Time this week */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">Total Time</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {formatDuration(stats?.totalMinutes || 0)}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">this week</p>
        </div>

        {/* Streak */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Flame className="w-4 h-4 text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">Streak</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats?.streakDays || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">days</p>
        </div>

        {/* Calories */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Zap className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <span className="text-sm text-gray-500 dark:text-slate-400">Calories</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
            {stats?.totalCalories || 0}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400">burned</p>
        </div>
      </div>

      {/* Activity breakdown */}
      {stats?.activitiesByType && Object.keys(stats.activitiesByType).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-slate-100 mb-4">
            Activity Breakdown
          </h3>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.activitiesByType).map(([type, count]) => {
              const Icon = activityTypeIcons[type] || Activity;
              return (
                <div
                  key={type}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-slate-700 rounded-lg"
                >
                  <Icon className="w-4 h-4 text-gray-600 dark:text-slate-300" />
                  <span className="text-sm font-medium text-gray-900 dark:text-slate-100 capitalize">
                    {type}
                  </span>
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200 text-xs rounded-full">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Goal progress */}
      {stats?.progressToGoal && stats.progressToGoal.workouts.target > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="font-medium text-gray-900 dark:text-slate-100">
                Weekly Goal Progress
              </span>
            </div>
            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">
              {stats.progressToGoal.workouts.current}/{stats.progressToGoal.workouts.target} workouts
            </span>
          </div>
          <div className="w-full h-2 bg-purple-200 dark:bg-purple-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, (stats.progressToGoal.workouts.current / stats.progressToGoal.workouts.target) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Recent activities */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700">
          <h3 className="font-medium text-gray-900 dark:text-slate-100">
            Recent Activities
          </h3>
          {activities.length > 5 && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 bg-gray-100 dark:bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-500 dark:text-slate-400 mb-4">
              No activities logged yet
            </p>
            <button
              onClick={() => {
                setEditingActivity(null);
                setShowWizard(true);
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Log your first workout
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {activities.slice(0, 5).map((activity) => {
              const Icon = activityTypeIcons[activity.activityType] || Activity;
              const exerciseCount = activity.exercises?.length || 0;

              return (
                <div
                  key={activity.id}
                  className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: `${personColor}20` }}
                    >
                      <Icon
                        className="w-5 h-5"
                        style={{ color: personColor }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900 dark:text-slate-100 truncate">
                          {activity.workoutName ||
                            `${activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1)} Workout`}
                        </p>
                        <span className="text-sm text-gray-500 dark:text-slate-400 ml-2 flex-shrink-0">
                          {formatDate(activity.activityDate)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDuration(activity.durationMinutes)}
                        </span>
                        {activity.intensityLevel && (
                          <span className={`capitalize px-2 py-0.5 rounded-full text-xs ${
                            activity.intensityLevel === 'high'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                              : activity.intensityLevel === 'moderate'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                          }`}>
                            {activity.intensityLevel}
                          </span>
                        )}
                        {exerciseCount > 0 && (
                          <span>{exerciseCount} exercises</span>
                        )}
                        {activity.calories && (
                          <span className="flex items-center gap-1">
                            <Flame className="w-3 h-3" />
                            {activity.calories} cal
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          setEditingActivity(activity);
                          setShowWizard(true);
                        }}
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => void handleDeleteActivity(activity.id)}
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Logging Wizard Modal */}
      <ActivityLoggingWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingActivity(null);
        }}
        onComplete={handleActivityComplete}
        personId={personId}
        familyId={familyId}
        lastWorkout={activities[0]}
        editingActivity={editingActivity}
      />
    </div>
  );
};

export default FitnessDashboard;
