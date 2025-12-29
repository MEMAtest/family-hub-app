'use client';

import { useEffect } from 'react';
import { useFamilyStore } from '@/store/familyStore';

/**
 * Hook to handle client-side hydration of the store.
 * This sets the currentDate and marks the store as hydrated.
 * Must be called in a client component after initial render.
 */
export const useHydration = () => {
  const hydrate = useFamilyStore((state) => state.hydrate);
  const isHydrated = useFamilyStore((state) => state.isHydrated);

  useEffect(() => {
    if (!isHydrated) {
      hydrate();
    }
  }, [hydrate, isHydrated]);

  return isHydrated;
};
