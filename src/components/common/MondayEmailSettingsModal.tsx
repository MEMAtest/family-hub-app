'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { CheckCircle2, X } from 'lucide-react';
import { useFamilyStore } from '@/store/familyStore';
import { MAX_EXTRA_RECIPIENTS, normalizeDigestPreferences } from '@/lib/sharedDocuments';

// What goes into the Monday email; shared by the whole household.
export const MondayEmailSettingsModal = ({ onClose }: { onClose: () => void }) => {
  const preferences = useFamilyStore((state) => state.digestPreferences);
  const setPreferences = useFamilyStore((state) => state.setDigestPreferences);
  const [draft, setDraft] = useState(preferences);
  const [extraInput, setExtraInput] = useState(preferences.extraRecipients.join(', '));

  const save = () => {
    const requested = extraInput.split(/[,;\s]+/).map((email) => email.trim()).filter(Boolean);
    const next = normalizeDigestPreferences({ ...draft, extraRecipients: requested });
    const rejected = requested.length - next.extraRecipients.length;
    setPreferences(next);
    if (rejected > 0) {
      toast.error(`${rejected} email address${rejected === 1 ? '' : 'es'} skipped (invalid, duplicate, or over the limit of ${MAX_EXTRA_RECIPIENTS})`);
    } else {
      toast.success('Monday email settings saved for the family');
    }
    onClose();
  };

  const toggle = (field: 'kidsIdeas' | 'kidsLocalOnly' | 'kidsFreeOnly' | 'homeJobs' | 'mealsRecap' | 'stockUp', label: string, hint?: string) => (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={draft[field]}
        onChange={(e) => setDraft({ ...draft, [field]: e.target.checked })}
        className="mt-0.5 rounded text-purple-600"
      />
      <span>
        <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-gray-500 dark:text-slate-400">{hint}</span>}
      </span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="digest-settings-title"
        className="w-full max-w-md rounded-xl bg-white p-5 dark:bg-slate-800"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="digest-settings-title" className="text-lg font-semibold text-gray-900 dark:text-slate-100">Monday email</h3>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-400">
              Sent on Monday mornings (8am in summer, 7am in winter) to everyone in the household who signs in, alongside the week&apos;s calendar.
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {toggle('kidsIdeas', 'Ideas for the kids', 'A few places to go this week, plus any you’ve added with the bell.')}
          <div className="space-y-3 pl-7">
            {toggle('kidsLocalOnly', 'Only near home')}
            {toggle('kidsFreeOnly', 'Only free ones')}
          </div>
          {toggle('homeJobs', 'Home jobs', 'Open issues from the property log, most urgent first.')}
          {toggle('stockUp', 'Worth stocking up on', 'Usuals from the Kitchen that are low or due to run out this week.')}
          {toggle('mealsRecap', 'What you made last week', 'Meals logged in the Kitchen, so you can remember and repeat the good ones.')}

          <div>
            <label htmlFor="digest-extra" className="block text-sm font-medium text-gray-800 dark:text-slate-200">
              Also send to
            </label>
            <input
              id="digest-extra"
              type="text"
              value={extraInput}
              onChange={(e) => setExtraInput(e.target.value)}
              placeholder="e.g. someone without a login"
              className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
              Optional. Up to {MAX_EXTRA_RECIPIENTS} addresses, separated by commas.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2 border-t border-gray-200 pt-4 dark:border-slate-700">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700">
            Cancel
          </button>
          <button onClick={save} className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
            <CheckCircle2 className="h-4 w-4" />
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
