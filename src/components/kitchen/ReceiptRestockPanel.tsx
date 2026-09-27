'use client';

import { useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Loader2, Receipt } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { uploadKitchenPhoto, PhotoReadError } from '@/services/kitchenPhotoService';
import { createStaple, matchStaple, pluralUnit, recordPurchase } from '@/utils/staples';
import type { Staple } from '@/types/kitchen.types';
import { inferCategoryFromDescription } from '@/utils/statementImport';
import type { ReceiptReply } from '@/lib/kitchenVision';

interface ReviewLine {
  key: string;
  name: string;
  quantity: number;
  units: number | null; // what it adds to counted stock, in the usual's unit
  stapleId: string | null;
  restock: boolean; // matched usual: restock it
  track: boolean; // unmatched line: start tracking it as a usual
}

// Counted stock: what a receipt line adds, in the usual's own unit (9 rolls
// from a 9-pack). The receipt reader works that out; failing that, assume each
// line is one usual shop's worth.
const countedUnits = (staple: Staple, line: { quantity: number; units: number | null } | undefined) =>
  staple.stock ? line?.units ?? (line?.quantity ?? 1) * (staple.stock.lastBoughtUnits ?? 1) : undefined;

const receiptDate = (reading: ReceiptReply | null) => (reading?.date ? new Date(`${reading.date}T12:00:00`) : new Date());

const CountedBadge = ({ staple, line, boughtAt }: { staple: Staple | undefined; line: ReviewLine; boughtAt: Date }) => {
  const units = staple ? countedUnits(staple, line) : undefined;
  if (!staple?.stock || units === undefined) return null;
  // Bought before the last count: recordPurchase leaves the count alone, so say so.
  if (boughtAt.getTime() < new Date(staple.stock.countedAt).getTime()) {
    return <span className="text-xs text-gray-500 dark:text-slate-400">already in your count</span>;
  }
  return (
    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
      +{units} {pluralUnit(staple.stock.unit, units)}
    </span>
  );
};

