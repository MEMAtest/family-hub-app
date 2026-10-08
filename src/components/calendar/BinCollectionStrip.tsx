'use client';

import { useEffect, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { addDays } from '@/utils/recurrence';
import type { BinSnapshot } from '@/lib/binCollections';

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
  const collection = snapshot?.collections.find(item => item.date >= today);
  const label = collection?.date === today ? 'Bins today' : collection?.date === addDays(today, 1) ? 'Bins tomorrow' : 'Next bin collection';
  return <section aria-label="Bin collections" className="flex min-w-0 flex-wrap items-start gap-3 border-b border-teal-200 bg-teal-50 px-4 py-3 text-teal-950 dark:border-teal-900 dark:bg-teal-950 dark:text-teal-100 sm:px-6">
    <Trash2 className="mt-0.5 h-5 w-5 shrink-0 text-teal-700 dark:text-teal-300" />
    <div className="min-w-0 flex-1 text-sm">
      <h3 className="font-semibold">{loading ? 'Checking bin collections...' : snapshot?.status === 'connected' && collection ? label : 'Bin collections unavailable'}</h3>
      {!loading && snapshot?.status === 'connected' && collection ? <>
        <p className="mt-1">{collection.services.join(' + ')}</p>
        <p className="mt-1 text-xs text-teal-800 dark:text-teal-200">{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${collection.date}T12:00:00Z`))} · Put out the evening before · Parent reminders at 20:00 London</p>
      </> : !loading && <p className="mt-1">{snapshot?.error || 'No upcoming council dates were found.'}</p>}
    </div>
    {snapshot?.sourceUrl && <a href={snapshot.sourceUrl} target="_blank" rel="noreferrer" title="Council collection calendar" aria-label="Council collection calendar" className="inline-flex min-h-10 items-center gap-1 text-xs underline"><ExternalLink className="h-4 w-4" />Council</a>}
    {snapshot?.status !== 'connected' && <button disabled={loading} title="Retry bin collections" aria-label="Retry bin collections" onClick={() => setRetry(value => value + 1)} className="min-h-10 p-2 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>}
  </section>;
}
