'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { GoalsData } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';

export interface ActivityEntry {
  id: string;
  type: string;
  duration: number;
  intensity: string;
  date: string;
  person: string;
  notes?: string;
}

export interface PersonalTrackingState {
  fitness: {
    todaySteps: number;
    todayWorkout: string;
    weeklyGoal: number;
    weeklyProgress: number;
    activities: ActivityEntry[];
    weeklyMiles: number;
    avgPace: string;
    nextRun: string;
  };
  wellness: {
    mood: number;
    sleep: number;
    stress: number;
    energy: number;
    hydration: number;
    recovery: number;
  };
}

export interface QuickActivityFormState {
  type: string;
  duration: number;
  intensity: string;
  notes: string;
}

interface GoalsContextValue {
  goalsData: GoalsData | null;
  setGoalsData: (data: GoalsData) => void;
  updateGoalsData: (updates: Partial<GoalsData>) => void;
  personalTracking: PersonalTrackingState;
  setPersonalTracking: (updater: PersonalTrackingState | ((prev: PersonalTrackingState) => PersonalTrackingState)) => void;
  isQuickActivityFormOpen: boolean;
  openQuickActivityForm: () => void;
  closeQuickActivityForm: () => void;
  quickActivityForm: QuickActivityFormState;
  setQuickActivityForm: (updater: QuickActivityFormState | ((prev: QuickActivityFormState) => QuickActivityFormState)) => void;
  logActivity: () => void;
}

const DEFAULT_PERSONAL_TRACKING: PersonalTrackingState = {
  fitness: {
    todaySteps: 7432,
    todayWorkout: 'rest',
    weeklyGoal: 4,
    weeklyProgress: 2,
    activities: [
      { id: 'act1', type: 'gym', duration: 75, intensity: 'High', date: '2025-08-29T18:30:00', person: 'ade', notes: 'Upper body focus' },
      { id: 'act2', type: 'running', duration: 45, intensity: 'Medium', date: '2025-08-28T07:00:00', person: 'ade', notes: '5K park run' },
      { id: 'act3', type: 'gym', duration: 75, intensity: 'High', date: '2025-08-26T18:30:00', person: 'ade', notes: 'Leg day workout' },
    ],
    weeklyMiles: 15.5,
    avgPace: '7:42',
    nextRun: 'Tomorrow 7:00 AM - 5K Recovery Run',
  },
  wellness: {
    mood: 8,
    sleep: 7.5,
    stress: 2,
    energy: 8,
    hydration: 7,
    recovery: 8,
  },
};

const INITIAL_QUICK_ACTIVITY_FORM: QuickActivityFormState = {
  type: 'gym',
  duration: 60,
  intensity: 'Medium',
  notes: '',
};

const GoalsContext = createContext<GoalsContextValue | undefined>(undefined);

export const GoalsProvider = ({ children }: PropsWithChildren) => {
  const goalsData = useFamilyStore((state) => state.goalsData);
  const setGoalsDataStore = useFamilyStore((state) => state.setGoalsData);
  const updateGoalsDataStore = useFamilyStore((state) => state.updateGoalsData);

  const [personalTracking, setPersonalTrackingState] = useState<PersonalTrackingState>(DEFAULT_PERSONAL_TRACKING);
  const [isQuickActivityFormOpen, setIsQuickActivityFormOpen] = useState(false);
  const [quickActivityForm, setQuickActivityFormState] = useState<QuickActivityFormState>(INITIAL_QUICK_ACTIVITY_FORM);

  const setPersonalTracking = useCallback<GoalsContextValue['setPersonalTracking']>((updater) => {
    setPersonalTrackingState((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const setQuickActivityForm = useCallback<GoalsContextValue['setQuickActivityForm']>((updater) => {
    setQuickActivityFormState((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const openQuickActivityForm = useCallback(() => setIsQuickActivityFormOpen(true), []);
  const closeQuickActivityForm = useCallback(() => {
    setIsQuickActivityFormOpen(false);
    setQuickActivityFormState(INITIAL_QUICK_ACTIVITY_FORM);
  }, []);

  const logActivity = useCallback(() => {
    const newActivity: ActivityEntry = {
      id: createId('activity'),
      ...quickActivityForm,
      date: new Date().toISOString(),
      person: 'ade',
    };

    setPersonalTracking((prev) => ({
      fitness: {
        ...prev.fitness,
        activities: [...prev.fitness.activities, newActivity],
        todayWorkout: quickActivityForm.type,
        weeklyProgress: prev.fitness.weeklyProgress + 1,
      },
      wellness: prev.wellness,
    }));

    closeQuickActivityForm();
  }, [closeQuickActivityForm, quickActivityForm, setPersonalTracking]);

  const value = useMemo<GoalsContextValue>(() => ({
    goalsData,
    setGoalsData: setGoalsDataStore,
    updateGoalsData: updateGoalsDataStore,
    personalTracking,
    setPersonalTracking,
    isQuickActivityFormOpen,
    openQuickActivityForm,
    closeQuickActivityForm,
    quickActivityForm,
    setQuickActivityForm,
    logActivity,
  }), [
    closeQuickActivityForm,
    goalsData,
    isQuickActivityFormOpen,
    logActivity,
    openQuickActivityForm,
    personalTracking,
    quickActivityForm,
    setGoalsDataStore,
    setPersonalTracking,
    setQuickActivityForm,
    updateGoalsDataStore,
  ]);

  return (
    <GoalsContext.Provider value={value}>
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoalsContext = () => {
  const context = useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoalsContext must be used within a GoalsProvider');
  }
  return context;
};
