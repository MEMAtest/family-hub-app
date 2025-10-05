import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
import { FamilyMember as ApiFamilyMember } from '@/types/family.types';
import type { FamilyMember as StoreFamilyMember } from '@/types';

// Define the type for the API response
type FetchFamilyResponse = ApiFamilyMember[];

/**
 * Hook for managing family data.
 * Fetches family members from the API and updates the store.
 */
function useFamilyData(familyId?: string) {
  const setPeople = useFamilyStore((state) => state.setPeople);

  const fetchFunction = async (): Promise<FetchFamilyResponse> => {
    // Guard: only fetch if familyId exists
    if (!familyId) {
      return [];
    }

    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/members`);
    if (!response.ok) {
      throw new Error(`Failed to fetch family members: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchFamilyResponse) => {
    const transformed: StoreFamilyMember[] = data.map((member) => {
      const memberRecord = member as Record<string, any>;
      const name =
        memberRecord.displayName ||
        (member.firstName && member.lastName
          ? `${member.firstName} ${member.lastName}`
          : memberRecord.name || 'Family Member');

      const rawRole =
        typeof member.role === 'string'
          ? member.role
          : member.role?.name ?? 'Family Member';
      const role: StoreFamilyMember['role'] =
        rawRole === 'Parent' || rawRole === 'Student' ? rawRole : 'Family Member';

      const computedAgeGroup = memberRecord.ageGroup
        || (typeof member.age === 'number'
          ? member.age < 4
            ? 'Toddler'
            : member.age < 6
            ? 'Preschool'
            : member.age < 13
            ? 'Child'
            : member.age < 18
            ? 'Teen'
            : 'Adult'
          : 'Adult');

      return {
        id: member.id,
        familyId: member.familyId,
        name,
        role,
        ageGroup: computedAgeGroup,
        color: member.color || '#3B82F6',
        icon: memberRecord.avatar || memberRecord.icon || '👤',
        fitnessGoals: memberRecord.fitnessGoals || {},
        createdAt: new Date(member.createdAt).toISOString(),
        updatedAt: new Date(member.updatedAt).toISOString(),
      } satisfies StoreFamilyMember;
    });

    setPeople(transformed);
  };

  // The hook will refetch if the familyId changes
  return useApiData<FetchFamilyResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useFamilyData;
