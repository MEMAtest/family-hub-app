'use client';

import { useEffect } from 'react';
import { useFamilyStore } from '@/store/familyStore';
import { SharedDocumentSync } from '@/services/sharedDocumentSync';

// Starts syncing shared household data once the database connection knows the family.
export const useSharedDocumentSync = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const connected = useFamilyStore((state) => state.databaseStatus.connected);

  useEffect(() => {
    if (!familyId || !connected) return;
    const sync = new SharedDocumentSync(familyId);
    void sync.start();
    const flushOnHide = () => {
      if (document.visibilityState === 'hidden') void sync.flush();
    };
    document.addEventListener('visibilitychange', flushOnHide);
    return () => {
      document.removeEventListener('visibilitychange', flushOnHide);
      void sync.flush().finally(() => sync.stop());
    };
  }, [familyId, connected]);
};
