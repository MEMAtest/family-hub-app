'use client';

import { useState } from 'react';
import { LogIn, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/neonAuthClient';

export default function SignInPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await authClient.signIn.social({
        provider: 'google',
        callbackURL: '/',
      });
      if (result.error) setError(result.error.message || 'Google sign-in could not be started.');
    } catch {
      setError('Google sign-in could not be started. Check that this deployment is configured.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f5f7f1] px-5 py-12 text-[#18221f] dark:bg-[#0d1215] dark:text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#147c72] text-white">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <p className="text-sm font-semibold text-[#147c72]">Omosanya Home</p>
        <h1 className="mt-2 font-serif text-4xl leading-tight">Your household, securely yours.</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          Sign in with the Google account linked to your Family Hub profile.
        </p>
        {error && <p className="mt-5 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</p>}
        <button
          type="button"
          onClick={signIn}
          disabled={loading}
          className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-[#147c72] px-4 text-sm font-semibold text-white hover:bg-[#0f625a] disabled:cursor-wait disabled:opacity-70"
        >
          <LogIn className="h-4 w-4" />
          {loading ? 'Connecting Google…' : 'Continue with Google'}
        </button>
      </div>
    </main>
  );
}