export const ReceiptRestockPanel = () => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const staples = useFamilyStore((state) => state.kitchenStaples);
  const updateStaples = useFamilyStore((state) => state.updateKitchenStaples);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<ReceiptReply | null>(null);
  const [lines, setLines] = useState<ReviewLine[]>([]);
  const [addToBudget, setAddToBudget] = useState(false);

  const stapleName = (id: string | null) => staples.find((s) => s.id === id)?.name;

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!familyId) {
      setError('Sign in to your household to scan receipts.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const reply = await uploadKitchenPhoto<ReceiptReply>(
        familyId,
        'receipt',
        file,
        {
          usuals: JSON.stringify(staples.map((s) => s.name)),
          counted: JSON.stringify(Object.fromEntries(staples.filter((s) => s.stock).map((s) => [s.name, s.stock!.unit]))),
        },
        { maxSize: 2200, quality: 0.88 } // receipts need legible small print
      );
      const byName = new Map(staples.map((s) => [s.name.toLowerCase(), s]));
      const seen = new Set<string>();
      setLines(reply.lines.map((line, index) => {
        const staple = (line.usual && byName.get(line.usual.toLowerCase())) || matchStaple(line.name, staples);
        const firstForStaple = !!staple && !seen.has(staple.id);
        if (staple) seen.add(staple.id);
        return {
          key: `${index}-${line.name}`,
          name: line.name,
          quantity: line.quantity,
          units: staple?.stock ? line.units ?? null : null,
          stapleId: staple?.id ?? null,
          restock: firstForStaple,
          track: false,
        };
      }));
      setReading(reply);
      setAddToBudget(Boolean(reply.total));
    } catch (err) {
      setError(err instanceof PhotoReadError ? err.message : 'Something went wrong reading that receipt.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const toggle = (key: string, field: 'restock' | 'track') =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, [field]: !line[field] } : line)));

  const reset = () => {
    setReading(null);
    setLines([]);
  };

  const confirm = async () => {
    if (!reading) return;
    const boughtAt = receiptDate(reading);
    const restockLines = new Map(lines.filter((l) => l.restock && l.stapleId).map((l) => [l.stapleId!, l]));
    const restockIds = new Set(restockLines.keys());
    const unitsBought = (staple: Staple) => countedUnits(staple, restockLines.get(staple.id));
    const newOnes = lines.filter((l) => l.track && !l.stapleId).map((l) => recordPurchase(createStaple(l.name), boughtAt));

    updateStaples((current) => {
      const existingIds = new Set(current.map((s) => s.id));
      return [
        ...current.map((staple) => (restockIds.has(staple.id) ? recordPurchase(staple, boughtAt, unitsBought(staple)) : staple)),
        ...newOnes.filter((s) => !existingIds.has(s.id)),
      ];
    });

    if (addToBudget && reading.total && familyId) {
      const storeName = reading.store || 'Groceries';
      try {
        const response = await fetch(`/api/families/${familyId}/budget/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            expenseName: storeName,
            amount: reading.total,
            category: inferCategoryFromDescription(storeName, 'Food & Dining'),
            paymentDate: boughtAt.toISOString(),
            isRecurring: false,
            personId: null,
            isReceiptScan: true,
            receiptScanDate: new Date().toISOString(),
          }),
        });
        if (!response.ok) throw new Error(String(response.status));
      } catch {
        toast.error('Restocked, but the budget entry could not be saved');
      }
    }

    const count = restockIds.size + newOnes.length;
    toast.success(count ? `Restocked ${count} usual${count === 1 ? '' : 's'}` : 'Nothing restocked');
    reset();
  };

  const matched = lines.filter((l) => l.stapleId);
  const others = lines.filter((l) => !l.stapleId);

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
        <Receipt className="h-5 w-5 text-violet-600" /> Just been shopping?
      </h3>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
        Scan the receipt and your usuals are restocked, so their countdowns start again.
      </p>

      {!reading && (
        <div className="mt-3">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />}
            {busy ? 'Reading the receipt…' : 'Scan a receipt'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Receipt photo"
            onChange={(e) => void handleFile(e.target.files?.[0])} />
        </div>
      )}

      {error && (
        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
        </p>
      )}

      {reading && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-gray-700 dark:text-slate-300">
            {reading.store || 'Receipt'}{reading.date ? ` · ${new Date(`${reading.date}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
            {reading.total ? ` · £${reading.total.toFixed(2)}` : ''} · {lines.length} items read
          </p>

          <div>
            <h4 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Restock these usuals</h4>
            {matched.length === 0 && <p className="text-sm text-gray-500 dark:text-slate-400">None of your usuals were on this receipt.</p>}
            <ul className="mt-1 space-y-1">
              {matched.map((line) => (
                <li key={line.key}>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-800 dark:text-slate-200">
                    <input type="checkbox" checked={line.restock} onChange={() => toggle(line.key, 'restock')} className="rounded text-violet-600" />
                    <span className="font-medium">{stapleName(line.stapleId)}</span>
                    <span className="text-xs text-gray-500 dark:text-slate-400">from “{line.name}”{line.quantity > 1 ? ` ×${line.quantity}` : ''}</span>
                    <CountedBadge staple={staples.find((s) => s.id === line.stapleId)} line={line} boughtAt={receiptDate(reading)} />
                  </label>
                </li>
              ))}
            </ul>
          </div>

          {others.length > 0 && (
            <details>
              <summary className="cursor-pointer text-sm text-gray-600 dark:text-slate-400">Other items ({others.length}), tick any to start tracking</summary>
              <ul className="mt-1 space-y-1">
                {others.map((line) => (
                  <li key={line.key}>
                    <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
                      <input type="checkbox" checked={line.track} onChange={() => toggle(line.key, 'track')} className="rounded text-violet-600" />
                      {line.name}{line.quantity > 1 ? ` ×${line.quantity}` : ''}
                    </label>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {reading.total ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-slate-300">
              <input type="checkbox" checked={addToBudget} onChange={(e) => setAddToBudget(e.target.checked)} className="rounded text-violet-600" />
              Also add £{reading.total.toFixed(2)} to the budget
            </label>
          ) : null}

          <div className="flex justify-end gap-2">
            <button onClick={reset} className="rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={() => void confirm()} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
              Restock
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
