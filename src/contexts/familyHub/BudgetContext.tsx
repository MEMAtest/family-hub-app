'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { BudgetData } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';

export type BudgetEntryType = 'income' | 'expense';

export interface BudgetFormState {
  name: string;
  amount: string;
  category: string;
  isRecurring: boolean;
  person: string;
  type: BudgetEntryType;
}

interface BudgetContextValue {
  data: BudgetData | null;
  setData: (data: BudgetData | null) => void;
  updateData: (updates: Partial<BudgetData>) => void;
  addEntry: (entry: BudgetFormState) => void;
  isFormOpen: boolean;
  openForm: () => void;
  closeForm: () => void;
  formState: BudgetFormState;
  setFormState: (updater: BudgetFormState | ((prev: BudgetFormState) => BudgetFormState)) => void;
}

const INITIAL_FORM_STATE: BudgetFormState = {
  name: '',
  amount: '',
  category: 'Miscellaneous',
  isRecurring: true,
  person: '',
  type: 'expense',
};

const BudgetContext = createContext<BudgetContextValue | undefined>(undefined);

export const BudgetProvider = ({ children }: PropsWithChildren) => {
  const data = useFamilyStore((state) => state.budgetData);
  const setDataStore = useFamilyStore((state) => state.setBudgetData);
  const updateDataStore = useFamilyStore((state) => state.updateBudgetData);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormStateInternal] = useState<BudgetFormState>(INITIAL_FORM_STATE);

  const setFormState = useCallback<BudgetContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const addEntry = useCallback((entry: BudgetFormState) => {
    if (!data) return;

    const amount = parseFloat(entry.amount);
    if (Number.isNaN(amount)) {
      return;
    }

    const newItem = {
      id: createId('budget'),
      name: entry.name,
      amount,
      category: entry.category,
      person: entry.person,
      type: entry.type,
      date: new Date().toISOString(),
    };

    if (entry.isRecurring) {
      const section = entry.type === 'income' ? 'income' : 'expenses';
      const category = entry.type === 'income' ? 'monthly' : 'recurringMonthly';
      const key = entry.category.toLowerCase().replace(/\s+/g, '_');

      setDataStore({
        ...data,
        [section]: {
          ...data[section],
          [category]: {
            ...(data as any)[section]?.[category],
            [key]: {
              ...(data as any)[section]?.[category]?.[key],
              [newItem.id]: {
                name: newItem.name,
                amount: newItem.amount,
                category: newItem.category,
                person: newItem.person,
                type: newItem.type,
              },
            },
          },
        },
      });
    } else {
      const section = entry.type === 'income' ? 'income' : 'expenses';
      const listName = entry.type === 'income' ? 'oneTime' : 'oneTimeSpends';
      const existingList = ((data as any)[section]?.[listName] ?? []) as any[];

      setDataStore({
        ...data,
        [section]: {
          ...data[section],
          [listName]: [...existingList, newItem],
        },
      });
    }

    setFormStateInternal(INITIAL_FORM_STATE);
    setIsFormOpen(false);
  }, [data, setDataStore]);

  const openForm = useCallback(() => setIsFormOpen(true), []);
  const closeForm = useCallback(() => {
    setIsFormOpen(false);
    setFormStateInternal(INITIAL_FORM_STATE);
  }, []);

  const value = useMemo<BudgetContextValue>(() => ({
    data,
    setData: setDataStore,
    updateData: updateDataStore,
    addEntry,
    isFormOpen,
    openForm,
    closeForm,
    formState,
    setFormState,
  }), [
    addEntry,
    closeForm,
    data,
    formState,
    isFormOpen,
    openForm,
    setDataStore,
    setFormState,
    updateDataStore,
  ]);

  return (
    <BudgetContext.Provider value={value}>
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudgetContext = () => {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudgetContext must be used within a BudgetProvider');
  }
  return context;
};
