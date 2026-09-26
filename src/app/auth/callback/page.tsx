'use client';

import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { authClient } from '@/lib/neonAuthClient';
import { useRouter } from 'next/navigation';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const completeSignIn = async () => {
      const params = new URLSearchParams(window.location.search);
      const providerError = params.get('error');
      if (providerError) {
        setError(`Google sign-in could not be completed: ${providerError}`);
        return;
      }

      try {
        // The Neon client sees the verifier in the URL and includes it in this
        // same-origin request. The proxy response then stores the session cookie
        // in the browser before the protected app route is loaded.
        const result = await authClient.getSession();
        if (cancelled) return;

        if (result.data?.session) {
          router.replace('/');
          return;
        }

        setError('Google sign-in did not return a Family Hub session. Please try again.');
      } catch {
        if (!cancelled) setError('Google sign-in could not be completed. Please try again.');
      }
    };

    void completeSignIn();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <main className="min-h-screen bg-[#f5f7f1] px-5 py-12 text-[#18221f] dark:bg-[#0d1215] dark:text-slate-100">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center text-center">
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-lg bg-[#147c72] text-white">
          {error ? <ShieldCheck className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
        <p className="text-sm font-semibold text-[#147c72]">Omosanya Home</p>
        <h1 className="mt-2 font-serif text-3xl leading-tight">
          {error ? 'Sign-in needs another try' : 'Finishing sign-in'}
        </h1>
        <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {error || 'Please wait while Family Hub securely opens your household.'}
        </p>
        {error && (
          <button
            type="button"
            onClick={() => router.replace('/auth/sign-in')}
            className="mt-7 inline-flex h-11 items-center justify-center rounded-lg bg-[#147c72] px-4 text-sm font-semibold text-white hover:bg-[#0f625a]"
          >
            Return to sign-in
          </button>
        )}
      </div>
    </main>
  );
}
