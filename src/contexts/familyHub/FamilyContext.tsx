'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { FamilyMember } from '@/types';
import { useFamilyStore } from '@/store/familyStore';
import { colorOptions, iconOptions } from '@/data/initialData';
import { createId } from '@/utils/id';
import databaseService from '@/services/databaseService';

export type FamilyRoleOption = 'Parent' | 'Student' | 'Family Member';
export type FamilyAgeGroup = 'Toddler' | 'Preschool' | 'Child' | 'Teen' | 'Adult';

export interface FamilyFormState {
  name: string;
  color: string;
  icon: string;
  role: FamilyRoleOption;
  ageGroup: FamilyAgeGroup;
}

interface FamilyContextValue {
  members: FamilyMember[];
  addMember: (member: FamilyMember) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => void;
  setMembers: (members: FamilyMember[]) => void;
  isFormOpen: boolean;
  openForm: (member?: FamilyMember) => void;
  closeForm: () => void;
  editingMember: FamilyMember | null;
  formState: FamilyFormState;
  setFormState: (updater: FamilyFormState | ((prev: FamilyFormState) => FamilyFormState)) => void;
  saveMember: () => Promise<void>;
}

const DEFAULT_FORM_STATE: FamilyFormState = {
  name: '',
  color: colorOptions[0],
  icon: iconOptions[0],
  role: 'Family Member',
  ageGroup: 'Adult',
};

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export const FamilyProvider = ({ children }: PropsWithChildren) => {
  const members = useFamilyStore((state) => state.people as FamilyMember[]);
  const addMemberStore = useFamilyStore((state) => state.addPerson as (member: FamilyMember) => void);
  const updateMemberStore = useFamilyStore((state) => state.updatePerson as (id: string, updates: Partial<FamilyMember>) => void);
  const deleteMemberStore = useFamilyStore((state) => state.deletePerson);
  const setMembersStore = useFamilyStore((state) => state.setPeople as (people: FamilyMember[]) => void);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [formState, setFormStateInternal] = useState<FamilyFormState>(DEFAULT_FORM_STATE);

  const setFormState = useCallback<FamilyContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const openForm = useCallback((member?: FamilyMember) => {
    if (member) {
      setEditingMember(member);
      setFormStateInternal({
        name: member.name,
        color: member.color,
        icon: member.icon,
        role: member.role,
        ageGroup: member.ageGroup,
      });
    } else {
      setEditingMember(null);
      setFormStateInternal(DEFAULT_FORM_STATE);
    }
    setIsFormOpen(true);
  }, []);

  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setEditingMember(null);
    setFormStateInternal(DEFAULT_FORM_STATE);
  }, []);

  const createMemberFromForm = useCallback((): FamilyMember => {
    const now = new Date().toISOString();
    const fitnessGoals = formState.ageGroup === 'Adult'
      ? { steps: 8000, workouts: 3 }
      : { activeHours: 2, activities: 4 };

    return {
      id: editingMember?.id ?? createId('member'),
      familyId: editingMember?.familyId ?? 'local-family',
      name: formState.name,
      role: formState.role,
      ageGroup: formState.ageGroup,
      color: formState.color,
      icon: formState.icon,
      fitnessGoals,
      createdAt: editingMember?.createdAt ?? now,
      updatedAt: now,
    };
  }, [editingMember, formState]);

  const saveMember = useCallback(async () => {
    const member = createMemberFromForm();

    if (editingMember) {
      updateMemberStore(member.id, { ...member, updatedAt: member.updatedAt });
    } else {
      const savedMember = await databaseService.saveMember({
        id: member.id,
        name: member.name,
        role: member.role,
        age: member.ageGroup,
        color: member.color,
        icon: member.icon,
        fitnessGoals: member.fitnessGoals,
      } as any);

      const persistedMember: FamilyMember = {
        ...member,
        id: savedMember?.id ?? member.id,
        name: savedMember?.name ?? member.name,
        color: (savedMember as Record<string, any> | undefined)?.color ?? member.color,
        icon: (savedMember as Record<string, any> | undefined)?.icon ?? member.icon,
      };

      addMemberStore(persistedMember);
    }

    closeForm();
  }, [addMemberStore, closeForm, createMemberFromForm, editingMember, updateMemberStore]);

  const value = useMemo<FamilyContextValue>(() => ({
    members,
    addMember: addMemberStore,
    updateMember: updateMemberStore,
    deleteMember: deleteMemberStore,
    setMembers: setMembersStore,
    isFormOpen,
    openForm,
    closeForm,
    editingMember,
    formState,
    setFormState,
    saveMember,
  }), [
    addMemberStore,
    closeForm,
    deleteMemberStore,
    editingMember,
    formState,
    isFormOpen,
    members,
    openForm,
    saveMember,
    setFormState,
    setMembersStore,
    updateMemberStore,
  ]);

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
};

export const useFamilyContext = () => {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamilyContext must be used within a FamilyProvider');
  }
  return context;
};
