'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { MealPlanning } from '@/store/familyStore';
import { useFamilyStore } from '@/store/familyStore';

export interface MealFormState {
  protein: string;
  carb: string;
  veg: string;
  calories: string;
  notes: string;
}

interface MealsContextValue {
  mealPlanning: MealPlanning | null;
  setMealPlanning: (data: MealPlanning) => void;
  updateMealPlanning: (updates: Partial<MealPlanning>) => void;
  isMealFormOpen: boolean;
  openMealForm: (date: string) => void;
  closeMealForm: () => void;
  selectedDate: string | null;
  formState: MealFormState;
  setFormState: (updater: MealFormState | ((prev: MealFormState) => MealFormState)) => void;
  saveMeal: () => void;
}

const INITIAL_MEAL_FORM: MealFormState = {
  protein: '',
  carb: '',
  veg: '',
  calories: '',
  notes: '',
};

const MealsContext = createContext<MealsContextValue | undefined>(undefined);

export const MealsProvider = ({ children }: PropsWithChildren) => {
  const mealPlanning = useFamilyStore((state) => state.mealPlanning);
  const setMealPlanningStore = useFamilyStore((state) => state.setMealPlanning);
  const updateMealPlanningStore = useFamilyStore((state) => state.updateMealPlanning);
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);

  const [isMealFormOpen, setIsMealFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formState, setFormStateInternal] = useState<MealFormState>(INITIAL_MEAL_FORM);

  const setFormState = useCallback<MealsContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!mealPlanning) {
      localStorage.removeItem('mealPlanning');
      return;
    }
    try {
      localStorage.setItem('mealPlanning', JSON.stringify(mealPlanning));
    } catch (error) {
      console.warn('Failed to persist meal planning cache', error);
    }
  }, [mealPlanning]);

  const openMealForm = useCallback((date: string) => {
    setSelectedDate(date);
    setIsMealFormOpen(true);
  }, []);

  const closeMealForm = useCallback(() => {
    setIsMealFormOpen(false);
    setSelectedDate(null);
    setFormStateInternal(INITIAL_MEAL_FORM);
  }, []);

  const buildUpdatedPlanning = useCallback((base: MealPlanning | null, dateKey: string, entry: any, isEaten = false): MealPlanning => {
    const template: MealPlanning = base ? {
      planned: { ...base.planned },
      eaten: { ...base.eaten },
      components: base.components,
      favorites: base.favorites,
    } : {
      planned: {},
      eaten: {},
      components: {
        proteins: [],
        grains: [],
        carbs: [],
        vegetables: [],
      },
      favorites: [],
    };

    if (isEaten) {
      delete template.planned[dateKey];
      template.eaten[dateKey] = entry;
    } else {
      template.planned[dateKey] = entry;
    }

    return template;
  }, []);

  const transformMealRecord = useCallback((record: any) => ({
    id: record.id,
    name: record.mealName,
    protein: record.proteinSource || '',
    carb: record.carbohydrateSource || '',
    veg: record.vegetableSource || '',
    calories: record.estimatedCalories || 0,
    notes: record.mealNotes || '',
    eaten: Boolean(record.isEaten),
  }), []);

  const saveMeal = useCallback(async () => {
    if (!selectedDate) return;

    const calories = parseInt(formState.calories, 10) || 0;
    const localEntry = {
      id: `meal-${selectedDate}`,
      name: `${formState.protein} with ${formState.carb}`.trim() || formState.protein || formState.carb || 'Meal',
      protein: formState.protein,
      carb: formState.carb,
      veg: formState.veg,
      calories,
      notes: formState.notes,
      eaten: false,
    };

    const applyUpdate = (entry: any, eaten = false) => {
      const current = useFamilyStore.getState().mealPlanning;
      const next = buildUpdatedPlanning(current, selectedDate, entry, eaten);
      setMealPlanningStore(next);
    };

    if (familyId) {
      try {
        const response = await fetch(`/api/families/${familyId}/meals`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mealDate: selectedDate,
            mealName: localEntry.name,
            proteinSource: formState.protein,
            carbohydrateSource: formState.carb,
            vegetableSource: formState.veg,
            estimatedCalories: calories || null,
            mealNotes: formState.notes,
          }),
        });

        if (!response.ok) {
          throw new Error(`Meal save failed with status ${response.status}`);
        }

        const saved = await response.json();
        const entry = transformMealRecord(saved);
        applyUpdate(entry, entry.eaten);
        closeMealForm();
        return;
      } catch (error) {
        console.error('Failed to persist meal. Falling back to local state.', error);
      }
    }

    applyUpdate(localEntry, false);
    closeMealForm();
  }, [buildUpdatedPlanning, closeMealForm, familyId, formState, selectedDate, setMealPlanningStore, transformMealRecord]);

  const value = useMemo<MealsContextValue>(() => ({
    mealPlanning,
    setMealPlanning: setMealPlanningStore,
    updateMealPlanning: updateMealPlanningStore,
    isMealFormOpen,
    openMealForm,
    closeMealForm,
    selectedDate,
    formState,
    setFormState,
    saveMeal,
  }), [
    closeMealForm,
    formState,
    isMealFormOpen,
    mealPlanning,
    openMealForm,
    saveMeal,
    selectedDate,
    setFormState,
    setMealPlanningStore,
    updateMealPlanningStore,
  ]);

  return (
    <MealsContext.Provider value={value}>
      {children}
    </MealsContext.Provider>
  );
};

export const useMealsContext = () => {
  const context = useContext(MealsContext);
  if (!context) {
    throw new Error('useMealsContext must be used within a MealsProvider');
  }
  return context;
};
