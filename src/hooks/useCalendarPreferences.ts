'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyCalendarPreferences, type CalendarPreferenceAction } from '@/lib/calendarPreferences';

export function useCalendarPreferences(familyId?: string | null) {
  const [preferences, setPreferences] = useState(emptyCalendarPreferences);
  const [status, setStatus] = useState<'loading' | 'saved' | 'saving' | 'error'>('loading');
  const epoch = useRef(0);
  const queue = useRef(Promise.resolve());
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);
  useEffect(() => {
    const generation = ++epoch.current;
    setPreferences(emptyCalendarPreferences());
    setStatus('loading');
    if (!familyId) return;
    const controller = new AbortController();
    const load = async () => {
      const loadedRevision = revision.current;
      try {
        const url = `/api/families/${familyId}/calendar-preferences`;
        let response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        if ([401, 404, 408, 429, 500, 502, 503, 504].includes(response.status)) {
          // Authentication and the newly deployed route can settle after initial hydration.
          await new Promise(resolve => setTimeout(resolve, 400));
          if (controller.signal.aborted) return;
          response = await fetch(url, { cache: 'no-store', signal: controller.signal });
        }
        if (!response.ok) throw new Error('Could not load calendar choices');
        const value = await response.json();
        if (generation === epoch.current && loadedRevision === revision.current) { setPreferences({ ...emptyCalendarPreferences(), ...value }); setStatus('saved'); }
      } catch { if (!controller.signal.aborted && generation === epoch.current) setStatus('error'); }
    };
    void load();
    const refresh = () => { if (document.visibilityState === 'visible') void queue.current.then(load); };
    window.addEventListener('focus', refresh);
    return () => { controller.abort(); window.removeEventListener('focus', refresh); epoch.current++; };
  }, [familyId, attempt]);
  const update = useCallback((action: CalendarPreferenceAction) => {
    revision.current++;
    const generation = epoch.current;
    const operation = queue.current.catch(() => undefined).then(async () => {
      if (!familyId || generation !== epoch.current) throw new Error('Connect to your household first.');
      setStatus('saving');
      try {
        const response = await fetch(`/api/families/${familyId}/calendar-preferences`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) });
        if (!response.ok) throw new Error('Could not save this choice. Please retry.');
        const value = await response.json();
        if (generation === epoch.current) { setPreferences(value); setStatus('saved'); }
      } catch (error) { if (generation === epoch.current) setStatus('error'); throw error; }
    });
    queue.current = operation.catch(() => undefined);
    return operation;
  }, [familyId]);
  return { preferences, status, update, retry: () => setAttempt(value => value + 1) };
}
