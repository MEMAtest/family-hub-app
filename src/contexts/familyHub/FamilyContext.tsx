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
  dateOfBirth: string;
  avatarUrl: string;
}

interface FamilyContextValue {
  members: FamilyMember[];
  addMember: (member: FamilyMember) => void;
  updateMember: (id: string, updates: Partial<FamilyMember>) => void;
  deleteMember: (id: string) => Promise<void> | void;
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
  dateOfBirth: '',
  avatarUrl: '',
};

const getAgeFromDob = (dateOfBirth?: string) => {
  if (!dateOfBirth) return null;
  const parsed = new Date(dateOfBirth);
  if (Number.isNaN(parsed.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - parsed.getFullYear();
  const monthDiff = today.getMonth() - parsed.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < parsed.getDate())) {
    age -= 1;
  }
  return age;
};

const getAgeGroupFromDob = (dateOfBirth?: string): FamilyAgeGroup | null => {
  const age = getAgeFromDob(dateOfBirth);
  if (age === null) return null;
  if (age < 4) return 'Toddler';
  if (age < 6) return 'Preschool';
  if (age < 13) return 'Child';
  if (age < 18) return 'Teen';
  return 'Adult';
};

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined);

export const FamilyProvider = ({ children }: PropsWithChildren) => {
  const members = useFamilyStore((state) => state.people as FamilyMember[]);
  const addMemberStore = useFamilyStore((state) => state.addPerson as (member: FamilyMember) => void);
  const updateMemberStore = useFamilyStore((state) => state.updatePerson as (id: string, updates: Partial<FamilyMember>) => void);
  const deleteMemberStore = useFamilyStore((state) => state.deletePerson);
  const setMembersStore = useFamilyStore((state) => state.setPeople as (people: FamilyMember[]) => void);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);

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
        dateOfBirth: member.dateOfBirth || '',
        avatarUrl: member.avatarUrl || '',
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
    const derivedAgeGroup = getAgeGroupFromDob(formState.dateOfBirth);
    const ageGroup = derivedAgeGroup ?? formState.ageGroup;
    const fitnessGoals = ageGroup === 'Adult'
      ? { steps: 8000, workouts: 3 }
      : { activeHours: 2, activities: 4 };

    return {
      id: editingMember?.id ?? createId('member'),
      familyId: editingMember?.familyId ?? familyId ?? 'local-family',
      name: formState.name,
      role: formState.role,
      ageGroup,
      dateOfBirth: formState.dateOfBirth || undefined,
      age: getAgeFromDob(formState.dateOfBirth) ?? undefined,
      avatarUrl: formState.avatarUrl || undefined,
      color: formState.color,
      icon: formState.icon,
      fitnessGoals,
      createdAt: editingMember?.createdAt ?? now,
      updatedAt: now,
    };
  }, [editingMember, familyId, formState]);

  const saveMember = useCallback(async () => {
    const member = createMemberFromForm();

    if (editingMember) {
      const savedMember = await databaseService.updateMember(member.id, {
        name: member.name,
        role: member.role,
        ageGroup: member.ageGroup,
        dateOfBirth: member.dateOfBirth,
        avatarUrl: member.avatarUrl,
        color: member.color,
        icon: member.icon,
        fitnessGoals: member.fitnessGoals,
      } as any);

      updateMemberStore(member.id, {
        ...member,
        updatedAt: member.updatedAt,
        ...(savedMember ? {
          name: (savedMember as any).name ?? member.name,
          color: (savedMember as any).color ?? member.color,
          icon: (savedMember as any).icon ?? member.icon,
          ageGroup: (savedMember as any).ageGroup ?? member.ageGroup,
          dateOfBirth: (savedMember as any).dateOfBirth ?? member.dateOfBirth,
          avatarUrl: (savedMember as any).avatarUrl ?? member.avatarUrl,
          role: (savedMember as any).role ?? member.role,
        } : {}),
      });
    } else {
      const savedMember = await databaseService.saveMember({
        id: member.id,
        name: member.name,
        role: member.role,
        ageGroup: member.ageGroup,
        dateOfBirth: member.dateOfBirth,
        avatarUrl: member.avatarUrl,
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
        dateOfBirth: (savedMember as Record<string, any> | undefined)?.dateOfBirth ?? member.dateOfBirth,
        avatarUrl: (savedMember as Record<string, any> | undefined)?.avatarUrl ?? member.avatarUrl,
      };

      addMemberStore(persistedMember);
    }

    closeForm();
  }, [addMemberStore, closeForm, createMemberFromForm, editingMember, updateMemberStore]);

  const deleteMember = useCallback(async (id: string) => {
    await databaseService.deleteMember(id);
    deleteMemberStore(id);
  }, [deleteMemberStore]);

  const value = useMemo<FamilyContextValue>(() => ({
    members,
    addMember: addMemberStore,
    updateMember: updateMemberStore,
    deleteMember,
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
    deleteMember,
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
