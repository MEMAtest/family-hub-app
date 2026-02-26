'use client'

import { Plus } from 'lucide-react';
import { useBrainContext } from '@/contexts/familyHub/BrainContext';

const BrainFloatingActions = () => {
  const { activeProjectId, setIsCreateNodeOpen } = useBrainContext();

  if (!activeProjectId) return null;

  return (
    <button
      onClick={() => setIsCreateNodeOpen(true)}
      className="fixed z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 active:scale-95 transition-transform md:hidden"
      style={{
        right: '16px',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      }}
      aria-label="Add node"
    >
      <Plus className="h-6 w-6" />
    </button>
  );
};

export default BrainFloatingActions;
