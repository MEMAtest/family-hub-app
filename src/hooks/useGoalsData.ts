import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
// Assuming a GoalsData type exists or will be defined in types
// For now, I'll use `any` as a placeholder, similar to how it's used in the store.
// In a full refactor, this would be a well-defined interface.
type GoalsData = any;

// Define the type for the API response
type FetchGoalsResponse = GoalsData;

/**
 * Hook for managing goals data.
 * Fetches goals information from the API and updates the store.
 */
function useGoalsData(familyId?: string) {
  const { setGoalsData } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchGoalsResponse> => {
    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/goals`);
    if (!response.ok) {
      throw new Error(`Failed to fetch goals data: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchGoalsResponse) => {
    setGoalsData(data);
  };

  // The hook will refetch if the familyId changes
  return useApiData<FetchGoalsResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useGoalsData;