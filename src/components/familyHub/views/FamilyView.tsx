'use client'

import { useEffect, useState } from 'react';
import FamilyDashboard from '@/components/family/FamilyDashboard';
import { FamilyTimeline } from '@/components/family/FamilyTimeline';
import { FamilyAnalytics } from '@/components/family/FamilyAnalytics';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useFamilyStore } from '@/store/familyStore';
import useFamilyMilestones from '@/hooks/useFamilyMilestones';
import useGoalsData from '@/hooks/useGoalsData';
import databaseService from '@/services/databaseService';
import { createId } from '@/utils/id';
import type { FamilyMilestone } from '@/types';

const tabs = [
  { id: 'members', label: 'Members' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'access', label: 'Access' },
] as const;

type FamilyTab = typeof tabs[number]['id'];

const normalizeMilestone = (milestone: any, familyId?: string): FamilyMilestone => {
  const now = new Date().toISOString();
  const dateValue = milestone.date ? new Date(milestone.date) : null;
  const date = dateValue && !Number.isNaN(dateValue.getTime())
    ? dateValue.toISOString().split('T')[0]
    : now.split('T')[0];

  return {
    id: milestone.id,
    familyId: milestone.familyId || familyId || 'local-family',
    title: milestone.title || 'Untitled Milestone',
    description: milestone.description || '',
    date,
    type: milestone.type || 'family_event',
    participants: Array.isArray(milestone.participants) ? milestone.participants : [],
    photos: Array.isArray(milestone.photos) ? milestone.photos : [],
    tags: Array.isArray(milestone.tags) ? milestone.tags : [],
    isRecurring: Boolean(milestone.isRecurring),
    reminderDays: Array.isArray(milestone.reminderDays) ? milestone.reminderDays : [],
    isPrivate: Boolean(milestone.isPrivate),
    createdBy: milestone.createdBy || undefined,
    createdAt: milestone.createdAt ? new Date(milestone.createdAt).toISOString() : now,
    updatedAt: milestone.updatedAt ? new Date(milestone.updatedAt).toISOString() : now,
  };
};

