'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { GoalsData } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import { FamilyMember } from '@/types';

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
    todaySteps: 0,
    todayWorkout: 'rest',
    weeklyGoal: 4,
    weeklyProgress: 0,
    activities: [],
    weeklyMiles: 0,
    avgPace: '--:--',
    nextRun: '',
  },
  wellness: {
    mood: 0,
    sleep: 0,
    stress: 0,
    energy: 0,
    hydration: 0,
    recovery: 0,
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

  // Get family data from store
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const selectedPerson = useFamilyStore((state) => state.selectedPerson);
  const familyMembers = useFamilyStore((state) => state.people as FamilyMember[]);

  const [personalTracking, setPersonalTrackingState] = useState<PersonalTrackingState>(DEFAULT_PERSONAL_TRACKING);
  const [isQuickActivityFormOpen, setIsQuickActivityFormOpen] = useState(false);
  const [quickActivityForm, setQuickActivityFormState] = useState<QuickActivityFormState>(INITIAL_QUICK_ACTIVITY_FORM);

  // Fetch real fitness data when family/person changes
  useEffect(() => {
    const fetchFitnessData = async () => {
      if (!familyId) return;

      // Get selected person ID or first adult member
      let personId = selectedPerson;
      if (!personId || personId === 'all') {
        const adultMember = familyMembers.find((m: FamilyMember) => m.ageGroup === 'Adult');
        personId = adultMember?.id || familyMembers[0]?.id;
      }
      if (!personId) return;

      try {
        // Fetch fitness activities
        const activitiesRes = await fetch(`/api/families/${familyId}/fitness?personId=${personId}&limit=10`);
        const statsRes = await fetch(`/api/families/${familyId}/fitness/stats?personId=${personId}`);

        if (activitiesRes.ok && statsRes.ok) {
          const activitiesData = await activitiesRes.json();
          const statsData = await statsRes.json();

          // Get fitness goals from member
          const member = familyMembers.find((m: FamilyMember) => m.id === personId);
          const fitnessGoals = member?.fitnessGoals as { workouts?: number } | null;
          const weeklyGoal = fitnessGoals?.workouts || 4;

          // Map API activities to our format
          const activities: ActivityEntry[] = (activitiesData.activities || []).map((act: any) => ({
            id: act.id,
            type: act.activityType,
            duration: act.durationMinutes,
            intensity: act.intensityLevel ? act.intensityLevel.charAt(0).toUpperCase() + act.intensityLevel.slice(1) : 'Medium',
            date: act.activityDate,
            person: personId,
            notes: act.workoutName || act.notes || '',
          }));

          // Check if there's a workout today
          const today = new Date().toISOString().split('T')[0];
          const todayActivity = activities.find((a: ActivityEntry) => a.date.startsWith(today));

          setPersonalTrackingState(prev => ({
            ...prev,
            fitness: {
              ...prev.fitness,
              weeklyGoal,
              weeklyProgress: statsData.totalWorkouts || 0,
              activities,
              todayWorkout: todayActivity?.type || 'rest',
            },
          }));
        }
      } catch (error) {
        console.error('Failed to fetch fitness data:', error);
      }
    };

    fetchFitnessData();
  }, [familyId, selectedPerson, familyMembers]);

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
