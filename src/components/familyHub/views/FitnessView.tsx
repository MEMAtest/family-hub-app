'use client';

import React, { useState } from 'react';
import { FitnessDashboard } from '@/components/fitness';
import { useFamilyStore } from '@/store/familyStore';

export const FitnessView: React.FC = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const familyMembers = useFamilyStore((state) => state.familyMembers);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Filter to adult members for fitness tracking
  const adults = familyMembers.filter((m) => m.ageGroup === 'Adult');

  // Default to first adult or first member
  const defaultPerson = adults[0] || familyMembers[0];
  const currentPersonId = selectedPersonId || defaultPerson?.id;
  const currentPerson = familyMembers.find((m) => m.id === currentPersonId);

  if (!familyId) {
    return (
      <div className="p-4 sm:p-8 text-center">
        <p className="text-gray-500 dark:text-slate-400">
          Loading family data...
        </p>
      </div>
    );
  }

  if (familyMembers.length === 0) {
    return (
      <div className="p-4 sm:p-8 text-center">
        <p className="text-gray-500 dark:text-slate-400 mb-4">
          No family members found. Add family members to start tracking fitness.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 lg:p-8 overflow-x-hidden bg-gray-50 dark:bg-slate-950 min-h-full">
      {/* Person selector */}
      {adults.length > 1 && (
        <div className="mb-4 sm:mb-6">
          <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 block">
            Tracking for
          </label>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {adults.map((member) => (
              <button
                key={member.id}
                onClick={() => setSelectedPersonId(member.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg transition-colors touch-manipulation text-sm ${
                  currentPersonId === member.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
                }`}
              >
                <span
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs sm:text-sm flex-shrink-0"
                  style={{ backgroundColor: member.color }}
                >
                  {member.icon}
                </span>
                <span className="truncate">{member.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {currentPerson && currentPersonId && (
        <FitnessDashboard
          familyId={familyId}
          personId={currentPersonId}
          personName={currentPerson.name}
          personColor={currentPerson.color}
        />
      )}
    </div>
  );
};

export default FitnessView;