export const FamilyView = () => {
  const { members } = useFamilyContext();
  const [activeTab, setActiveTab] = useState<FamilyTab>('members');
  const databaseStatus = useFamilyStore((state) => state.databaseStatus);
  const milestones = useFamilyStore((state) => state.familyMilestones);
  const addFamilyMilestone = useFamilyStore((state) => state.addFamilyMilestone);
  const updateFamilyMilestone = useFamilyStore((state) => state.updateFamilyMilestone);
  const deleteFamilyMilestone = useFamilyStore((state) => state.deleteFamilyMilestone);
  const [isOwner, setIsOwner] = useState(false);
  const [accessMembers, setAccessMembers] = useState<Array<any>>([]);
  const [inviteCode, setInviteCode] = useState<{ memberName: string; code: string; expiresAt: string } | null>(null);
  const [accessError, setAccessError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setIsOwner(Boolean(data?.isOwner)))
      .catch(() => setIsOwner(false));
  }, []);

  useEffect(() => {
    if (activeTab !== 'access' || !databaseStatus.familyId) return;
    fetch(`/api/families/${databaseStatus.familyId}/members`)
      .then((response) => response.ok ? response.json() : [])
      .then((data) => setAccessMembers(Array.isArray(data) ? data : []))
      .catch(() => setAccessMembers([]));
  }, [activeTab, databaseStatus.familyId]);

  const { loading: milestonesLoading, error: milestonesError, refetch: refetchMilestones } =
    useFamilyMilestones(databaseStatus.familyId ?? undefined);
  useGoalsData(databaseStatus.familyId ?? undefined);

  const handleAddMilestone = async (partial: Partial<FamilyMilestone>) => {
    const now = new Date().toISOString();
    const milestone: FamilyMilestone = {
      id: createId('milestone'),
      familyId: databaseStatus.familyId || 'local-family',
      title: partial.title || 'Untitled Milestone',
      description: partial.description || '',
      date: partial.date || now.split('T')[0],
      type: partial.type || 'family_event',
      participants: partial.participants || [],
      photos: partial.photos || [],
      tags: partial.tags || [],
      isRecurring: Boolean(partial.isRecurring),
      reminderDays: partial.reminderDays || [],
      isPrivate: Boolean(partial.isPrivate),
      createdBy: partial.createdBy,
      createdAt: now,
      updatedAt: now,
    };

    const saved = await databaseService.saveMilestone(milestone);
    const normalized = normalizeMilestone(saved || milestone, databaseStatus.familyId || undefined);
    addFamilyMilestone(normalized);
  };

  const handleEditMilestone = async (id: string, updates: Partial<FamilyMilestone>) => {
    const existing = milestones.find((milestone) => milestone.id === id);
    const fallback = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    const saved = await databaseService.updateMilestone(id, updates);
    const normalized = normalizeMilestone(saved || fallback, databaseStatus.familyId || undefined);
    updateFamilyMilestone(id, normalized);
  };

  const handleDeleteMilestone = async (id: string) => {
    await databaseService.deleteMilestone(id);
    deleteFamilyMilestone(id);
  };

  let activeTabContent: JSX.Element;

  if (activeTab === 'timeline') {
    activeTabContent = (
      <div className="space-y-4">
        {milestonesError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {milestonesError}
          </div>
        )}
        {milestonesLoading && (
          <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
            Refreshing timeline…
          </div>
        )}
        <FamilyTimeline
          milestones={milestones}
          familyMembers={members}
          onAddMilestone={handleAddMilestone}
          onEditMilestone={handleEditMilestone}
          onDeleteMilestone={handleDeleteMilestone}
        />
      </div>
    );
  } else if (activeTab === 'analytics') {
    activeTabContent = (
      <FamilyAnalytics familyMembers={members} milestones={milestones} />
    );
  } else if (activeTab === 'access') {
    activeTabContent = (
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h3 className="text-lg font-semibold text-[#18221f] dark:text-slate-100">Household access</h3>
          <p className="mt-1 text-sm text-[#5f6a64] dark:text-slate-400">Each adult signs in with their own Google account. Child profiles do not sign in.</p>
        </div>
        {isOwner ? (
          <div className="divide-y divide-[#dde5e0] border-y border-[#dde5e0] dark:divide-slate-800 dark:border-slate-800">
            {accessMembers.filter((member) => member.ageGroup === 'Adult').map((member) => (
              <div key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div><p className="font-semibold">{member.name}</p><p className="text-xs text-slate-500">{member.userId ? 'Google account linked' : 'No account linked yet'}</p></div>
                {!member.userId && <button type="button" onClick={async () => {
                  if (!databaseStatus.familyId) return;
                  setAccessError('');
                  try {
                    const response = await fetch(`/api/families/${databaseStatus.familyId}/invites`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ memberId: member.id }) });
                    const body = await response.json();
                    if (!response.ok) throw new Error(body.error || 'Could not create invite.');
                    setInviteCode(body);
                  } catch (error) { setAccessError(error instanceof Error ? error.message : 'Could not create invite.'); }
                }} className="h-9 rounded-md border border-[#147c72] px-3 text-xs font-semibold text-[#147c72] hover:bg-[#eaf1e7]">Create one-use invite</button>}
              </div>
            ))}
            {accessMembers.filter((member) => member.ageGroup === 'Adult').length === 0 && <p className="py-4 text-sm text-slate-500">No adult profiles found.</p>}
          </div>
        ) : <p className="rounded-md border border-slate-200 bg-white p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">Only the household owner can issue adult account invites.</p>}
        {inviteCode && <div className="rounded-md border border-[#c6ddd1] bg-[#eef7f1] p-4 text-sm text-[#1d553f] dark:border-[#285e49] dark:bg-[#112d22] dark:text-[#b5e7cf]"><p className="font-semibold">Invite for {inviteCode.memberName}</p><p className="mt-2 font-mono text-lg tracking-wider">{inviteCode.code}</p><p className="mt-2 text-xs">Share this privately. It expires {new Date(inviteCode.expiresAt).toLocaleString('en-GB')} and can be used once.</p></div>}
        {accessError && <p className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{accessError}</p>}
      </div>
    );
  } else {
    activeTabContent = <FamilyDashboard />;
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-[#dde5e0] bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900 sm:px-4 sm:py-3">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-[#18221f] dark:text-slate-100 sm:text-lg">Family Management</h2>
            <p className="truncate text-xs text-[#5f6a64] dark:text-slate-400 sm:text-sm">Manage household profiles, timeline milestones, and shared context.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {activeTab === 'timeline' && (
              <button
                onClick={() => refetchMilestones()}
                className="rounded-md border border-gray-200 px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs text-gray-600 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 touch-manipulation"
              >
                Refresh
              </button>
            )}
          </div>
        </div>
        <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-xs sm:text-sm font-medium transition-colors touch-manipulation ${
                activeTab === tab.id
                  ? 'bg-[#147c72] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-3 sm:p-4 lg:p-6 dark:bg-slate-950">
        {activeTabContent}
      </div>
    </div>
  );
};
