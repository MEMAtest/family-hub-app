import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';
// Assuming a ShoppingList type exists or will be defined in types
// For now, I'll use `any` as a placeholder, similar to how it's used in the store.
// In a full refactor, this would be a well-defined interface.
type ShoppingList = any;

// Define the type for the API response
type FetchShoppingListsResponse = ShoppingList[];

/**
 * Hook for managing shopping lists.
 * Fetches shopping lists from the API and updates the store.
 */
function useShoppingLists(familyId?: string) {
  const { setShoppingLists } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchShoppingListsResponse> => {
    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/shopping/lists`);
    if (!response.ok) {
      throw new Error(`Failed to fetch shopping lists: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (data: FetchShoppingListsResponse) => {
    setShoppingLists(data);
  };

  // The hook will refetch if the familyId changes
  return useApiData<FetchShoppingListsResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useShoppingLists;