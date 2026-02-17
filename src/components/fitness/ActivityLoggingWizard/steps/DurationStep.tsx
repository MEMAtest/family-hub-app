'use client';

import React, { useState } from 'react';
import { Clock, ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import { useWizard } from '../WizardContext';
import type { IntensityLevel } from '@/types/fitness.types';

const quickDurations = [15, 30, 45, 60, 90, 120];

const intensityOptions: { value: IntensityLevel; label: string; description: string; color: string }[] = [
  { value: 'low', label: 'Low', description: 'Light effort, easy breathing', color: '#10B981' },
  { value: 'moderate', label: 'Moderate', description: 'Some effort, can talk', color: '#F59E0B' },
  { value: 'high', label: 'High', description: 'Hard effort, short of breath', color: '#EF4444' },
];

const DurationStep: React.FC = () => {
  const { state, dispatch, nextStep, prevStep } = useWizard();
  const [customDuration, setCustomDuration] = useState(state.duration.toString());

  const handleDurationChange = (duration: number) => {
    dispatch({ type: 'SET_DURATION', duration });
    setCustomDuration(duration.toString());
  };

  const handleCustomDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomDuration(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 480) {
      dispatch({ type: 'SET_DURATION', duration: numValue });
    }
  };

  const handleIntensityChange = (intensity: IntensityLevel) => {
    dispatch({ type: 'SET_INTENSITY', intensity });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-light text-gray-900 dark:text-slate-100 mb-2">
          How long was your workout?
        </h2>
        <p className="text-gray-600 dark:text-slate-400">
          Select or enter the duration
        </p>
      </div>

      {/* Duration display */}
      <div className="flex justify-center">
        <div className="bg-gray-100 dark:bg-slate-800 rounded-2xl px-6 sm:px-8 py-6 text-center w-full max-w-sm">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Clock className="w-6 h-6 text-blue-500" />
            <span className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-slate-100">
              {formatDuration(state.duration)}
            </span>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">
            {state.duration} minutes total
          </p>
        </div>
      </div>

      {/* Quick duration buttons */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Quick select
        </label>
        <div className="flex flex-wrap gap-2">
          {quickDurations.map((duration) => (
            <button
              key={duration}
              onClick={() => handleDurationChange(duration)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                state.duration === duration
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
              }`}
            >
              {formatDuration(duration)}
            </button>
          ))}
        </div>
      </div>

      {/* Custom duration input */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-gray-700 dark:text-slate-300">
          Or enter custom duration (minutes)
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleDurationChange(Math.max(5, state.duration - 5))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <input
            type="number"
            value={customDuration}
            onChange={handleCustomDurationChange}
            min="1"
            max="480"
            className="w-24 px-4 py-2 text-center text-lg font-medium border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:text-slate-100"
          />
          <button
            onClick={() => handleDurationChange(Math.min(480, state.duration + 5))}
            className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Intensity selector */}
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-300">
          <Zap className="w-4 h-4" />
          Intensity level
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {intensityOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleIntensityChange(option.value)}
              className={`p-4 rounded-xl border-2 transition-all ${
                state.intensityLevel === option.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
              }`}
            >
              <div
                className="w-3 h-3 rounded-full mx-auto mb-2"
                style={{ backgroundColor: option.color }}
              />
              <p className="font-medium text-gray-900 dark:text-slate-100 text-sm">
                {option.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                {option.description}
              </p>
            </button>
          ))}
        </div>
      </div>

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

export default DurationStep;
