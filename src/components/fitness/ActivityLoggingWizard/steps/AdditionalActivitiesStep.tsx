'use client';

import React, { useState } from 'react';
import { Heart, StretchHorizontal, Flame, Snowflake, Target, Plus, X } from 'lucide-react';
import { useWizard } from '../WizardContext';
import type { AdditionalActivity } from '@/types/fitness.types';

interface ActivityOption {
  type: AdditionalActivity['type'];
  label: string;
  icon: React.ComponentType<any>;
  color: string;
  defaultDuration: number;
}

const activityOptions: ActivityOption[] = [
  { type: 'warmup', label: 'Warm-up', icon: Flame, color: '#F59E0B', defaultDuration: 10 },
  { type: 'cardio', label: 'Cardio', icon: Heart, color: '#EF4444', defaultDuration: 15 },
  { type: 'stretching', label: 'Stretching', icon: StretchHorizontal, color: '#8B5CF6', defaultDuration: 10 },
  { type: 'cooldown', label: 'Cool-down', icon: Snowflake, color: '#06B6D4', defaultDuration: 5 },
  { type: 'core', label: 'Core Work', icon: Target, color: '#10B981', defaultDuration: 10 },
];

const AdditionalActivitiesStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const [customDurations, setCustomDurations] = useState<Record<string, number>>({});

  const handleToggleActivity = (option: ActivityOption) => {
    const existingIndex = state.additionalActivities.findIndex(
      (a) => a.type === option.type
    );

    if (existingIndex >= 0) {
      dispatch({ type: 'REMOVE_ADDITIONAL_ACTIVITY', index: existingIndex });
    } else {
      const duration = customDurations[option.type] || option.defaultDuration;
      dispatch({
        type: 'ADD_ADDITIONAL_ACTIVITY',
        activity: { type: option.type, durationMinutes: duration },
      });
    }
  };

  const handleDurationChange = (type: AdditionalActivity['type'], duration: number) => {
    setCustomDurations((prev) => ({ ...prev, [type]: duration }));

    // Update existing activity if selected
    const existingIndex = state.additionalActivities.findIndex((a) => a.type === type);
    if (existingIndex >= 0) {
      dispatch({ type: 'REMOVE_ADDITIONAL_ACTIVITY', index: existingIndex });
      dispatch({
        type: 'ADD_ADDITIONAL_ACTIVITY',
        activity: { type, durationMinutes: duration },
      });
    }
  };

  const isSelected = (type: AdditionalActivity['type']) =>
    state.additionalActivities.some((a) => a.type === type);

  const getSelectedDuration = (type: AdditionalActivity['type'], defaultDuration: number) => {
    const activity = state.additionalActivities.find((a) => a.type === type);
    return activity?.durationMinutes || customDurations[type] || defaultDuration;
  };

  const totalAdditionalMinutes = state.additionalActivities.reduce(
    (sum, a) => sum + a.durationMinutes,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          Any other activities?
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Add warm-up, cardio, stretching, or cool-down
        </p>
      </div>

      {/* Activity options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {activityOptions.map((option) => {
          const selected = isSelected(option.type);
          const duration = getSelectedDuration(option.type, option.defaultDuration);

          return (
            <div
              key={option.type}
              className={`border-2 rounded-xl p-4 transition-all ${
                selected
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-700'
              }`}
            >
              <button
                onClick={() => handleToggleActivity(option)}
                className="w-full flex items-center gap-3"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    selected ? 'bg-blue-100 dark:bg-blue-800/50' : 'bg-gray-100 dark:bg-slate-800'
                  }`}
                  style={{ backgroundColor: selected ? `${option.color}20` : undefined }}
                >
                  <option.icon
                    className="w-5 h-5"
                    style={{ color: selected ? option.color : '#6B7280' }}
                  />
                </div>
                <div className="flex-1 text-left">
                  <p
                    className={`font-medium ${
                      selected
                        ? 'text-blue-900 dark:text-blue-100'
                        : 'text-gray-900 dark:text-slate-100'
                    }`}
                  >
                    {option.label}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {duration} minutes
                  </p>
                </div>
                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    selected
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300 dark:border-slate-600'
                  }`}
                >
                  {selected && <Plus className="w-4 h-4 text-white rotate-45" />}
                </div>
              </button>

              {/* Duration adjuster */}
              {selected && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <label className="text-sm text-gray-600 dark:text-slate-400 block mb-2">
                    Duration (minutes)
                  </label>
                  <div className="flex items-center gap-2">
                    {[5, 10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDurationChange(option.type, mins);
                        }}
                        className={`px-3 py-1 rounded-md text-sm transition-colors ${
                          duration === mins
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        {mins}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      {state.additionalActivities.length > 0 && (
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
            Summary
          </h4>
          <div className="flex flex-wrap gap-2">
            {state.additionalActivities.map((activity, idx) => {
              const option = activityOptions.find((o) => o.type === activity.type);
              return (
                <span
                  key={activity.type}
                  className="px-3 py-1 bg-blue-100 dark:bg-blue-800/50 text-blue-800 dark:text-blue-200 rounded-full text-sm flex items-center gap-1"
                >
                  {option?.label}: {activity.durationMinutes} min
                  <button
                    onClick={() => dispatch({ type: 'REMOVE_ADDITIONAL_ACTIVITY', index: idx })}
                    className="ml-1 hover:text-blue-600 dark:hover:text-blue-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-2">
            Total additional: {totalAdditionalMinutes} minutes
          </p>
        </div>
      )}

      {/* Skip option */}
      <p className="text-center text-sm text-gray-500 dark:text-slate-400">
        No additional activities? Just click Continue to skip this step.
      </p>

      {/* Navigation */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between pt-4">
        <button
          onClick={prevStep}
          className="w-full sm:w-auto px-6 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800"
        >
          Back
        </button>
        <button
          onClick={nextStep}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

export default AdditionalActivitiesStep;
