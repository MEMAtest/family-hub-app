'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { ExternalLink, Loader2, LogOut, RefreshCw, ShieldCheck, X } from 'lucide-react';
import type { GrandirStatus } from '@/lib/grandirSession';
import type { GrandirSyncResult } from '@/lib/grandirIntake';

export function GrandirConnection({ familyId, onChanged }: { familyId: string | null; onChanged: () => Promise<void> }) {
  const [status, setStatus] = useState<GrandirStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parentSession, setParentSession] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GrandirSyncResult | null>(null);
  const endpoint = familyId ? `/api/families/${encodeURIComponent(familyId)}/grandir` : null;
  const activeEndpoint = useRef(endpoint);
  activeEndpoint.current = endpoint;

  const refresh = useCallback(async () => {
    if (!endpoint) return;
    const response = await fetch(endpoint, { cache: 'no-store' });
    if (!response.ok) throw new Error('Grandir connection could not be checked.');
    const payload = await response.json();
    if (activeEndpoint.current !== endpoint) return;
    if (typeof payload.configured !== 'boolean' || typeof payload.connected !== 'boolean') throw new Error('Grandir connection could not be checked.');
    setStatus(payload);
    if (payload.parentEmail) setEmail(payload.parentEmail);
  }, [endpoint]);
  useEffect(() => { setStatus(null); setError(null); setOpen(false); setPassword(''); setParentSession(''); setResult(null);
    void refresh().catch(() => { if (activeEndpoint.current === endpoint) setError('Grandir connection could not be checked.'); }); }, [refresh, endpoint]);

  const sync = async () => {
    if (!endpoint) return;
    const response = await fetch(`${endpoint}/sync`, { method: 'POST' });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Grandir intake could not finish.');
    setResult(payload);
    await onChanged();
  };
  const runSync = async () => {
    setBusy(true); setError(null);
    try { await sync(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Grandir intake could not finish.'); }
    finally { await refresh().catch(() => undefined); setBusy(false); }
  };
  const connect = async () => {
    if (!endpoint || !consent) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent, ...(parentSession ? { parentSession } : { email, password }) }) });
      setPassword(''); setParentSession('');
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Grandir could not be connected.');
      setStatus(payload); setOpen(false);
      await sync();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Grandir could not be connected.'); }
    finally { setPassword(''); setParentSession(''); await refresh().catch(() => undefined); setBusy(false); }
  };
  const disconnect = async () => {
    if (!endpoint || !window.confirm('Disconnect Grandir and stop automatic nursery intake? Saved updates and calendar dates will remain.')) return;
    setBusy(true); setError(null);
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) throw new Error('Grandir could not be disconnected.');
      setStatus(await response.json()); setResult(null);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Grandir could not be disconnected.'); }
    finally { setBusy(false); }
  };

  return <section aria-label="Grandir nursery connection" className="mb-3 border-b border-gray-200 py-3 text-xs dark:border-slate-800">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h4 className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5 text-sky-700" />Grandir nursery</h4>
        {status?.connected ? <>
          <p className="mt-1 text-emerald-700 dark:text-emerald-300">Connected for {status.childName}</p>
          <p className="mt-1 break-words text-gray-500">{status.nurseryName}</p>
          <p className="mt-1 text-gray-500">08:00 and 20:00 London time{status.lastSyncAt ? ` · Last successful check ${new Date(status.lastSyncAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Europe/London' })}` : ' · First check pending'}</p>
        </> : <p className={`mt-1 ${status?.needsReconnect ? 'text-amber-700' : 'text-gray-500'}`}>
          {status?.needsReconnect ? 'Session expired or disconnected. Reconnect to resume nursery intake.' : status ? 'Not connected' : error ? 'Connection not checked' : 'Checking connection...'}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" disabled={busy || !endpoint || !status?.configured}
          onClick={() => status?.connected ? void runSync() : (setConsent(false), setOpen(true), setError(null))}
          className="inline-flex min-h-9 items-center gap-1 rounded-md bg-sky-700 px-2.5 font-semibold text-white disabled:opacity-50">
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {status?.connected ? 'Sync Grandir' : status?.needsReconnect ? 'Reconnect' : 'Connect Grandir'}
        </button>
        {status?.connected && <button type="button" title="Disconnect Grandir" aria-label="Disconnect Grandir" disabled={busy}
          onClick={() => void disconnect()} className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-gray-100"><LogOut className="h-4 w-4" /></button>}
      </div>
    </div>
    {error && !open && <p role="alert" className="mt-2 text-amber-700">{error}</p>}
    {status && !status.configured && <p className="mt-2 text-gray-500">Secure nursery connection is not configured.</p>}
    {status?.lastError === 'NOTICE_CHANGED' && <p className="mt-2 text-amber-700">A nursery update changed. Review the original before changing saved dates.</p>}
    {result && <p role="status" className="mt-2 text-emerald-700">{result.processed} notices checked · {result.autoCreated} dates added · {result.needsReview} to review</p>}
    {!!(result?.changedNotices || status?.changedNotices)?.length && <ul className="mt-2 space-y-2">{(result?.changedNotices || status?.changedNotices || []).map(item => <li key={item.sourceUrl}>
      <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky-700">{item.title}<ExternalLink className="h-3 w-3" /></a></li>)}</ul>}
    <Dialog open={open} onClose={() => { if (!busy) { setOpen(false); setPassword(''); setParentSession(''); } }} className="fixed inset-0 z-[90]">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-3">
        <DialogPanel className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-lg bg-white p-5 text-gray-900 shadow-xl dark:bg-slate-900 dark:text-white">
          <div className="mb-4 flex items-center justify-between gap-2"><DialogTitle className="text-lg font-semibold">Connect Grandir</DialogTitle>
            <button type="button" aria-label="Close Grandir connection" disabled={busy} onClick={() => { setOpen(false); setPassword(''); setParentSession(''); }} className="flex h-10 w-10 items-center justify-center"><X className="h-4 w-4" /></button></div>
          <form onSubmit={event => { event.preventDefault(); void connect(); }} className="space-y-4">
            <label className="block text-sm">Parent email<input type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)}
              disabled={busy || Boolean(parentSession)} required={!parentSession} className="mt-1 block min-h-11 w-full rounded-md border border-gray-300 px-3 dark:bg-slate-800" /></label>
            <label className="block text-sm">Grandir password<input type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)}
              disabled={busy || Boolean(parentSession)} required={!parentSession} className="mt-1 block min-h-11 w-full rounded-md border border-gray-300 px-3 dark:bg-slate-800" /></label>
            <details className="text-xs text-gray-500"><summary className="min-h-9 cursor-pointer">Existing signed-in parent session</summary>
              <label className="block">Parent session<input type="password" autoComplete="off" aria-label="Grandir parent session" value={parentSession}
                onChange={event => { setParentSession(event.target.value); setPassword(''); }} disabled={busy}
                className="mt-1 block min-h-11 w-full rounded-md border border-gray-300 px-3 dark:bg-slate-800" /></label></details>
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} disabled={busy} className="mt-1 h-4 w-4" />
              Allow automatic read-only nursery intake. Retain an encrypted parent session for up to 30 days; never save my password.</label>
            {error && <p role="alert" className="text-sm text-amber-700">{error}</p>}
            <button type="submit" disabled={busy || !consent || (!parentSession && (!email || !password))}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-sky-700 px-3 font-semibold text-white disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Connect nursery intake</button>
            <a href="https://www.app.grandiruk.com/" target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1 text-sm text-sky-700">Official parent portal<ExternalLink className="h-3 w-3" /></a>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  </section>;
}
