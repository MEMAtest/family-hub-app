'use client';

import { AuthView } from '@neondatabase/neon-js/auth/react/ui';
import { use } from 'react';

interface AuthPageProps {
  params: Promise<{ path: string }>;
}

export default function AuthPage({ params }: AuthPageProps) {
  const { path } = use(params);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
              <span className="text-3xl">&#127968;</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Family Hub
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {path === 'sign-in' ? 'Sign in to manage your family' : 'Create your family account'}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6">
          <AuthView pathname={path} />
        </div>
      </div>
    </div>
  );
}
