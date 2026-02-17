'use client';

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import type {
  ActivityWizardState,
  WizardStep,
  ActivityType,
  IntensityLevel,
  ExerciseSet,
  AdditionalActivity,
  FitnessActivity,
} from '@/types/fitness.types';

// Action types
type WizardAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'SET_ACTIVITY_TYPE'; activityType: ActivityType }
  | { type: 'SET_DURATION'; duration: number }
  | { type: 'SET_INTENSITY'; intensity: IntensityLevel }
  | { type: 'SET_WORKOUT_NAME'; name: string }
  | { type: 'ADD_EXERCISE'; exercise: ExerciseSet }
  | { type: 'UPDATE_EXERCISE'; index: number; exercise: ExerciseSet }
  | { type: 'REMOVE_EXERCISE'; index: number }
  | { type: 'ADD_ADDITIONAL_ACTIVITY'; activity: AdditionalActivity }
  | { type: 'REMOVE_ADDITIONAL_ACTIVITY'; index: number }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'SET_IMAGE_URLS'; urls: string[] }
  | { type: 'SET_DATE'; date: Date }
  | { type: 'RESET' }
  | { type: 'LOAD_LAST_WORKOUT'; workout: FitnessActivity };

// Initial state
const initialState: ActivityWizardState = {
  step: 'activity_type',
  activityId: null,
  activityType: null,
  duration: 45,
  intensityLevel: 'moderate',
  workoutName: '',
  exercises: [],
  additionalActivities: [],
  notes: '',
  imageUrls: [],
  activityDate: new Date(),
  personId: '',
};

// Step order for navigation
const stepOrder: WizardStep[] = [
  'activity_type',
  'duration',
  'gym_routines',
  'exercise_details',
  'additional_activities',
  'notes',
  'image_upload',
  'summary',
];

// Reducer
function wizardReducer(state: ActivityWizardState, action: WizardAction): ActivityWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step };

    case 'SET_ACTIVITY_TYPE':
      return {
        ...state,
        activityType: action.activityType,
        // Auto-advance to duration step
        step: 'duration',
      };

    case 'SET_DURATION':
      return { ...state, duration: action.duration };

    case 'SET_INTENSITY':
      return { ...state, intensityLevel: action.intensity };

    case 'SET_WORKOUT_NAME':
      return { ...state, workoutName: action.name };

    case 'ADD_EXERCISE':
      return {
        ...state,
        exercises: [...state.exercises, action.exercise],
      };

    case 'UPDATE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.map((ex, idx) =>
          idx === action.index ? action.exercise : ex
        ),
      };

    case 'REMOVE_EXERCISE':
      return {
        ...state,
        exercises: state.exercises.filter((_, idx) => idx !== action.index),
      };

    case 'ADD_ADDITIONAL_ACTIVITY':
      return {
        ...state,
        additionalActivities: [...state.additionalActivities, action.activity],
      };

    case 'REMOVE_ADDITIONAL_ACTIVITY':
      return {
        ...state,
        additionalActivities: state.additionalActivities.filter(
          (_, idx) => idx !== action.index
        ),
      };

    case 'SET_NOTES':
      return { ...state, notes: action.notes };

    case 'SET_IMAGE_URLS':
      return { ...state, imageUrls: action.urls };

    case 'SET_DATE':
      return { ...state, activityDate: action.date };

    case 'RESET':
      return { ...initialState, personId: state.personId };

    case 'LOAD_LAST_WORKOUT':
      const workout = action.workout;
      return {
        ...state,
        activityId: null,
        activityType: workout.activityType,
        duration: workout.durationMinutes,
        intensityLevel: workout.intensityLevel,
        workoutName: workout.workoutName || '',
        exercises: workout.exercises || [],
        notes: '',
        imageUrls: [],
        step: 'summary',
      };

    default:
      return state;
  }
}

// Context value type
interface WizardContextValue {
  state: ActivityWizardState;
  dispatch: React.Dispatch<WizardAction>;
  familyId: string;
  goToStep: (step: WizardStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
  saveActivity: () => Promise<FitnessActivity | null>;
  isLoading: boolean;
}

// Create context
const WizardContext = createContext<WizardContextValue | undefined>(undefined);

// Hook to use wizard context
export const useWizard = () => {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error('useWizard must be used within WizardProvider');
  }
  return context;
};

// Provider props
interface WizardProviderProps {
  children: React.ReactNode;
  personId: string;
  familyId: string;
  onComplete: (activity: FitnessActivity) => void;
  lastWorkout?: FitnessActivity;
  editingActivity?: FitnessActivity;
}

