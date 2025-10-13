'use client'

import { useCallback, useEffect, useState } from 'react';
import { Download, Info, X } from 'lucide-react';
import { usePWAInstallPrompt } from '@/hooks/usePWAInstallPrompt';

export const PWAInstallPrompt = () => {
  const {
    isInstallable,
    promptInstall,
    dismissPrompt,
    isStandalone,
    showIosInstructions,
  } = usePWAInstallPrompt();

  const [visible, setVisible] = useState(false);
  const [ctaDisabled, setCtaDisabled] = useState(false);

  useEffect(() => {
    setVisible((isInstallable || showIosInstructions) && !isStandalone);
  }, [isInstallable, showIosInstructions, isStandalone]);

  const handleInstall = useCallback(async () => {
    setCtaDisabled(true);
    const outcome = await promptInstall();
    if (outcome !== 'accepted') {
      // allow CTA again if the user dismissed or unsupported
      setCtaDisabled(false);
    } else {
      setVisible(false);
    }
  }, [promptInstall]);

  const handleDismiss = useCallback(() => {
    dismissPrompt();
    setVisible(false);
  }, [dismissPrompt]);

  if (!visible) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4 sm:px-6">
      <div className="mx-auto flex max-w-xl items-start gap-4 rounded-2xl border border-blue-200 bg-white/95 p-4 shadow-xl shadow-blue-200/60 backdrop-blur">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          <Download className="h-4 w-4" />
        </div>
        <div className="flex-1 text-sm text-slate-700">
          {isInstallable ? (
            <>
              <p className="font-semibold text-slate-900">Install Family Hub</p>
              <p className="mt-1 leading-5 text-slate-600">
                Save the app to your home screen for faster access, offline mode, and notifications.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={handleInstall}
                  disabled={ctaDisabled}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
                >
                  <Download className="h-4 w-4" />
                  Install app
                </button>
                <button
                  onClick={handleDismiss}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="font-semibold text-slate-900">Add Family Hub to your Home Screen</p>
              <div className="mt-2 flex items-start gap-2 text-sm text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                <div className="space-y-1">
                  <p>On Safari, tap the share icon, then choose <strong>Add to Home Screen</strong>.</p>
                  <p>This keeps Family Hub handy and enables offline features.</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Got it
              </button>
            </>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close install prompt"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
