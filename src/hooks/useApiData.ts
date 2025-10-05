import { useState, useEffect } from 'react';
import { useFamilyStore } from '@/store/familyStore';

interface ApiDataHook<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Generic hook for fetching data from the API and updating the store.
 * This hook is designed to be extended by feature-specific hooks.
 */
function useApiData<T>(
  fetchFunction: () => Promise<T>,
  storeUpdateFunction: (data: T) => void,
  dependencies: React.DependencyList = []
): ApiDataHook<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchFunction();
      setData(result);
      storeUpdateFunction(result);
    } catch (err) {
      console.error('API fetch error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, loading, error, refetch: fetchData };
}

export default useApiData;