'use client'

import { FamilyHubProviders } from '@/contexts/familyHub/FamilyHubProviders';
import { FamilyHubShell } from './familyHub/FamilyHubShell';

const FamilyHubApp = () => {
  return (
    <FamilyHubProviders>
      <FamilyHubShell />
    </FamilyHubProviders>
  );
};

export default FamilyHubApp;
