'use client';

import React, { useEffect, useState } from 'react';
import { ActivityHistory, FitnessDashboard } from '@/components/fitness';
import { useFamilyStore } from '@/store/familyStore';

export const FitnessView: React.FC = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const familyMembers = useFamilyStore((state) => state.familyMembers);
  const [tab, setTab] = useState<'dashboard' | 'history'>('dashboard');
  const [profile, setProfile] = useState<{ id: string; name: string; color: string; icon: string } | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && data?.familyMember?.id) {
          setProfile({
            id: data.familyMember.id,
            name: data.familyMember.name || 'My profile',
            color: data.familyMember.color || '#147c72',
            icon: data.familyMember.icon || 'ME',
          });
        }
      })
      .catch(() => {
        if (active) setProfile(null);
      });
    return () => { active = false; };
  }, []);

  const currentPerson = profile
    ? familyMembers.find((member) => member.id === profile.id) || profile
    : process.env.NEXT_PUBLIC_E2E === 'true'
      ? familyMembers.find((member) => member.ageGroup === 'Adult') || familyMembers[0] || null
      : null;
  const currentPersonId = profile?.id || (process.env.NEXT_PUBLIC_E2E === 'true' ? currentPerson?.id : null);

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