// Provider component
export const WizardProvider: React.FC<WizardProviderProps> = ({
  children,
  personId,
  familyId,
  onComplete,
  lastWorkout,
  editingActivity,
}) => {
  // Ensure the initial state is contextually typed as ActivityWizardState, otherwise
  // literal steps like 'summary' get widened to `string` and React picks the wrong
  // useReducer overload (DispatchWithoutAction).
  const initialWizardState: ActivityWizardState = (() => {
    if (!editingActivity) return { ...initialState, personId };

    const activityDate = new Date(editingActivity.activityDate);
    const safeDate = Number.isNaN(activityDate.getTime()) ? new Date() : activityDate;

    return {
      ...initialState,
      step: 'summary',
      activityId: editingActivity.id,
      personId,
      activityType: editingActivity.activityType,
      duration: editingActivity.durationMinutes,
      intensityLevel: editingActivity.intensityLevel,
      workoutName: editingActivity.workoutName || '',
      exercises: editingActivity.exercises || [],
      notes: editingActivity.notes || '',
      imageUrls: editingActivity.imageUrls || [],
      activityDate: safeDate,
    };
  })();

  const [state, dispatch] = useReducer(wizardReducer, initialWizardState);
  const [isLoading, setIsLoading] = React.useState(false);

  // Navigate to specific step
  const goToStep = useCallback((step: WizardStep) => {
    dispatch({ type: 'SET_STEP', step });
  }, []);

  // Get current step index
  const getCurrentStepIndex = useCallback(() => {
    return stepOrder.indexOf(state.step);
  }, [state.step]);

  // Check if gym-specific steps should be shown
  const shouldShowGymSteps = useCallback(() => {
    return state.activityType === 'gym';
  }, [state.activityType]);

  // Get next step considering activity type
  const getNextStep = useCallback((): WizardStep | null => {
    const currentIndex = getCurrentStepIndex();
    const nextIndex = currentIndex + 1;

    if (nextIndex >= stepOrder.length) return null;

    const nextStep = stepOrder[nextIndex];

    // Skip gym-specific steps if not gym activity
    if (!shouldShowGymSteps() && (nextStep === 'gym_routines' || nextStep === 'exercise_details')) {
      const skipIndex = stepOrder.indexOf('additional_activities');
      return stepOrder[skipIndex];
    }

    return nextStep;
  }, [getCurrentStepIndex, shouldShowGymSteps]);

  // Get previous step considering activity type
  const getPrevStep = useCallback((): WizardStep | null => {
    const currentIndex = getCurrentStepIndex();
    const prevIndex = currentIndex - 1;

    if (prevIndex < 0) return null;

    const prevStep = stepOrder[prevIndex];

    // Skip gym-specific steps if not gym activity
    if (!shouldShowGymSteps() && (prevStep === 'exercise_details' || prevStep === 'gym_routines')) {
      const skipIndex = stepOrder.indexOf('duration');
      return stepOrder[skipIndex];
    }

    return prevStep;
  }, [getCurrentStepIndex, shouldShowGymSteps]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    const next = getNextStep();
    if (next) {
      dispatch({ type: 'SET_STEP', step: next });
    }
  }, [getNextStep]);

  // Navigate to previous step
  const prevStep = useCallback(() => {
    const prev = getPrevStep();
    if (prev) {
      dispatch({ type: 'SET_STEP', step: prev });
    }
  }, [getPrevStep]);

  // Check if can navigate next
  const canGoNext = useCallback(() => {
    const next = getNextStep();
    return next !== null;
  }, [getNextStep]);

  // Check if can navigate previous
  const canGoPrev = useCallback(() => {
    const prev = getPrevStep();
    return prev !== null;
  }, [getPrevStep]);

  // Save activity to API
  const saveActivity = useCallback(async (): Promise<FitnessActivity | null> => {
    if (!state.activityType) return null;

    setIsLoading(true);
    try {
      // Calculate total duration including additional activities
      const additionalMinutes = state.additionalActivities.reduce(
        (sum: number, activity: AdditionalActivity) => sum + activity.durationMinutes,
        0
      );
      const totalDuration = state.duration + additionalMinutes;

      const isEditing = Boolean(state.activityId);
      const endpoint = isEditing
        ? `/api/families/${familyId}/fitness/${state.activityId}`
        : `/api/families/${familyId}/fitness`;

      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isEditing ? {} : { personId: state.personId }),
          activityType: state.activityType,
          durationMinutes: totalDuration,
          intensityLevel: state.intensityLevel,
          workoutName: state.workoutName || undefined,
          exercises: state.exercises.length > 0 ? state.exercises : undefined,
          notes: buildNotesWithAdditionalActivities(state.notes, state.additionalActivities),
          activityDate: state.activityDate.toISOString(),
          imageUrls: state.imageUrls.length > 0 ? state.imageUrls : undefined,
          ...(isEditing ? {} : { source: 'manual' }),
        }),
      });

      if (!response.ok) {
        let message = 'Failed to save activity';
        try {
          const payload = await response.json();
          if (typeof payload?.error === 'string' && payload.error.trim()) {
            message = payload.error;
          }
        } catch {
          // Keep default message if the error body is not JSON.
        }
        throw new Error(message);
      }

      const activity = await response.json();
      onComplete(activity);
      return activity;
    } catch (error) {
      console.error('Error saving activity:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [state, familyId, onComplete]);

  // Build notes with additional activities info
  const buildNotesWithAdditionalActivities = (
    notes: string,
    additionalActivities: AdditionalActivity[]
  ): string => {
    if (additionalActivities.length === 0) return notes;

    const additionalInfo = additionalActivities
      .map((a) => `${a.type}: ${a.durationMinutes} min`)
      .join(', ');

    return notes
      ? `${notes}\n\nAdditional: ${additionalInfo}`
      : `Additional: ${additionalInfo}`;
  };

  const value: WizardContextValue = {
    state,
    dispatch,
    familyId,
    goToStep,
    nextStep,
    prevStep,
    canGoNext,
    canGoPrev,
    saveActivity,
    isLoading,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
};

export default WizardContext;
