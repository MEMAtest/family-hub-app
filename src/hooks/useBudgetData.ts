import useApiData from './useApiData';
import { useFamilyStore } from '@/store/familyStore';

// Define the internal structure for budget data as expected by the store
// This should ideally be imported from a shared types file if it's used elsewhere
interface InternalBudgetData {
  income: {
    monthly: Record<string, any>;
    oneTime: any[];
  };
  expenses: {
    recurringMonthly: Record<string, any>;
    oneTimeSpends: any[];
  };
  priorMonths: Record<string, any>;
  budgetLimits: Record<string, number>;
  actualSpend: Record<string, number>;
}

// Define the type for the API response
// This is a simplified example. The actual API response might be different.
interface FetchBudgetResponse {
  income: any[];
  expenses: any[];
  // ... other fields from the API
}

/**
 * Hook for managing budget data.
 * Fetches budget information from the API and updates the store.
 */
function useBudgetData(familyId?: string) {
  const { setBudgetData } = useFamilyStore();

  const fetchFunction = async (): Promise<FetchBudgetResponse> => {
    // Example API call - adjust the URL and parameters as needed
    const response = await fetch(`/api/families/${familyId}/budget`);
    if (!response.ok) {
      throw new Error(`Failed to fetch budget data: ${response.statusText}`);
    }
    return response.json();
  };

  const storeUpdateFunction = (apiData: FetchBudgetResponse) => {
    // Transform the API response into the structure expected by the store
    const transformedData: InternalBudgetData = {
      income: {
        monthly: apiData.income.filter((inc) => inc.isRecurring).reduce((acc, inc) => {
          acc[inc.id] = inc;
          return acc;
        }, {}),
        oneTime: apiData.income.filter((inc) => !inc.isRecurring),
      },
      expenses: {
        recurringMonthly: apiData.expenses.filter((exp) => exp.isRecurring).reduce((acc, exp) => {
          acc[exp.id] = exp;
          return acc;
        }, {}),
        oneTimeSpends: apiData.expenses.filter((exp) => !exp.isRecurring),
      },
      priorMonths: {}, // Populate as needed
      budgetLimits: {}, // Populate as needed
      actualSpend: {}, // Populate as needed
    };

    setBudgetData(transformedData);
  };

  // The hook will refetch if the familyId changes
  return useApiData<FetchBudgetResponse>(fetchFunction, storeUpdateFunction, [familyId]);
}

export default useBudgetData;