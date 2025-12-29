'use client'

import { useEffect } from 'react';
import { useFamilyStore, FamilyState } from '@/store/familyStore';

// Auth is currently disabled - this hook uses localStorage mode only
// To re-enable auth-based database sync, import and use useAuth from AuthContext

export const useDatabaseSync = () => {
  const setDatabaseStatus = useFamilyStore((state: FamilyState) => state.setDatabaseStatus);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Auth is disabled - use localStorage mode
    console.log('📦 Using localStorage mode (auth disabled)');
    setDatabaseStatus({ connected: false, familyId: null, mode: 'localStorage' });
  }, [setDatabaseStatus]);
};
