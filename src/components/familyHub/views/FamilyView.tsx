'use client'

import { useState } from 'react';
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
        {milestonesLoading ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Loading timeline…
          </div>
        ) : (
          <FamilyTimeline
            milestones={milestones}
            familyMembers={members}
            onAddMilestone={handleAddMilestone}
            onEditMilestone={handleEditMilestone}
            onDeleteMilestone={handleDeleteMilestone}
          />
        )}
      </div>
    );
  } else if (activeTab === 'analytics') {
    activeTabContent = (
      <FamilyAnalytics familyMembers={members} milestones={milestones} />
    );
  } else {
    activeTabContent = <FamilyDashboard />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Family Management</h2>
            <p className="text-sm text-gray-500">Manage members, timeline milestones, and engagement.</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'timeline' && (
              <button
                onClick={() => refetchMilestones()}
                className="rounded-md border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50"
              >
                Refresh timeline
              </button>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 lg:p-6">
        {activeTabContent}
      </div>
    </div>
  );
};
