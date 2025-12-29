'use client'

import { FamilyHubProviders } from '@/contexts/familyHub/FamilyHubProviders';
import { FamilyHubShell } from './familyHub/FamilyHubShell';
import { useHydration } from '@/hooks/useHydration';
import { useDatabaseSync } from '@/hooks/useDatabaseSync';

const FamilyHubAppContent = () => {
  // Hydrate the store with current date on mount
  useHydration();
  // Sync data from database
  useDatabaseSync();

  return <FamilyHubShell />;
};

const FamilyHubApp = () => {
  return (
    <FamilyHubProviders>
      <FamilyHubAppContent />
    </FamilyHubProviders>
  );
};

export default FamilyHubApp;
