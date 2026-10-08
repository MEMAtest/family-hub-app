'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { addDays } from '@/utils/recurrence';
import type { BinSnapshot } from '@/lib/binCollections';
import { binCollectionDateLabel, binServiceSummary } from '@/utils/binCollectionPresentation';

const todayInLondon = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export function BinCollectionStrip({ familyId, onSynced }: { familyId?: string | null; onSynced?: () => Promise<void> }) {
  const synced = useRef(onSynced);
  synced.current = onSynced;
  const [snapshot, setSnapshot] = useState<BinSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [retry, setRetry] = useState(0);
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
  }, [familyId, retry, today]);
  if (!familyId || (!snapshot && !loading)) return null;
  const collectionIndex = snapshot?.collections.findIndex(item => item.date >= today) ?? -1;
  const collection = collectionIndex >= 0 ? snapshot?.collections[collectionIndex] : undefined;
  const following = collectionIndex >= 0 ? snapshot?.collections[collectionIndex + 1] : undefined;
  const tomorrow = addDays(today, 1);
  const label = collection?.date === today ? 'Bins today' : collection?.date === tomorrow ? 'Bins tonight' : 'Next bins';
  const instruction = collection?.date === today ? 'Collection is today. The council does not publish a collection time.' :
    collection?.date === tomorrow ? 'Put these out tonight for collection tomorrow.' : collection
      ? `Put these out on ${new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'Europe/London' }).format(new Date(`${addDays(collection.date, -1)}T12:00:00Z`))} evening.` : '';
  const checked = snapshot?.checkedAt ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }).format(new Date(snapshot.checkedAt)) : null;
  const providerName = snapshot?.providerName || (snapshot?.sourceUrl?.startsWith('https://recyclingservices.bromley.gov.uk/') ? 'Bromley Council' : 'the council');
  return <section aria-label="Bin collections" className="flex min-w-0 flex-wrap items-start gap-3 border-b border-teal-200 bg-teal-50 px-4 py-3 text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 sm:px-6">
    <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
    <div className="min-w-0 flex-1 text-sm">
      <h3 className="font-semibold">{loading ? 'Checking bin collections...' : snapshot?.status === 'connected' && collection ? label : 'Bin collections unavailable'}</h3>
      {!loading && snapshot?.status === 'connected' && collection ? <>
        <p className="mt-1 font-medium capitalize">{binServiceSummary(collection.services)}</p>
        <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">{instruction}</p>
        <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">{binCollectionDateLabel(collection.date)} | Smart reminder for each parent at 20:00</p>
        {following && <p className="mt-2 border-t border-teal-200 pt-2 text-xs dark:border-teal-800">
          <span className="font-medium">Following:</span> {binCollectionDateLabel(following.date)} | <span className="capitalize">{binServiceSummary(following.services)}</span>
        </p>}
        <p className="mt-2 flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300"><CheckCircle2 className="h-3.5 w-3.5" />
          Checked automatically with {providerName}{checked ? ` on ${checked}` : ''}
        </p>
      </> : !loading && <p className="mt-1">{snapshot?.error || 'No upcoming council dates were found.'}</p>}
    </div>
    {snapshot?.sourceUrl && <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" title="Council collection calendar" aria-label="Council collection calendar" className="inline-flex min-h-10 items-center gap-1 text-xs underline"><ExternalLink className="h-4 w-4" />Council</a>}
    {snapshot?.status !== 'connected' && <button disabled={loading} title="Retry bin collections" aria-label="Retry bin collections" onClick={() => setRetry(value => value + 1)} className="min-h-10 p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>}
  </section>;
}
