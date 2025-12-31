import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
import type { FamilyMilestone } from '@/types';

type FetchMilestonesResponse = any[] | null;

const normalizeDate = (value: unknown, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString().split('T')[0];
};

const normalizeTimestamp = (value: unknown, fallback: string) => {
  if (!value) return fallback;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toISOString();
};

const normalizeMilestone = (milestone: any, familyId?: string): FamilyMilestone => {
  const now = new Date().toISOString();
  return {
    id: milestone.id,
    familyId: milestone.familyId || familyId || 'local-family',
    title: milestone.title || 'Untitled Milestone',
    description: milestone.description || '',
    date: normalizeDate(milestone.date, now.split('T')[0]),
    type: milestone.type || 'family_event',
    participants: Array.isArray(milestone.participants) ? milestone.participants : [],
    photos: Array.isArray(milestone.photos) ? milestone.photos : [],
    tags: Array.isArray(milestone.tags) ? milestone.tags : [],
    isRecurring: Boolean(milestone.isRecurring),
    reminderDays: Array.isArray(milestone.reminderDays) ? milestone.reminderDays : [],
    isPrivate: Boolean(milestone.isPrivate),
    createdBy: milestone.createdBy || undefined,
    createdAt: normalizeTimestamp(milestone.createdAt, now),
    updatedAt: normalizeTimestamp(milestone.updatedAt, now),
  };
};

function useFamilyMilestones(familyId?: string) {
  const setFamilyMilestones = useFamilyStore((state) => state.setFamilyMilestones);

  const fetchFunction = async (): Promise<FetchMilestonesResponse> => {
    if (!familyId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('familyMilestones');
        if (stored) {
          return JSON.parse(stored) as FetchMilestonesResponse;
        }
      }
      return null;
    }

    const response = await fetch(`/api/families/${familyId}/milestones`);
    if (!response.ok) {
      throw new Error(`Failed to fetch family milestones: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchMilestonesResponse) => {
    if (!data || !Array.isArray(data)) return;
    const transformed = data.map((milestone) => normalizeMilestone(milestone, familyId));
    setFamilyMilestones(transformed);
    if (typeof window !== 'undefined') {
      localStorage.setItem('familyMilestones', JSON.stringify(transformed));
    }
  };

  return useApiData<FetchMilestonesResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useFamilyMilestones;
