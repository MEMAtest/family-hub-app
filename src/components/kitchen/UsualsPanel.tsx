'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Check, ChevronDown, ChevronUp, Plus, ShoppingBasket, Sparkles, X } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { useTopUpsList } from '@/hooks/useTopUpsList';
import {
  createStaple,
  createStarterStaples,
  flagStaple,
  recordPurchase,
  stapleStatus,
  STARTER_STAPLES,
} from '@/utils/staples';
import type { Staple, StapleCategory, StapleState } from '@/types/kitchen.types';

const CATEGORY_TITLES: Record<StapleCategory, string> = {
  food: 'Food',
  household: 'Household',
  toiletries: 'Toiletries',
  kids: 'Kids',
};

export const STATE_STYLES: Record<StapleState, string> = {
  out: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-200',
  low: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  due: 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200',
  soon: 'bg-yellow-50 text-yellow-800 dark:bg-yellow-500/10 dark:text-yellow-200',
  ok: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  untracked: 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-slate-400',
};

const smallButton =
  'rounded-md border px-2 py-1 text-xs font-medium transition-colors disabled:opacity-40';

export const UsualsPanel = () => {
  const staples = useFamilyStore((state) => state.kitchenStaples);
  const updateStaples = useFamilyStore((state) => state.updateKitchenStaples);
  const { addToTopUps, pendingNames } = useTopUpsList();
  const [showAll, setShowAll] = useState(false);
  const [newName, setNewName] = useState('');
  const today = useMemo(() => new Date(), [staples]); // eslint-disable-line react-hooks/exhaustive-deps

  const withStatus = useMemo(
    () => staples.map((staple) => ({ staple, status: stapleStatus(staple, today) })),
    [staples, today]
  );

  const change = (id: string, fn: (staple: Staple) => Staple) =>
    updateStaples((current) => current.map((staple) => (staple.id === id ? fn(staple) : staple)));

  // List first, then flag: see KitchenDashboard.markLow for why the order matters.
  const handleFlag = async (staple: Staple, flag: 'low' | 'out') => {
    const now = new Date();
    let added: string[] | null = null;
    try {
      added = await addToTopUps([{ name: staple.name, category: staple.category }]);
    } catch {
      added = null;
    }
    change(staple.id, (s) => ({ ...flagStaple(s, flag, now), onListAt: now.toISOString() }));
    if (added === null) toast.error(`${staple.name} marked ${flag}, but it couldn't be added to the shopping list`);
    else toast.success(added.length ? `${staple.name} added to Top-ups` : `${staple.name} marked ${flag}; it's already on Top-ups`);
  };

  const handleBought = (staple: Staple) => {
    change(staple.id, (s) => recordPurchase(s));
    toast.success(`Got it — ${staple.name} restocked`);
  };

  const handleRemove = (staple: Staple) => {
    if (!window.confirm(`Stop tracking ${staple.name}?`)) return;
    updateStaples((current) => current.filter((s) => s.id !== staple.id));
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    const staple = createStaple(name);
    if (staples.some((s) => s.id === staple.id)) {
      toast(`${name} is already one of your usuals`);
      return;
    }
    updateStaples((current) => [...current, staple]);
    setNewName('');
  };

  if (staples.length === 0) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
          <ShoppingBasket className="h-5 w-5 text-emerald-600" /> Your usuals
        </h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
          The things you buy again and again. The app learns how long each lasts and tells you before you run out.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => updateStaples((current) => (current.length ? current : createStarterStaples()))}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            <Sparkles className="h-4 w-4" />
            Start with {STARTER_STAPLES.length} suggestions
          </button>
          <span className="self-center text-xs text-gray-500 dark:text-slate-400">Picked for a family of four with young kids. Remove any you don&apos;t need.</span>
        </div>
      </section>
    );
  }

  const attention = withStatus.filter(({ status }) => ['out', 'low', 'due', 'soon'].includes(status.state));
  const byCategory = (Object.keys(CATEGORY_TITLES) as StapleCategory[])
    .map((category) => ({
      category,
      rows: withStatus
        .filter(({ staple }) => staple.category === category)
        .sort((a, b) => a.staple.name.localeCompare(b.staple.name)),
    }))
    .filter(({ rows }) => rows.length > 0);

  const Row = ({ staple, status }: (typeof withStatus)[number]) => {
    const onList = pendingNames.has(staple.name.toLowerCase());
    return (
      <li className="flex flex-wrap items-center gap-2 py-2">
        <span className="min-w-[8rem] flex-1 text-sm font-medium text-gray-900 dark:text-slate-100">{staple.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_STYLES[status.state]}`}>{status.label}</span>
        {onList && <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">On Top-ups</span>}
        <div className="ml-auto flex gap-1">
          <button onClick={() => void handleFlag(staple, 'low')} disabled={staple.flag === 'low'}
            className={`${smallButton} border-amber-200 text-amber-800 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-200`}
            aria-label={`${staple.name} running low`}>Low</button>
          <button onClick={() => void handleFlag(staple, 'out')} disabled={staple.flag === 'out'}
            className={`${smallButton} border-red-200 text-red-700 hover:bg-red-50 dark:border-red-500/40 dark:text-red-200`}
            aria-label={`Out of ${staple.name}`}>Out</button>
          <button onClick={() => handleBought(staple)}
            className={`${smallButton} border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300`}
            aria-label={`Bought ${staple.name}`}>
            <Check className="inline h-3 w-3" /> Bought
          </button>
          {showAll && (
            <button onClick={() => handleRemove(staple)} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-800" aria-label={`Stop tracking ${staple.name}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </li>
    );
  };

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
          <ShoppingBasket className="h-5 w-5 text-emerald-600" /> Your usuals
        </h3>
        <span className="text-xs text-gray-500 dark:text-slate-400">
          {attention.length ? `${attention.length} need attention` : 'All stocked up'}
        </span>
      </div>

      {attention.length > 0 ? (
        <ul className="mt-2 divide-y divide-gray-100 dark:divide-slate-800">
          {attention
            .sort((a, b) => (a.status.daysLeft ?? -1) - (b.status.daysLeft ?? -1))
            .map((entry) => <Row key={entry.staple.id} {...entry} />)}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-gray-500 dark:text-slate-400">Nothing is running low. Tap “Low” or “Out” on anything below when it is.</p>
      )}

      <button
        onClick={() => setShowAll((value) => !value)}
        className="mt-3 flex items-center gap-1 text-sm font-medium text-emerald-700 hover:text-emerald-800 dark:text-emerald-300"
        aria-expanded={showAll}
      >
        {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {showAll ? 'Hide all usuals' : `All ${staples.length} usuals`}
      </button>

      {showAll && (
        <div className="mt-2 space-y-4">
          {byCategory.map(({ category, rows }) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">{CATEGORY_TITLES[category]}</h4>
              <ul className="divide-y divide-gray-100 dark:divide-slate-800">
                {rows.map((entry) => <Row key={entry.staple.id} {...entry} />)}
              </ul>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
              placeholder="Add a usual, e.g. Nappies"
              aria-label="New usual"
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
            <button onClick={handleAdd} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700">
              <Plus className="h-4 w-4" /> Add
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
