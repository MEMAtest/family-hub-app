'use client';

import React from 'react';
import { X, Dumbbell, Activity } from 'lucide-react';
import { WizardProvider, useWizard } from './WizardContext';
import ActivityTypeStep from './steps/ActivityTypeStep';
import DurationStep from './steps/DurationStep';
import GymRoutinesStep from './steps/GymRoutinesStep';
import ExerciseDetailsStep from './steps/ExerciseDetailsStep';
import AdditionalActivitiesStep from './steps/AdditionalActivitiesStep';
import NotesStep from './steps/NotesStep';
import SummaryStep from './steps/SummaryStep';
import type { FitnessActivity, WizardStep } from '@/types/fitness.types';

interface ActivityLoggingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (activity: FitnessActivity) => void;
  personId: string;
  familyId: string;
  lastWorkout?: FitnessActivity;
}

// Progress indicator
const WizardProgress: React.FC = () => {
  const { state } = useWizard();

  const steps: { key: WizardStep; label: string }[] = [
    { key: 'activity_type', label: 'Activity' },
    { key: 'duration', label: 'Duration' },
    ...(state.activityType === 'gym'
      ? [
          { key: 'gym_routines' as WizardStep, label: 'Exercises' },
          { key: 'exercise_details' as WizardStep, label: 'Details' },
        ]
      : []),
    { key: 'additional_activities', label: 'Extras' },
    { key: 'notes', label: 'Notes' },
    { key: 'summary', label: 'Review' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === state.step);

  return (
    <div className="px-6 py-3 border-b border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index <= currentIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-slate-700 text-gray-500 dark:text-slate-400'
                }`}
              >
                {index + 1}
              </div>
              <span
                className={`ml-2 text-sm hidden sm:block ${
                  index <= currentIndex
                    ? 'text-gray-900 dark:text-slate-100'
                    : 'text-gray-500 dark:text-slate-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-2 ${
                  index < currentIndex
                    ? 'bg-blue-600'
                    : 'bg-gray-200 dark:bg-slate-700'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Wizard content renderer
const WizardContent: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { state, isLoading } = useWizard();

  const renderStep = () => {
    switch (state.step) {
      case 'activity_type':
        return <ActivityTypeStep />;
      case 'duration':
        return <DurationStep />;
      case 'gym_routines':
        return <GymRoutinesStep />;
      case 'exercise_details':
        return <ExerciseDetailsStep />;
      case 'additional_activities':
        return <AdditionalActivitiesStep />;
      case 'notes':
        return <NotesStep />;
      case 'summary':
        return <SummaryStep onClose={onClose} />;
      default:
        return <ActivityTypeStep />;
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[90vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
            {state.activityType === 'gym' ? (
              <Dumbbell className="w-5 h-5 text-red-600 dark:text-red-400" />
            ) : (
              <Activity className="w-5 h-5 text-red-600 dark:text-red-400" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">
              Log Activity
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {state.activityType
                ? `${state.activityType.charAt(0).toUpperCase() + state.activityType.slice(1)} workout`
                : 'Select an activity type'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-slate-400" />
        </button>
      </div>

      {/* Progress */}
      {state.step !== 'activity_type' && <WizardProgress />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : (
          renderStep()
        )}
      </div>
    </div>
  );
};

// Main wizard component
export const ActivityLoggingWizard: React.FC<ActivityLoggingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
  personId,
  familyId,
  lastWorkout,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <WizardProvider
          personId={personId}
          familyId={familyId}
          onComplete={onComplete}
          lastWorkout={lastWorkout}
        >
          <WizardContent onClose={onClose} />
        </WizardProvider>
      </div>
    </div>
  );
};

export default ActivityLoggingWizard;
