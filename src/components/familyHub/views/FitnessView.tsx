'use client';

import React, { useState } from 'react';
import { ActivityHistory, FitnessDashboard } from '@/components/fitness';
import { useFamilyStore } from '@/store/familyStore';

export const FitnessView: React.FC = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const familyMembers = useFamilyStore((state) => state.familyMembers);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard');

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
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => setTab('dashboard')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'dashboard'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          Dashboard
        </button>
        <button
          onClick={() => setTab('history')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'history'
              ? 'bg-blue-600 text-white'
              : 'bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800'
          }`}
        >
          History
        </button>
      </div>
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
        tab === 'dashboard' ? (
          <FitnessDashboard
            familyId={familyId}
            personId={currentPersonId}
            personName={currentPerson.name}
            personColor={currentPerson.color}
            onViewAll={() => setTab('history')}
          />
        ) : (
          <ActivityHistory familyId={familyId} personId={currentPersonId} />
        )
      )}
    </div>
  );
};

export default FitnessView;
