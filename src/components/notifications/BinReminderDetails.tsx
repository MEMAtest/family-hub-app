'use client'

import { X } from 'lucide-react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { binCollectionDateLabel } from '@/utils/binCollectionPresentation';

type Collection = { date: string; services: string[]; verified: boolean };

export default function BinReminderDetails({ collection, onClose }: {
  collection: Collection;
  onClose: () => void;
}) {
  return <Dialog open onClose={onClose} className="relative z-[110]">
    <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
    <div className="fixed inset-0 flex items-center justify-center p-4">
    <DialogPanel
      className="relative max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 text-gray-900 shadow-xl dark:bg-slate-900 dark:text-slate-100">
      <button type="button" onClick={onClose} aria-label="Close collection details" autoFocus
        className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded hover:bg-gray-100 dark:hover:bg-slate-800">
        <X className="h-5 w-5" />
      </button>
      <DialogTitle className="pr-12 text-lg font-semibold">Bin collection</DialogTitle>
      <p className="mt-3 text-sm">{binCollectionDateLabel(collection.date)}</p>
      <ul className="mt-3 list-inside list-disc text-sm">
        {collection.services.map((service, index) => <li className="break-words" key={`${index}-${service}`}>{service}</li>)}
      </ul>
      <p className="mt-3 text-sm text-gray-600 dark:text-slate-300">The council calendar does not publish a collection time.</p>
      {!collection.verified && <p role="status" className="mt-3 text-sm text-amber-700 dark:text-amber-300">Council verification is pending.</p>}
    </DialogPanel>
    </div>
  </Dialog>;
}
