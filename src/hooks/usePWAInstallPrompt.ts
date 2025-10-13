import { useCallback, useEffect, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'familyhub_pwa_install_dismissed';

export const usePWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [hasInstalled, setHasInstalled] = useState(false);
  const [wasDismissed, setWasDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissed = localStorage.getItem(DISMISS_KEY) === 'true';
    setWasDismissed(dismissed);

    const standalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any)?.standalone;
    setIsStandalone(standalone);

    const ua = window.navigator.userAgent.toLowerCase();
    setIsIos(/iphone|ipad|ipod/.test(ua));

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (dismissed || standalone) {
        return;
      }
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setHasInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      localStorage.removeItem(DISMISS_KEY);
    };

    const handleVisibilityChange = () => {
      const standaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any)?.standalone;
      setIsStandalone(standaloneMode);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      return 'unsupported' as const;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      setIsInstallable(false);

      if (choice.outcome === 'dismissed') {
        localStorage.setItem(DISMISS_KEY, 'true');
        setWasDismissed(true);
      } else {
        localStorage.removeItem(DISMISS_KEY);
        setHasInstalled(true);
      }

      return choice.outcome;
    } catch (error) {
      console.error('PWA install prompt failed', error);
      return 'unsupported' as const;
    }
  }, [deferredPrompt]);

  const dismissPrompt = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setIsInstallable(false);
    setDeferredPrompt(null);
    setWasDismissed(true);
  }, []);

  const resetPrompt = useCallback(() => {
    localStorage.removeItem(DISMISS_KEY);
    setWasDismissed(false);
  }, []);

  const showIosInstructions = isIos && !isStandalone && !wasDismissed;

  return {
    isInstallable: isInstallable && !isStandalone && !hasInstalled,
    promptInstall,
    dismissPrompt,
    resetPrompt,
    isStandalone,
    showIosInstructions,
    wasDismissed,
  };
};
