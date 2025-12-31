import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
import { FamilyMember as ApiFamilyMember } from '@/types/family.types';
import type { FamilyMember as StoreFamilyMember } from '@/types';

// Define the type for the API response
type FetchFamilyResponse = ApiFamilyMember[] | null;

const DARK_SKIN_ICON_MAP: Record<string, string> = {
  '👤': '🧑🏾',
  '👨': '👨🏾',
  '👩': '👩🏾',
  '🧒': '🧒🏿‍🦱',
  '👶': '👶🏿',
};

const getDefaultIcon = (role?: string, ageGroup?: string) => {
  if (role === 'Student' || ['Toddler', 'Preschool', 'Child', 'Teen'].includes(ageGroup || '')) {
    return '🧒🏿‍🦱';
  }
  return '🧑🏾';
};

/**
 * Hook for managing family data.
 * Fetches family members from the API and updates the store.
 */
function useFamilyData(familyId?: string) {
  const setPeople = useFamilyStore((state) => state.setPeople);

  const fetchFunction = async (): Promise<FetchFamilyResponse> => {
    // Guard: only fetch if familyId exists
    if (!familyId) {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('familyMembers');
        if (stored) {
          return JSON.parse(stored) as FetchFamilyResponse;
        }
      }
      return null;
    }

    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/members`);
    if (!response.ok) {
      throw new Error(`Failed to fetch family members: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchFamilyResponse) => {
    if (!data) return;
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

      const ageGroupFromRecord = typeof memberRecord.ageGroup === 'string'
        ? memberRecord.ageGroup
        : typeof memberRecord.age === 'string'
          ? memberRecord.age
          : null;

      const dateOfBirthValue = memberRecord.dateOfBirth
        ? new Date(memberRecord.dateOfBirth as string)
        : null;
      const dateOfBirth = dateOfBirthValue && !Number.isNaN(dateOfBirthValue.getTime())
        ? dateOfBirthValue.toISOString().split('T')[0]
        : undefined;

      const computedAge = dateOfBirth
        ? (() => {
            const today = new Date();
            let age = today.getFullYear() - dateOfBirthValue!.getFullYear();
            const monthDiff = today.getMonth() - dateOfBirthValue!.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirthValue!.getDate())) {
              age -= 1;
            }
            return age;
          })()
        : undefined;

      const computedAgeGroup = ageGroupFromRecord
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
            : computedAge !== undefined
            ? computedAge < 4
              ? 'Toddler'
              : computedAge < 6
                ? 'Preschool'
                : computedAge < 13
                  ? 'Child'
                  : computedAge < 18
                    ? 'Teen'
                    : 'Adult'
            : 'Adult');

      const rawIcon = memberRecord.avatar || memberRecord.icon;
      const normalizedIcon = rawIcon
        ? (DARK_SKIN_ICON_MAP[rawIcon] || rawIcon)
        : getDefaultIcon(role, computedAgeGroup);

      return {
        id: member.id,
        familyId: member.familyId || familyId || 'local-family',
        name,
        role,
        ageGroup: computedAgeGroup as StoreFamilyMember['ageGroup'],
        dateOfBirth,
        age: computedAge,
        avatarUrl: memberRecord.avatarUrl || memberRecord.profilePhoto || memberRecord.profilePicture || undefined,
        color: member.color || '#3B82F6',
        icon: normalizedIcon,
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
