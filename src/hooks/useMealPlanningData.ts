import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
// Assuming a MealPlanning type exists or will be defined in types
// For now, I'll use `any` as a placeholder, similar to how it's used in the store.
// In a full refactor, this would be a well-defined interface.
type MealPlanning = any;

// Define the type for the API response
type FetchMealPlanningResponse = MealPlanning;

/**
 * Hook for managing meal planning data.
 * Fetches meal planning information from the API and updates the store.
 */
function useMealPlanningData(familyId?: string) {
  const { setMealPlanning } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchMealPlanningResponse> => {
    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/meals/planning`);
    if (!response.ok) {
      throw new Error(`Failed to fetch meal planning data: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchMealPlanningResponse) => {
    setMealPlanning(data);
 };

  // The hook will refetch if the familyId changes
  return useApiData<FetchMealPlanningResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useMealPlanningData;