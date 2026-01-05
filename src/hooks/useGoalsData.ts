import useApiData from './useApiData';
import { useFamilyStore, GoalsData } from '@/store/familyStore';

// Define the type for the API response
type FetchGoalsResponse = GoalsData | null;

const safeJsonParse = <T,>(raw: string | null, fallback: T): T => {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.warn('Failed to parse goals cache', error);
    return fallback;
  }
};

const normaliseGoal = (goal: any, fallbackId: string) => {
  const createdAt = goal?.createdAt ? new Date(goal.createdAt).toISOString() : new Date().toISOString();
  const deadline = goal?.deadline ?? goal?.targetDate ?? null;
  const progress = Number(goal?.currentProgress ?? goal?.progress ?? 0);

  return {
    id: goal?.id ?? fallbackId,
    title: goal?.goalTitle ?? goal?.title ?? 'Goal',
    description: goal?.goalDescription ?? goal?.description ?? '',
    type: goal?.goalType ?? goal?.type ?? 'family',
    participants: Array.isArray(goal?.participants) ? goal.participants : [],
    progress,
    currentProgress: progress,
    targetValue: goal?.targetValue ?? goal?.target?.value ?? '',
    deadline,
    createdAt,
    updatedAt: goal?.updatedAt ? new Date(goal.updatedAt).toISOString() : createdAt,
  };
};

const buildGoalsData = (goals: any[], achievements: any[] = []): GoalsData => {
  const familyGoals: any[] = [];
  const individualGoals: any[] = [];

  goals.forEach((goal, index) => {
    const record = normaliseGoal(goal, `goal-${index}`);
    const type = String(record.type ?? '').toLowerCase();
    if (type === 'individual' || type === 'personal') {
      individualGoals.push(record);
    } else {
      familyGoals.push(record);
    }
  });

  return {
    familyGoals,
    individualGoals,
    achievements: Array.isArray(achievements) ? achievements : [],
    rewardSystem: {
      points: {},
      badges: {},
    },
  };
};

/**
 * Hook for managing goals data.
 * Fetches goals information from the API and updates the store.
 */
function useGoalsData(familyId?: string) {
  const { setGoalsData } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchGoalsResponse> => {
    if (!familyId) {
      if (typeof window !== 'undefined') {
        const cachedGoalsData = safeJsonParse<GoalsData | null>(
          localStorage.getItem('goalsData'),
          null
        );
        if (cachedGoalsData) {
          return cachedGoalsData;
        }
        const cachedGoals = safeJsonParse<any[]>(localStorage.getItem('familyGoals'), []);
        const cachedAchievements = safeJsonParse<any[]>(localStorage.getItem('familyAchievements'), []);
        if (cachedGoals.length || cachedAchievements.length) {
          return buildGoalsData(cachedGoals, cachedAchievements);
        }
      }
      return null;
    }
    const response = await fetch(`/api/families/${familyId}/goals`);
    if (!response.ok) {
      throw new Error(`Failed to fetch goals data: ${response.statusText}`);
    }
    const payload = await response.json();
    const goalsArray = Array.isArray(payload) ? payload : [];
    return buildGoalsData(goalsArray);
  };

  const storeUpdateFunction = (data: FetchGoalsResponse) => {
    if (!data) return;
    setGoalsData(data);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('goalsData', JSON.stringify(data));
        const flattenedGoals = [
          ...(data.familyGoals || []),
          ...(data.individualGoals || []),
        ];
        localStorage.setItem('familyGoals', JSON.stringify(flattenedGoals));
      } catch (error) {
        console.warn('Failed to persist goals cache', error);
      }
    }
  };

  // The hook will refetch if the familyId changes
  return useApiData<FetchGoalsResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useGoalsData;
