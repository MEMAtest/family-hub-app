'use client';

import { useEffect, useRef } from 'react';
import type { CalendarEvent } from '@/types/calendar.types';

export const useCalendarReminderLink = (
  events: CalendarEvent[], openTravel: (event: CalendarEvent) => void, openEvent: (event: CalendarEvent) => void,
) => {
  const handled = useRef<string | null>(null);
  useEffect(() => {
    const url = new URL(window.location.href);
    const requestedId = url.searchParams.get('event');
    if (!requestedId || handled.current === requestedId) return;
    const event = events.find((item) => item.id === requestedId);
    if (!event) return;
    handled.current = requestedId;
    if (event.travel || event.metadata?.travel || event.workStatus?.type === 'travel') openTravel(event);
    else openEvent(event);
    url.searchParams.delete('event');
    window.history.replaceState(window.history.state, '', url.toString());
  }, [events, openTravel, openEvent]);
};
