'use client'

import { FamilyHubProviders } from '@/contexts/familyHub/FamilyHubProviders';
import { FamilyHubShell } from './familyHub/FamilyHubShell';
import { useHydration } from '@/hooks/useHydration';
import { useDatabaseSync } from '@/hooks/useDatabaseSync';
import type { DatabaseBootstrapFamily } from '@/services/databaseService';

interface FamilyHubAppProps {
  bootstrapFamily?: DatabaseBootstrapFamily | null;
}

const FamilyHubAppContent = ({ bootstrapFamily }: FamilyHubAppProps) => {
  // Hydrate the store with current date on mount
  useHydration();
  // Sync data from database
  useDatabaseSync(bootstrapFamily);

  return <FamilyHubShell />;
};

const FamilyHubApp = ({ bootstrapFamily }: FamilyHubAppProps) => {
  return (
    <FamilyHubProviders>
      <FamilyHubAppContent bootstrapFamily={bootstrapFamily} />
    </FamilyHubProviders>
  );
};

export default FamilyHubApp;
