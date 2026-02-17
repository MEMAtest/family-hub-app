'use client';

import React, { useState } from 'react';
import {
  Check,
  Edit2,
  Calendar,
  Clock,
  Zap,
  Dumbbell,
  Activity,
  Flame,
  MessageSquare,
  Image as ImageIcon,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useWizard } from '../WizardContext';
import { categoryDisplayNames } from '@/data/exerciseLibrary';

interface SummaryStepProps {
  onClose: () => void;
}

const SummaryStep: React.FC<SummaryStepProps> = ({ onClose }) => {
  const { state, saveActivity, goToStep, isLoading } = useWizard();
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    try {
      setError(null);
      const saved = await saveActivity();
      if (!saved) {
        throw new Error('Failed to save workout. Please try again.');
      }
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message
          : 'Failed to save workout. Please try again.';
      setError(message);
      console.error('Save error:', err);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(date);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} minutes`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const totalVolume = state.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => {
      return setTotal + (set.reps || 0) * (set.weight || 0);
    }, 0);
  }, 0);

  const totalSets = state.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const totalReps = state.exercises.reduce((total, exercise) => {
    return total + exercise.sets.reduce((setTotal, set) => setTotal + (set.reps || 0), 0);
  }, 0);

  const additionalMinutes = state.additionalActivities.reduce(
    (sum, a) => sum + a.durationMinutes,
    0
  );

  const totalWorkoutMinutes = state.duration + additionalMinutes;

  // Calculate estimated calories (rough estimate)
  const estimatedCalories = Math.round(
    totalWorkoutMinutes * (state.intensityLevel === 'high' ? 10 : state.intensityLevel === 'moderate' ? 7 : 5)
  );

  if (saveSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4 animate-bounce">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-slate-100 mb-2">
          Workout Saved!
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Great job completing your workout today!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          Review your workout
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Check everything looks right before saving
        </p>
      </div>

      {/* Main summary card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-blue-100 dark:border-blue-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 dark:bg-blue-800/50 rounded-xl">
              {state.activityType === 'gym' ? (
                <Dumbbell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              ) : (
                <Activity className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-slate-100">
                {state.workoutName || `${(state.activityType || 'Activity').charAt(0).toUpperCase() + (state.activityType || 'activity').slice(1)} Workout`}
              </h3>
              <p className="text-sm text-gray-500 dark:text-slate-400">
                {formatDate(state.activityDate)}
              </p>
            </div>
          </div>
          <button
            onClick={() => goToStep('activity_type')}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 rounded-lg hover:bg-white/50 dark:hover:bg-slate-800/50"
            title="Edit"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              {formatDuration(totalWorkoutMinutes)}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Duration</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Flame className="w-4 h-4 text-orange-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100">
              ~{estimatedCalories}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Est. calories</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-4 h-4 text-yellow-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-slate-100 capitalize">
              {state.intensityLevel}
            </p>
            <p className="text-xs text-gray-500 dark:text-slate-400">Intensity</p>
          </div>
        </div>
      </div>

      {/* Exercises breakdown */}
      {state.activityType === 'gym' && state.exercises.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-slate-800">
            <h4 className="font-medium text-gray-900 dark:text-slate-100">
              Exercises ({state.exercises.length})
            </h4>
            <button
              onClick={() => goToStep('gym_routines')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-700">
            {state.exercises.map((exercise) => {
              const exerciseVolume = exercise.sets.reduce(
                (sum, set) => sum + (set.reps || 0) * (set.weight || 0),
                0
              );
              return (
                <div key={exercise.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-slate-100">
                        {exercise.exerciseName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">
                        {categoryDisplayNames[exercise.category] || exercise.category}
                      </p>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-slate-300">
                      {exercise.sets.length} sets
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {exercise.sets.map((set, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 dark:bg-slate-700 rounded text-xs text-gray-600 dark:text-slate-300"
                      >
                        {set.reps}×{set.weight}kg
                      </span>
                    ))}
                  </div>
                  {exerciseVolume > 0 && (
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                      Volume: {exerciseVolume.toFixed(0)} kg
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Workout totals */}
          <div className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-slate-400">Total:</span>
              <span className="font-medium text-gray-900 dark:text-slate-100">
                {totalSets} sets • {totalReps} reps • {totalVolume.toFixed(0)} kg volume
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Additional activities */}
      {state.additionalActivities.length > 0 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-slate-100">
              Additional Activities
            </h4>
            <button
              onClick={() => goToStep('additional_activities')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.additionalActivities.map((activity) => (
              <span
                key={activity.type}
                className="px-3 py-1.5 bg-purple-100 dark:bg-purple-800/30 text-purple-700 dark:text-purple-300 rounded-full text-sm"
              >
                {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}: {activity.durationMinutes} min
              </span>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
            +{additionalMinutes} minutes total
          </p>
        </div>
      )}

      {/* Notes */}
      {state.notes && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Notes
            </h4>
            <button
              onClick={() => goToStep('notes')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          </div>
          <p className="text-gray-600 dark:text-slate-300 text-sm whitespace-pre-wrap">
            {state.notes}
          </p>
        </div>
      )}

      {/* Images */}
      {(state.imageUrls?.length || 0) > 0 && (
        <div className="bg-white dark:bg-slate-800/50 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900 dark:text-slate-100 flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Images
            </h4>
            <button
              onClick={() => goToStep('image_upload')}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {state.imageUrls.slice(0, 6).map((url) => (
              <div key={url} className="overflow-hidden rounded-lg border border-gray-200 dark:border-slate-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="Workout upload" className="h-20 w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-4">
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-5 h-5" />
              Save Workout
            </>
          )}
        </button>

        <button
          onClick={() => goToStep('activity_type')}
          disabled={isLoading}
          className="w-full py-2 text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-200 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Start Over
        </button>
      </div>
    </div>
  );
};

export default SummaryStep;
