'use client'

import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
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

  const [isMealFormOpen, setIsMealFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formState, setFormStateInternal] = useState<MealFormState>(INITIAL_MEAL_FORM);

  const setFormState = useCallback<MealsContextValue['setFormState']>((updater) => {
    setFormStateInternal((prev) => (typeof updater === 'function' ? (updater as any)(prev) : updater));
  }, []);

  const openMealForm = useCallback((date: string) => {
    setSelectedDate(date);
    setIsMealFormOpen(true);
  }, []);

  const closeMealForm = useCallback(() => {
    setIsMealFormOpen(false);
    setSelectedDate(null);
    setFormStateInternal(INITIAL_MEAL_FORM);
  }, []);

  const saveMeal = useCallback(() => {
    if (!mealPlanning || !selectedDate) return;

    const calories = parseInt(formState.calories, 10) || 0;
    const plannedMeal = {
      ...formState,
      name: `${formState.protein} with ${formState.carb}`,
      calories,
    };

    setMealPlanningStore({
      ...mealPlanning,
      planned: {
        ...mealPlanning.planned,
        [selectedDate]: plannedMeal,
      },
    });

    closeMealForm();
  }, [closeMealForm, formState, mealPlanning, selectedDate, setMealPlanningStore]);

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
