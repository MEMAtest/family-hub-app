'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import databaseService from '@/services/databaseService';
import { useFamilyStore } from '@/store/familyStore';

export interface LoggedMeal {
  id: string;
  name: string;
  dateKey: string; // YYYY-MM-DD, local
  made: boolean;
}

export const localDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const mondayOfLocal = (date: Date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

// Meals made this week and last week, read from the meals table (the store
// only keeps one meal per day). Logging "we made X" creates a meal marked eaten.
export const useMealLog = () => {
  const connected = useFamilyStore((state) => state.databaseStatus.connected);
  const [meals, setMeals] = useState<LoggedMeal[]>([]);
  const [loading, setLoading] = useState(true);

  const today = useMemo(() => new Date(), []);
  const thisMonday = mondayOfLocal(today);
  const lastMonday = addDays(thisMonday, -7);
  const thisWeekStart = localDateKey(thisMonday);
  const lastWeekStart = localDateKey(lastMonday);
  const todayKey = localDateKey(today);

  const rangeEnd = localDateKey(addDays(thisMonday, 7));

  const reload = useCallback(async () => {
    if (!connected) {
      setLoading(false);
      return;
    }
    const rows = await databaseService.getMeals(lastWeekStart, rangeEnd);
    setMeals(rows
      .map((row: any) => ({
        id: String(row.id),
        name: String(row.mealName ?? row.name ?? 'Meal'),
        dateKey: localDateKey(new Date(row.mealDate)),
        made: Boolean(row.isEaten),
      }))
      .sort((a: LoggedMeal, b: LoggedMeal) => a.dateKey.localeCompare(b.dateKey)));
    setLoading(false);
  }, [connected, lastWeekStart, rangeEnd]);

  useEffect(() => { void reload(); }, [reload]);

  const create = useCallback(async (name: string, dateKey: string, made: boolean) => {
    const meal = await databaseService.createMeal({ mealDate: new Date(`${dateKey}T12:00:00`).toISOString(), mealName: name.trim() });
    if (!meal?.id) return false;
    if (made && !(await databaseService.markMealAsEaten(meal.id, true))) return false;
    await reload();
    return true;
  }, [reload]);

  const markMade = useCallback(async (id: string) => {
    const ok = await databaseService.markMealAsEaten(id, true);
    if (ok) setMeals((current) => current.map((meal) => (meal.id === id ? { ...meal, made: true } : meal)));
    return ok;
  }, []);

  const thisWeek = meals.filter((meal) => meal.dateKey >= thisWeekStart);
  const lastWeek = meals.filter((meal) => meal.dateKey >= lastWeekStart && meal.dateKey < thisWeekStart);

  return {
    loading,
    connected,
    todayKey,
    thisWeekStart,
    madeThisWeek: thisWeek.filter((meal) => meal.made),
    // Planned for a day that has already come but not ticked off yet
    toConfirm: thisWeek.filter((meal) => !meal.made && meal.dateKey <= todayKey),
    madeLastWeek: lastWeek.filter((meal) => meal.made),
    logMade: (name: string, dateKey: string) => create(name, dateKey, true),
    planTonight: (name: string) => create(name, todayKey, false),
    markMade,
  };
};
