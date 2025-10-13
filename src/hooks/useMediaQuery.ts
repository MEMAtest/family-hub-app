import { useEffect, useState } from 'react';

/**
 * Provides a safe media query listener that works with SSR.
 * Defaults to false until mounted in the browser.
 */
export const useMediaQuery = (query: string, initialValue = false) => {
  const [matches, setMatches] = useState(initialValue);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const updateMatches = () => setMatches(mediaQueryList.matches);

    updateMatches();

    if (typeof mediaQueryList.addEventListener === 'function') {
      mediaQueryList.addEventListener('change', updateMatches);
      return () => mediaQueryList.removeEventListener('change', updateMatches);
    }

    mediaQueryList.addListener(updateMatches);
    return () => mediaQueryList.removeListener(updateMatches);
  }, [query]);

  return matches;
};
