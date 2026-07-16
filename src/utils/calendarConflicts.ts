import type { CalendarEvent } from '@/types/calendar.types';

export interface CalendarEventWindow {
  event: CalendarEvent;
  startMinute: number;
  endMinute: number;
}

export interface SameDayConflictGroup {
  id: string;
  startMinute: number;
  endMinute: number;
  events: CalendarEvent[];
}

const MINUTES_PER_DAY = 24 * 60;

export const parseClockToMinutes = (time: string | undefined) => {
  const match = (time || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return 0;

  const hours = Math.min(Math.max(Number(match[1]), 0), 23);
  const minutes = Math.min(Math.max(Number(match[2]), 0), 59);
  return hours * 60 + minutes;
};

export const formatMinutesAsClock = (minutes: number) => {
  const bounded = Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
  if (bounded === MINUTES_PER_DAY) return '24:00';

  const hours = Math.floor(bounded / 60);
  const mins = bounded % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

export const getEventWindowForDate = (
  event: CalendarEvent,
  date: string
): CalendarEventWindow | null => {
  const eventEndDate = event.endDate || event.date;
  if (event.date > date || eventEndDate < date) return null;

  const startMinute = event.date === date ? parseClockToMinutes(event.time) : 0;
  const rawEndMinute = eventEndDate === date
    ? startMinute + Math.max(event.duration || 0, 1)
    : MINUTES_PER_DAY;
  const endMinute = Math.min(Math.max(rawEndMinute, startMinute + 1), MINUTES_PER_DAY);

  return {
    event,
    startMinute,
    endMinute,
  };
};

const windowsOverlap = (first: CalendarEventWindow, second: CalendarEventWindow) =>
  first.startMinute < second.endMinute && second.startMinute < first.endMinute;

export const getSameDayConflictGroups = (
  events: CalendarEvent[],
  date: string
): SameDayConflictGroup[] => {
  const windows = events
    .map((event) => getEventWindowForDate(event, date))
    .filter((window): window is CalendarEventWindow => Boolean(window));

  if (windows.length < 2) return [];

  const parents = windows.map((_, index) => index);
  const find = (index: number): number => {
    if (parents[index] !== index) {
      parents[index] = find(parents[index]);
    }
    return parents[index];
  };
  const union = (first: number, second: number) => {
    const firstRoot = find(first);
    const secondRoot = find(second);
    if (firstRoot !== secondRoot) {
      parents[secondRoot] = firstRoot;
    }
  };

  for (let first = 0; first < windows.length; first += 1) {
    for (let second = first + 1; second < windows.length; second += 1) {
      if (windowsOverlap(windows[first], windows[second])) {
        union(first, second);
      }
    }
  }

  const grouped = new Map<number, CalendarEventWindow[]>();
  windows.forEach((window, index) => {
    const root = find(index);
    grouped.set(root, [...(grouped.get(root) || []), window]);
  });

  return Array.from(grouped.values())
    .filter((group) => group.length > 1)
    .map((group) => {
      const sorted = group
        .slice()
        .sort((a, b) => a.startMinute - b.startMinute || a.event.title.localeCompare(b.event.title));
      const startMinute = Math.min(...sorted.map((window) => window.startMinute));
      const endMinute = Math.max(...sorted.map((window) => window.endMinute));

      return {
        id: sorted.map((window) => window.event.id).sort().join('|'),
        startMinute,
        endMinute,
        events: sorted.map((window) => window.event),
      };
    })
    .sort((a, b) => a.startMinute - b.startMinute || a.events[0].title.localeCompare(b.events[0].title));
};

export const formatConflictGroupTimeRange = (group: SameDayConflictGroup) =>
  `${formatMinutesAsClock(group.startMinute)}-${formatMinutesAsClock(group.endMinute)}`;
