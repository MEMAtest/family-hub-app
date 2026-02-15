'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import type { FitnessActivity, ActivityType, IntensityLevel } from '@/types/fitness.types';
import { ActivityLoggingWizard } from '@/components/fitness';

interface ActivityHistoryProps {
  familyId: string;
  personId: string;
}

const PAGE_SIZE = 20;

export const ActivityHistory: React.FC<ActivityHistoryProps> = ({ familyId, personId }) => {
  const [activities, setActivities] = useState<FitnessActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Filters
  const [activityType, setActivityType] = useState<ActivityType | 'all'>('all');
  const [intensity, setIntensity] = useState<IntensityLevel | 'all'>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [showWizard, setShowWizard] = useState(false);
  const [editingActivity, setEditingActivity] = useState<FitnessActivity | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    params.set('personId', personId);
    params.set('limit', String(PAGE_SIZE));
    params.set('offset', String(offset));
    if (activityType !== 'all') params.set('activityType', activityType);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    // Intensity filtering is client-side for now (API doesn’t support it yet).
    return params.toString();
  }, [activityType, endDate, offset, personId, startDate]);

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/families/${familyId}/fitness?${queryString}`);
      if (!response.ok) {
        throw new Error('Failed to fetch activities');
      }

      const payload = await response.json();
      const items = Array.isArray(payload?.activities) ? payload.activities : [];
      const pagination = payload?.pagination;
      const more = Boolean(pagination?.hasMore);

      const normalized = items as FitnessActivity[];
      const intensityFiltered = intensity === 'all'
        ? normalized
        : normalized.filter((a) => a.intensityLevel === intensity);

      setActivities(intensityFiltered);
      setHasMore(more);
    } catch (err) {
      console.error('ActivityHistory fetch error:', err);
      setError('Failed to load activity history');
    } finally {
      setLoading(false);
    }
  }, [familyId, intensity, queryString]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  // Reset pagination on filter changes
  useEffect(() => {
    setOffset(0);
  }, [activityType, intensity, startDate, endDate, personId]);

  const handleDelete = useCallback(async (activityId: string) => {
    if (!confirm('Delete this activity?')) return;
    try {
      const response = await fetch(`/api/families/${familyId}/fitness/${activityId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchPage();
    } catch (err) {
      console.error('Delete activity failed:', err);
      setError('Failed to delete activity');
    }
  }, [familyId, fetchPage]);

  const handleComplete = useCallback(async () => {
    setShowWizard(false);
    setEditingActivity(null);
    await fetchPage();
  }, [fetchPage]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-slate-100">History</h3>
          <p className="text-sm text-gray-600 dark:text-slate-400">Browse, edit, and delete past workouts.</p>
        </div>
        <button
          onClick={fetchPage}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-slate-100">
          <Filter className="h-4 w-4" />
          Filters
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            value={activityType}
            onChange={(e) => setActivityType(e.target.value as any)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All types</option>
            <option value="gym">Gym</option>
            <option value="run">Run</option>
            <option value="walk">Walk</option>
            <option value="cycle">Cycle</option>
            <option value="swim">Swim</option>
            <option value="yoga">Yoga</option>
            <option value="sports">Sports</option>
            <option value="cardio">Cardio</option>
            <option value="stretching">Stretching</option>
            <option value="other">Other</option>
          </select>

          <select
            value={intensity}
            onChange={(e) => setIntensity(e.target.value as any)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="all">All intensity</option>
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/30 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            Loading…
          </div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500 dark:text-slate-400">
            No activities found.
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100 truncate">
                    {activity.workoutName || activity.activityType}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                    {new Date(activity.activityDate).toLocaleString()} · {activity.durationMinutes}m · {activity.intensityLevel}
                  </p>
                  {(activity.imageUrls?.length || 0) > 0 && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {activity.imageUrls!.length} image(s)
                    </p>
                  )}
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
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void handleDelete(activity.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-300"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm dark:border-slate-700">
          <button
            onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
            disabled={offset === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </button>
          <span className="text-gray-500 dark:text-slate-400">
            Page {Math.floor(offset / PAGE_SIZE) + 1}
          </span>
          <button
            onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
            disabled={!hasMore}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <ActivityLoggingWizard
        isOpen={showWizard}
        onClose={() => {
          setShowWizard(false);
          setEditingActivity(null);
        }}
        onComplete={() => void handleComplete()}
        personId={personId}
        familyId={familyId}
        lastWorkout={activities[0]}
        editingActivity={editingActivity}
      />
    </div>
  );
};

export default ActivityHistory;

