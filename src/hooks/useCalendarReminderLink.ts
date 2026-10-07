'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CalendarEvent } from '@/types/calendar.types';
import { toCalendarEventResponse } from '@/lib/calendarEventMapping';

export const REMINDER_LINK_FETCH_TIMEOUT_MS = 10_000;

const authoritativeEvent = (row: any): CalendarEvent => {
  const dates = { createdAt: new Date(row.createdAt), updatedAt: new Date(row.updatedAt) };
  if (row.eventDate && row.eventTime) {
    return { priority: 'medium', status: 'confirmed', cost: 0,
      ...toCalendarEventResponse({ ...row, ...dates, eventDate: new Date(row.eventDate), eventTime: new Date(row.eventTime) }),
    };
  }
  return { ...row, ...dates };
};

export const useCalendarReminderLink = (
  _events: CalendarEvent[], openTravel: (event: CalendarEvent) => void, openEvent: (event: CalendarEvent) => void,
  familyId?: string | null,
) => {
  const handled = useRef<string | null>(null);
  const callbacks = useRef({ openTravel, openEvent });
  callbacks.current = { openTravel, openEvent };
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const requestedId = typeof window === 'undefined' ? null : new URL(window.location.href).searchParams.get('event');
  useEffect(() => {
    if (!requestedId || !familyId || handled.current === `${familyId}:${requestedId}`) return;
    const controller = new AbortController();
    let active = true;
    const timeout = window.setTimeout(() => controller.abort(), REMINDER_LINK_FETCH_TIMEOUT_MS);
    setLoading(true);
    setError(null);
    // Cached events can predate travel metadata; never choose an editor from that snapshot.
    void (async () => {
      try {
        const response = await fetch(`/api/families/${encodeURIComponent(familyId)}/events`, {
          cache: 'no-store', signal: controller.signal,
        });
        if (!response.ok) throw new Error('Could not load current event details.');
        const rows: unknown = await response.json();
        if (!Array.isArray(rows)) throw new Error('Could not load current event details.');
        const row = rows.find((item) => item?.id === requestedId);
        if (!row) throw new Error('This event is no longer available.');
        const event = authoritativeEvent(row);
        const url = new URL(window.location.href);
        if (!active || controller.signal.aborted || url.searchParams.get('event') !== requestedId) return;
        if (event.travel || event.metadata?.travel || event.workStatus?.type === 'travel') callbacks.current.openTravel(event);
        else callbacks.current.openEvent(event);
        handled.current = `${familyId}:${requestedId}`;
        url.searchParams.delete('event');
        window.history.replaceState(window.history.state, '', url.toString());
      } catch (failure) {
        if (active) setError(controller.signal.aborted ? 'Loading event details timed out. Please retry.'
          : failure instanceof Error ? failure.message : 'Could not load current event details.');
      } finally {
        window.clearTimeout(timeout);
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [familyId, requestedId, attempt]);
  return { loading, error, retry };
};
