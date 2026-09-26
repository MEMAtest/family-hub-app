'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, History, Loader2, UtensilsCrossed } from 'lucide-react';
import { localDateKey, type LoggedMeal, type useMealLog } from '@/hooks/useMealLog';

const dayLabel = (dateKey: string, todayKey: string) => {
  if (dateKey === todayKey) return 'Today';
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' });
};

const daysBackOptions = (todayKey: string) => {
  const today = new Date(`${todayKey}T12:00:00`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - index);
    const key = localDateKey(date);
    return {
      key,
      label: index === 0 ? 'Tonight' : index === 1 ? 'Yesterday' : date.toLocaleDateString('en-GB', { weekday: 'long' }),
    };
  });
};

type MealLog = ReturnType<typeof useMealLog>;

const MealList = ({ meals, todayKey, empty }: { meals: LoggedMeal[]; todayKey: string; empty: string }) =>
  meals.length === 0 ? (
    <p className="text-sm text-gray-500 dark:text-slate-400">{empty}</p>
  ) : (
    <ul className="space-y-1">
      {meals.map((meal) => (
        <li key={meal.id} className="flex gap-3 text-sm">
          <span className="w-12 flex-shrink-0 font-medium text-emerald-700 dark:text-emerald-300">{dayLabel(meal.dateKey, todayKey)}</span>
          <span className="text-gray-800 dark:text-slate-200">{meal.name}</span>
        </li>
      ))}
    </ul>
  );

export const MealLogPanel = ({ log }: { log: MealLog }) => {
  const [name, setName] = useState('');
  const [day, setDay] = useState(log.todayKey);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    const ok = await log.logMade(name, day);
    setSaving(false);
    if (ok) {
      toast.success('Added to what you made');
      setName('');
      setDay(log.todayKey);
    } else {
      toast.error("Couldn't save that. Check you're online and signed in.");
    }
  };

  const confirm = async (meal: LoggedMeal) => {
    if (await log.markMade(meal.id)) toast.success(`${meal.name} ticked off`);
    else toast.error("Couldn't update that meal");
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
        <UtensilsCrossed className="h-5 w-5 text-emerald-600" /> What you&apos;ve made this week
      </h3>

      {!log.connected ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Sign in to your household to keep a meal log.</p>
      ) : log.loading ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
      ) : (
        <div className="mt-3 space-y-4">
          <MealList meals={log.madeThisWeek} todayKey={log.todayKey} empty="Nothing logged yet this week." />

          {log.toConfirm.length > 0 && (
            <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-500/10">
              <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">Did you make these?</h4>
              <ul className="mt-1 space-y-1">
                {log.toConfirm.map((meal) => (
                  <li key={meal.id} className="flex items-center justify-between gap-2 text-sm text-emerald-900 dark:text-emerald-100">
                    <span>{dayLabel(meal.dateKey, log.todayKey)} · {meal.name}</span>
                    <button onClick={() => void confirm(meal)} className="flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700" aria-label={`We made ${meal.name}`}>
                      <Check className="h-3 w-3" /> Made it
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void save(); }}
              placeholder="What did you make? e.g. Jollof rice and chicken"
              aria-label="Meal you made"
              maxLength={120}
              className="min-w-[12rem] flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <select value={day} onChange={(e) => setDay(e.target.value)} aria-label="When"
              className="rounded-lg border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100">
              {daysBackOptions(log.todayKey).map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
            <button onClick={() => void save()} disabled={!name.trim() || saving}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
              Log it
            </button>
          </div>

          <div className="border-t border-gray-100 pt-3 dark:border-slate-800">
            <h4 className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-gray-700 dark:text-slate-300">
              <History className="h-4 w-4" /> Last week
            </h4>
            <MealList meals={log.madeLastWeek} todayKey={log.todayKey} empty="Nothing was logged last week." />
          </div>
        </div>
      )}
    </section>
  );
};
