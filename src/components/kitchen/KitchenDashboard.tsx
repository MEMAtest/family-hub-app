'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Mail, Mic, MicOff, Refrigerator, ShoppingCart } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { useTopUpsList, TOP_UPS_LIST_NAME } from '@/hooks/useTopUpsList';
import { useSpeechInput } from '@/hooks/useSpeechInput';
import { useMealLog } from '@/hooks/useMealLog';
import { createStaple, flagStaple, matchStaple, parseLowNote, recordPurchase } from '@/utils/staples';
import { SharedSyncBadge } from '@/components/common/SharedSyncBadge';
import { MondayEmailSettingsModal } from '@/components/common/MondayEmailSettingsModal';
import { UsualsPanel } from './UsualsPanel';
import { FridgeCheckPanel } from './FridgeCheckPanel';
import { ReceiptRestockPanel } from './ReceiptRestockPanel';
import { MealLogPanel } from './MealLogPanel';
import type { Staple } from '@/types/kitchen.types';

const QUICK_PICKS = ['Milk', 'Bread', 'Eggs', 'Toilet roll', 'Tissues', 'Yakult'];

export const KitchenDashboard = () => {
  const staples = useFamilyStore((state) => state.kitchenStaples);
  const updateStaples = useFamilyStore((state) => state.updateKitchenStaples);
  const { list, addToTopUps, tickedNames } = useTopUpsList();
  const mealLog = useMealLog();
  const [note, setNote] = useState('');
  const [showEmailSettings, setShowEmailSettings] = useState(false);
  const speech = useSpeechInput((transcript) => setNote((current) => (current ? `${current}, ${transcript}` : transcript)));

  // Ticking a usual off the Top-ups list while shopping counts as buying it.
  useEffect(() => {
    const bought = staples.filter((staple) => staple.onListAt && tickedNames.has(staple.name.toLowerCase()));
    if (bought.length === 0) return;
    const ids = new Set(bought.map((staple) => staple.id));
    updateStaples((current) => current.map((staple) => (ids.has(staple.id) ? recordPurchase(staple) : staple)));
  }, [staples, tickedNames, updateStaples]);

  const pendingCount = useMemo(
    () => (list?.items || []).filter((item: any) => !item.completed).length,
    [list]
  );

  const markLow = async (text: string) => {
    const notes = parseLowNote(text);
    if (notes.length === 0) return;
    speech.stop();
    const now = new Date();
    const current = useFamilyStore.getState().kitchenStaples;
    const touched: Staple[] = [];
    const created: Staple[] = [];

    for (const entry of notes) {
      const existing = matchStaple(entry.name, [...current, ...created]);
      const base = existing ?? createStaple(entry.name, {}, now);
      if (!existing) created.push(base);
      touched.push({ ...flagStaple(base, entry.flag, now), onListAt: now.toISOString() });
    }

    setNote('');

    // Update the list before flagging: a stale ticked-off entry for the same
    // thing must be gone before the "ticked means bought" check can see the flag.
    let listOk = true;
    try {
      await addToTopUps(touched.map((staple) => ({ name: staple.name, category: staple.category })));
    } catch {
      listOk = false;
    }

    const touchedIds = new Map(touched.map((staple) => [staple.id, staple]));
    updateStaples((all) => [
      ...all.map((staple) => touchedIds.get(staple.id) ?? staple),
      ...touched.filter((staple) => !all.some((s) => s.id === staple.id)),
    ]);

    if (listOk) toast.success(`${touched.map((s) => s.name).join(', ')} added to ${TOP_UPS_LIST_NAME}`);
    else toast.error('Marked as low, but the shopping list could not be updated');
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <section className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-bold"><Refrigerator className="h-6 w-6" /> Kitchen</h2>
            <p className="mt-1 text-sm text-emerald-50">Know what you&apos;ve got, what&apos;s running out, and what you&apos;ve been cooking.</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <SharedSyncBadge />
            {list && (
              <span className="flex items-center gap-1 text-xs text-emerald-50">
                <ShoppingCart className="h-3.5 w-3.5" /> {pendingCount} on {TOP_UPS_LIST_NAME}
              </span>
            )}
            <button onClick={() => setShowEmailSettings(true)} className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-xs font-medium hover:bg-white/30">
              <Mail className="h-3.5 w-3.5" /> Monday email
            </button>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-white/15 p-3">
          <label htmlFor="low-note" className="text-sm font-semibold">Running low on something?</label>
          <div className="mt-2 flex gap-2">
            <input
              id="low-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void markLow(note); }}
              placeholder="e.g. out of tissues, low on eggs"
              className="min-w-0 flex-1 rounded-lg border-0 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400"
            />
            {speech.supported && (
              <button
                onClick={speech.toggle}
                className={`rounded-lg p-2.5 ${speech.listening ? 'animate-pulse bg-red-500' : 'bg-white/20 hover:bg-white/30'}`}
                aria-label={speech.listening ? 'Stop listening' : 'Say what you are low on'}
              >
                {speech.listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
            )}
            <button
              onClick={() => void markLow(note)}
              disabled={!note.trim()}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
            >
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_PICKS.map((pick) => (
              <button
                key={pick}
                onClick={() => void markLow(pick)}
                className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium hover:bg-white/30"
                aria-label={`Low on ${pick}`}
              >
                {pick}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <UsualsPanel />
          <ReceiptRestockPanel />
        </div>
        <div className="space-y-4">
          <FridgeCheckPanel
            onPlanMeal={async (name) => {
              if (await mealLog.planTonight(name)) toast.success(`${name} planned for tonight`);
              else toast.error("Couldn't add that to tonight's meal plan");
            }}
          />
          <MealLogPanel log={mealLog} />
        </div>
      </div>

      {showEmailSettings && <MondayEmailSettingsModal onClose={() => setShowEmailSettings(false)} />}
    </div>
  );
};

export default KitchenDashboard;
