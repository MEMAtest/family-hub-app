'use client'

import { useEffect, useRef } from 'react';
import { useFamilyStore, FamilyState } from '@/store/familyStore';
import databaseService from '@/services/databaseService';

export const useDatabaseSync = () => {
  const setDatabaseStatus = useFamilyStore((state: FamilyState) => state.setDatabaseStatus);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initDatabase = async () => {
      console.log('🔄 Initializing database connection...');

      try {
        const connected = await databaseService.initialize();
        const status = databaseService.getStatus();

        if (connected) {
          console.log('✅ Database connected:', status);
          setDatabaseStatus({
            connected: true,
            familyId: status.familyId,
            mode: 'database',
          });
        } else {
          console.log('📦 Falling back to localStorage mode');
          // Try to get familyId from localStorage for offline operation
          const storedFamilyId = localStorage.getItem('familyId');
          setDatabaseStatus({
            connected: false,
            familyId: storedFamilyId,
            mode: 'localStorage',
          });
        }
      } catch (error) {
        console.error('Database initialization failed:', error);
        const storedFamilyId = localStorage.getItem('familyId');
        setDatabaseStatus({
          connected: false,
          familyId: storedFamilyId,
          mode: 'localStorage',
        });
      }
    };

    initDatabase();
  }, [setDatabaseStatus]);
};
