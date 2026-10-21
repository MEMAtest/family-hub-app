'use client';

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { CheckCircle2, ChevronDown, ExternalLink, Trash2, X } from 'lucide-react';
import type { BinSnapshot } from '@/lib/binCollections';
import { binCollectionDateLabel, binServiceSummary, binDateInLondon, isBinCollectionActionable } from '@/utils/binCollectionPresentation';

const todayInLondon = () => binDateInLondon();
export function BinCollectionStrip({ familyId, onSynced }: { familyId?: string | null; onSynced?: () => Promise<void> }) {
  const synced = useRef(onSynced);
  synced.current = onSynced;
  const [snapshot, setSnapshot] = useState<BinSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [today, setToday] = useState(todayInLondon);
  useEffect(() => { const timer = setInterval(() => setToday(todayInLondon()), 60_000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!familyId) return;
    const controller = new AbortController();
    setLoading(true); setSnapshot(null);
    void fetch(`/api/families/${familyId}/bin-collections`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Unavailable');
      const result = await response.json() as BinSnapshot;
      if (!result || !['connected', 'unavailable', 'not_configured'].includes(result.status) || !Array.isArray(result.collections) ||
          result.collections.some(item => !item || !/^\d{4}-\d{2}-\d{2}$/.test(item.date) || !Array.isArray(item.services) || item.services.some(service => typeof service !== 'string'))) throw new Error('Invalid collection response');
      setSnapshot(result);
      if (result.status === 'connected') void synced.current?.().catch(() => undefined);
    }).catch(() => { if (!controller.signal.aborted) setSnapshot({ status: 'unavailable', collections: [], error: 'Bin collection dates could not be checked.' }); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [familyId, today]);
  if (!familyId || (!snapshot && !loading)) return null;
  const collection = snapshot?.collections.filter(item => isBinCollectionActionable(item.date, today))
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  if (loading || !collection || snapshot?.status !== 'connected') return null;
  const label = collection.date === today ? 'Bins today' : 'Bins tonight';
  const instruction = collection.date === today ? 'Collection is today. The council does not publish a collection time.' :
    'Put these out tonight for collection tomorrow.';
  const checked = snapshot?.checkedAt ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(snapshot.checkedAt)) : null;
  const providerName = snapshot?.providerName || (snapshot?.sourceUrl?.startsWith('https://recyclingservices.bromley.gov.uk/') ? 'Bromley Council' : 'the council');
  const closeOnBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  };
  return <section aria-label="Bin collections" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={closeOnBlur} className="relative z-30 flex min-w-0 items-center gap-2 border-b border-teal-200 bg-teal-50 px-4 py-1.5 text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 sm:px-6">
    <Trash2 className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
    <button type="button" aria-expanded={open} aria-controls="bin-collection-details" onClick={() => setOpen(true)} className="flex min-h-9 min-w-0 flex-1 items-center gap-2 text-left text-sm">
      <strong className="shrink-0">{label}</strong>
      <span className="min-w-0 truncate capitalize text-xs text-teal-800 dark:text-teal-200">{binServiceSummary(collection.services)} · {binCollectionDateLabel(collection.date)}</span>
      <ChevronDown className={`ml-auto h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div id="bin-collection-details" role="dialog" aria-label="Bin collection details" className="absolute left-3 right-3 top-[calc(100%+0.35rem)] z-50 max-w-md rounded-md border border-teal-200 bg-white p-4 text-sm shadow-lg dark:border-teal-800 dark:bg-slate-900 sm:left-6 sm:right-auto sm:w-[24rem]">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold">{label}</h3><p className="mt-1 font-medium capitalize">{binServiceSummary(collection.services)}</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close bin collection details" className="-mr-2 -mt-2 min-h-10 min-w-10 p-2"><X className="h-4 w-4" /></button></div>
        <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">{instruction}</p>
        <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{binCollectionDateLabel(collection.date)} · Reminder for each parent at 20:00</p>
        <p className="mt-3 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300"><CheckCircle2 className="h-3.5 w-3.5" />Checked automatically with {providerName}{checked ? ` on ${checked}` : ''}</p>
      {snapshot?.sourceUrl && <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" title="Council collection calendar" aria-label="Council collection calendar" className="mt-3 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-teal-700 underline dark:text-teal-300"><ExternalLink className="h-4 w-4" />Open council calendar</a>}
    </div>}
  </section>;
}
