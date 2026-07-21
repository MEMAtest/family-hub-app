'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound } from 'lucide-react';

export default function JoinHouseholdPage() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const redeem = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/household-invites/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not join this household.');
      router.replace('/');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not join this household.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f1] px-5 py-12 text-[#18221f] dark:bg-[#0d1215] dark:text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#d8527d] text-white"><KeyRound className="h-6 w-6" /></div>
        <p className="text-sm font-semibold text-[#d8527d]">Private household access</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">Join your Family Hub.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">Enter the one-use code shared by the household owner.</p>
        <form onSubmit={redeem} className="mt-8 space-y-4">
          <label className="block text-sm font-medium" htmlFor="invite-code">Household invite code</label>
          <input id="invite-code" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} autoCapitalize="characters" autoComplete="one-time-code" className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-mono tracking-wide outline-none focus:border-[#d8527d] focus:ring-2 focus:ring-[#d8527d]/20 dark:border-slate-700 dark:bg-slate-900" required />
          {error && <p className="rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
          <button type="submit" disabled={loading} className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#d8527d] px-4 text-sm font-semibold text-white hover:bg-[#bb3d65] disabled:cursor-wait disabled:opacity-70">{loading ? 'Joining…' : 'Join household'}</button>
        </form>
      </div>
    </main>
  );
}
