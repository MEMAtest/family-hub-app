'use client';

import { useMemo, useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { pluralUnit } from '@/utils/staples';
import type { StockNoteItem } from '@/types/kitchen.types';

const DAY_MS = 86_400_000;

const runOut = (item: StockNoteItem, today: Date) => {
  if (item.status !== 'count' || item.quantity === null || !item.daysPerUnit) return null;
  const days = Math.floor(item.quantity * item.daysPerUnit);
  const date = new Date(today.getTime() + days * DAY_MS);
  return {
    days,
    date: date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
  };
};

const numberInput =
  'w-16 rounded-md border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

interface Props {
  items: StockNoteItem[];
  onSave: (items: StockNoteItem[]) => void;
  onCancel: () => void;
}

// Shows what the AI made of a stock note, with every number editable, before
// anything is saved. Estimates are labelled as such, with what they rest on.
export const StockNoteReview = ({ items: initial, onSave, onCancel }: Props) => {
  const [items, setItems] = useState(initial);
  const today = useMemo(() => new Date(), []);

  const edit = (index: number, patch: Partial<StockNoteItem>) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));

  const valid = items.length > 0 && items.every((item) =>
    item.status !== 'count' || (item.quantity !== null && item.quantity >= 0 && !!item.daysPerUnit && item.daysPerUnit > 0));

  return (
    <section aria-label="Check the stock note" className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm dark:border-emerald-500/30 dark:bg-slate-900">
      <h3 className="text-base font-semibold text-gray-900 dark:text-slate-100">Here&apos;s what I got. Check the numbers, then save.</h3>
      <ul className="mt-3 divide-y divide-gray-100 dark:divide-slate-800">
        {items.map((item, index) => {
          const outlook = runOut(item, today);
          return (
            <li key={`${item.name}-${index}`} className="py-3" data-testid="stock-note-item">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    {item.name}
                    {item.usual && item.usual !== item.name && <span className="ml-1 text-xs font-normal text-gray-500">(your “{item.usual}”)</span>}
                  </p>
                  {item.status !== 'count' && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {item.status === 'out' ? 'Out' : 'Running low'}, so it goes on Top-ups
                    </p>
                  )}
                </div>
                <button onClick={() => setItems((current) => current.filter((_, i) => i !== index))}
                  className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-red-600 dark:hover:bg-slate-800"
                  aria-label={`Leave out ${item.name}`}>
                  <X className="h-4 w-4" />
                </button>
              </div>

              {item.status === 'count' && (
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700 dark:text-slate-300">
                  <input type="number" min={0} step="any" inputMode="decimal" value={item.quantity ?? ''} className={numberInput}
                    aria-label={`How many ${item.name}`}
                    onChange={(e) => edit(index, { quantity: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })} />
                  <span>{pluralUnit(item.unit, item.quantity ?? 2)}</span>
                  <span className="text-gray-400">·</span>
                  <span>one lasts</span>
                  <input type="number" min={0.1} step="any" inputMode="decimal" value={item.daysPerUnit ?? ''} className={numberInput}
                    aria-label={`Days one ${item.unit} of ${item.name} lasts`}
                    onChange={(e) => edit(index, {
                      daysPerUnit: e.target.value === '' ? null : Math.max(0, Number(e.target.value)),
                      rateSource: 'stated',
                    })} />
                  <span>days</span>
                </div>
              )}

              {item.status === 'count' && item.unitContents && (
                <p className="mt-1 text-xs text-gray-600 dark:text-slate-400">Each {item.unit}: {item.unitContents}</p>
              )}
              {outlook && (
                <p className="mt-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">
                  Lasts about {outlook.days} day{outlook.days === 1 ? '' : 's'}: runs out around {outlook.date}
                </p>
              )}
              {item.status === 'count' && item.assumption && (
                <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                  {item.rateSource === 'estimated' && <span className="mr-1 rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600 dark:bg-slate-800 dark:text-slate-300">Estimate</span>}
                  {item.assumption}
                </p>
              )}
              {item.status === 'count' && item.question && item.rateSource === 'estimated' && (
                <p className="mt-1 flex items-start gap-1 text-xs text-blue-700 dark:text-blue-300">
                  <HelpCircle className="mt-0.5 h-3.5 w-3.5 flex-none" /> {item.question} Change the numbers above if you know.
                </p>
              )}
            </li>
          );
        })}
      </ul>
      {items.length === 0 && <p className="mt-2 text-sm text-gray-500">Nothing left to save.</p>}
      <div className="mt-3 flex gap-2">
        <button onClick={() => onSave(items)} disabled={!valid}
          className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
          <Check className="h-4 w-4" /> Save
        </button>
        <button onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800">
          Cancel
        </button>
      </div>
    </section>
  );
};
