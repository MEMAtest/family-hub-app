'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, Camera, ChefHat, ImagePlus, Loader2, Refrigerator } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { uploadKitchenPhoto, PhotoReadError } from '@/services/kitchenPhotoService';
import { matchStaple } from '@/utils/staples';
import { createId } from '@/utils/id';
import type { FridgeCheck } from '@/types/kitchen.types';
import type { FridgeReading } from '@/lib/kitchenVision';

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 2) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
};

interface FridgeCheckPanelProps {
  onPlanMeal: (name: string) => void;
}

export const FridgeCheckPanel = ({ onPlanMeal }: FridgeCheckPanelProps) => {
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const checks = useFamilyStore((state) => state.fridgeChecks);
  const addFridgeCheck = useFamilyStore((state) => state.addFridgeCheck);
  const updateStaples = useFamilyStore((state) => state.updateKitchenStaples);
  const cameraRef = useRef<HTMLInputElement>(null);
  const libraryRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const latest = checks[0];

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!familyId) {
      setError('Sign in to your household to use the fridge check.');
      return;
    }
    setError(null);
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const reading = await uploadKitchenPhoto<FridgeReading>(familyId, 'fridge-check', file);
      const now = new Date().toISOString();
      const staples = useFamilyStore.getState().kitchenStaples;
      const seen = new Set<string>();
      reading.items.forEach((item) => {
        const staple = matchStaple(item.name, staples);
        if (staple) seen.add(staple.id);
      });
      const check: FridgeCheck = {
        id: createId('fridge'),
        takenAt: now,
        summary: reading.summary,
        items: reading.items,
        useFirst: reading.useFirst,
        mealIdeas: reading.mealIdeas,
        stapleIdsSeen: [...seen],
        updatedAt: now,
      };
      addFridgeCheck(check);
      if (seen.size) {
        updateStaples((current) => current.map((staple) => (seen.has(staple.id) ? { ...staple, seenAt: now, updatedAt: now } : staple)));
      }
      toast.success(`Spotted ${reading.items.length} things`);
    } catch (err) {
      setError(err instanceof PhotoReadError ? err.message : 'Something went wrong reading that photo.');
    } finally {
      setBusy(false);
      if (cameraRef.current) cameraRef.current.value = '';
      if (libraryRef.current) libraryRef.current.value = '';
    }
  };

  const staples = useFamilyStore((state) => state.kitchenStaples);
  const seenNames = latest
    // Something you've said is low still needs buying, even if a bit is left.
    ? staples.filter((staple) => latest.stapleIdsSeen.includes(staple.id) && staple.flag === 'ok').map((staple) => staple.name)
    : [];

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
          <Refrigerator className="h-5 w-5 text-sky-600" /> Fridge check
        </h3>
        {latest && <span className="text-xs text-gray-500 dark:text-slate-400">Last checked {timeAgo(latest.takenAt)}</span>}
      </div>
      <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
        Snap the fridge before you shop. You&apos;ll see what to use up first and what not to buy again.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={() => cameraRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          {busy ? 'Having a look…' : 'Snap the fridge'}
        </button>
        <button
          onClick={() => libraryRef.current?.click()}
          disabled={busy}
          className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <ImagePlus className="h-4 w-4" /> Choose a photo
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" aria-label="Take fridge photo"
          onChange={(e) => void handleFile(e.target.files?.[0])} />
        <input ref={libraryRef} type="file" accept="image/*" className="hidden" aria-label="Upload fridge photo"
          onChange={(e) => void handleFile(e.target.files?.[0])} />
      </div>

      {error && (
        <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200" role="alert">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {error}
        </p>
      )}

      {busy && preview && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Fridge photo being checked" className="mt-3 max-h-48 rounded-lg object-cover opacity-70" />
      )}

      {latest && !busy && (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-gray-800 dark:text-slate-200">{latest.summary}</p>

          {latest.useFirst.length > 0 && (
            <div className="rounded-lg bg-amber-50 p-3 dark:bg-amber-500/10">
              <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-200">Use these first</h4>
              <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-amber-900 dark:text-amber-100">
                {latest.useFirst.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </div>
          )}

          {latest.mealIdeas.length > 0 && (
            <div>
              <h4 className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-slate-100">
                <ChefHat className="h-4 w-4 text-emerald-600" /> Ideas from what&apos;s there
              </h4>
              <ul className="mt-1 space-y-1">
                {latest.mealIdeas.map((idea) => (
                  <li key={idea} className="flex items-center justify-between gap-2 text-sm text-gray-700 dark:text-slate-300">
                    <span>{idea}</span>
                    <button onClick={() => onPlanMeal(idea)} className="flex-shrink-0 rounded-md border border-emerald-200 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-50 dark:border-emerald-500/40 dark:text-emerald-300">
                      Have it tonight
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {seenNames.length > 0 && (
            <p className="text-sm text-gray-600 dark:text-slate-300">
              <span className="font-medium text-gray-900 dark:text-slate-100">Already in there, no need to buy:</span> {seenNames.join(', ')}
            </p>
          )}

          <details className="text-sm">
            <summary className="cursor-pointer text-gray-600 dark:text-slate-400">Everything spotted ({latest.items.length})</summary>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {latest.items.map((item) => (
                <span key={`${item.name}-${item.note ?? ''}`}
                  className={`rounded-full px-2 py-0.5 text-xs ${item.useSoon ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200' : 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300'}`}
                  title={item.note}>
                  {item.name}{item.note ? ` · ${item.note}` : ''}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">Read from the photo, so things hidden behind others won&apos;t show up.</p>
          </details>
        </div>
      )}
    </section>
  );
};
