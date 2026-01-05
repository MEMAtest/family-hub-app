'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { BudgetData } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';
import { createId } from '@/utils/id';
import databaseService from '@/services/databaseService';

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
  addEntry: (entry: BudgetFormState) => Promise<void> | void;
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
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formState, setFormStateInternal] = useState<BudgetFormState>(INITIAL_FORM_STATE);

  const setFormState = useCallback<BudgetContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const addEntry = useCallback(async (entry: BudgetFormState) => {
    const baseData: BudgetData = data ?? {
      income: { monthly: {}, oneTime: [] },
      expenses: { recurringMonthly: {}, oneTimeSpends: [] },
      priorMonths: {},
      budgetLimits: {},
      actualSpend: {},
    };

    const amount = parseFloat(entry.amount);
    if (Number.isNaN(amount)) {
      return;
    }

    const newItem = {
      id: createId('budget'),
      name: entry.name.trim() || 'Budget Item',
      amount,
      category: entry.category,
      person: entry.person,
      type: entry.type,
      date: new Date().toISOString(),
      isRecurring: entry.isRecurring,
    };

    let persistedId = newItem.id;
    const payload = {
      id: newItem.id,
      amount: newItem.amount,
      category: newItem.category,
      isRecurring: entry.isRecurring,
      paymentDate: newItem.date,
      personId: newItem.person || undefined,
    };

    if (familyId) {
      if (entry.type === 'income') {
        const savedIncome = await databaseService.saveBudgetIncome({
          ...payload,
          incomeName: newItem.name,
        });
        if (savedIncome?.id) {
          persistedId = savedIncome.id;
        }
      } else {
        const savedExpense = await databaseService.saveBudgetExpense({
          ...payload,
          expenseName: newItem.name,
          budgetLimit: undefined,
        });
        if (savedExpense?.id) {
          persistedId = savedExpense.id;
        }
      }
    } else {
      if (entry.type === 'income') {
        await databaseService.saveBudgetIncome({
          ...payload,
          incomeName: newItem.name,
        });
      } else {
        await databaseService.saveBudgetExpense({
          ...payload,
          expenseName: newItem.name,
          budgetLimit: undefined,
        });
      }
    }

    const storedEntry = {
      ...newItem,
      id: persistedId,
      paymentDate: newItem.date,
      incomeName: entry.type === 'income' ? newItem.name : undefined,
      expenseName: entry.type === 'expense' ? newItem.name : undefined,
    };

    if (entry.isRecurring) {
      if (entry.type === 'income') {
        setDataStore({
          ...baseData,
          income: {
            ...baseData.income,
            monthly: {
              ...baseData.income.monthly,
              [persistedId]: storedEntry,
            },
          },
        });
      } else {
        setDataStore({
          ...baseData,
          expenses: {
            ...baseData.expenses,
            recurringMonthly: {
              ...baseData.expenses.recurringMonthly,
              [persistedId]: storedEntry,
            },
          },
        });
      }
    } else if (entry.type === 'income') {
      setDataStore({
        ...baseData,
        income: {
          ...baseData.income,
          oneTime: [...(baseData.income.oneTime || []), storedEntry],
        },
      });
    } else {
      setDataStore({
        ...baseData,
        expenses: {
          ...baseData.expenses,
          oneTimeSpends: [...(baseData.expenses.oneTimeSpends || []), storedEntry],
        },
      });
    }

    setFormStateInternal(INITIAL_FORM_STATE);
    setIsFormOpen(false);
  }, [data, familyId, setDataStore]);

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
