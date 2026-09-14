import type { CalendarEvent, RecurringPattern } from '@/types/calendar.types';

/**
 * Recurrence expansion.
 *
 * A recurring event is stored as a SINGLE row with one `date`. Nothing
 * previously turned that into the dates it actually falls on, which is why a
 * weekly event only ever appeared on the day it was created.
 *
 * Everything answering "what is on between X and Y" must go through
 * `expandOccurrences` / `expandEvents`: the month grid, week view, agenda,
 * assistant search, conflict detection and the weekly digest email. One code
 * path, one answer.
 *
 * All arithmetic is done on `YYYY-MM-DD` strings via UTC-noon Date objects.
 * Noon rather than midnight means a BST/GMT transition can never push a date
 * onto the previous or next day.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** A single materialised instance of an event on a specific date. */
export interface Occurrence {
  /** `${event.id}:${seriesDate}` — stable and unique. Use as the React key. */
  occurrenceId: string;
  /** The event this came from. Never mutated. */
  event: CalendarEvent;
  /** The date this instance falls on, `YYYY-MM-DD`. */
  date: string;
  /** `HH:MM`. Normally the event's time; an override can change it. */
  time: string;
  /** Duration in minutes. An override can change it. */
  duration: number;
  /** Last date this instance covers — differs from `date` for multi-day events. */
  endDate: string;
  /** The date this instance would have fallen on before any override moved it. */
  seriesDate: string;
  /** True when this is one instance of a repeating series (not a one-off). */
  isRecurring: boolean;
  /** True when an exception changed this instance. */
  isOverridden: boolean;
  /** Fields an override replaced, for "edited" badges in the UI. */
  overrides?: RecurrenceOverrideFields;
}

export type RecurrenceOverrideFields = Partial<
  Pick<CalendarEvent, 'title' | 'time' | 'duration' | 'location' | 'notes' | 'status' | 'person'>
> & {
  /** Move this one instance to a different date. */
  date?: string;
};

/**
 * A change that applies to ONE instance of a series.
 *
 * Without this, cancelling a single swimming lesson means deleting the whole
 * series — the most common way recurring calendars lose data.
 */
export interface RecurrenceException {
  id: string;
  eventId: string;
  /** The date in the original series this applies to, `YYYY-MM-DD`. */
  seriesDate: string;
  /** `skip` removes the instance; `override` changes it. */
  type: 'skip' | 'override';
  overrides?: RecurrenceOverrideFields;
}

export interface ExpandOptions {
  /**
   * Ceiling on instances generated per event, protecting against a pattern
   * with no end date over a large range. Default 750.
   */
  maxOccurrences?: number;
}

// ---------------------------------------------------------------------------
// Date helpers — all operate on `YYYY-MM-DD` strings
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const pad = (n: number) => String(n).padStart(2, '0');

export const isDateKey = (value: unknown): value is string =>
  typeof value === 'string' && DATE_RE.test(value);

/** Parse `YYYY-MM-DD` to a Date fixed at 12:00 UTC (DST-proof). */
export const parseDateKey = (key: string): Date | null => {
  if (!isDateKey(key)) return null;
  const [y, m, d] = key.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // Rejects impossible dates like 2026-02-31, which JS would otherwise roll over.
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
};

export const toDateKey = (date: Date): string =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

export const addDays = (key: string, days: number): string => {
  const date = parseDateKey(key);
  if (!date) return key;
  date.setUTCDate(date.getUTCDate() + days);
  return toDateKey(date);
};

/**
 * Add months without rolling over. Returns null when the target month has no
 * such day (31 Jan + 1 month), matching RFC 5545 BYMONTHDAY, which skips rather
 * than clamping. Skipping is the safer default: a "pay rent on the 31st" series
 * silently becoming the 28th of February is a worse surprise than a missing
 * month.
 */
export const addMonthsStrict = (key: string, months: number): string | null => {
  const date = parseDateKey(key);
  if (!date) return null;
  const day = date.getUTCDate();
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 12, 0, 0));
  const daysInTarget = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12, 0, 0)
  ).getUTCDate();
  if (day > daysInTarget) return null;
  target.setUTCDate(day);
  return toDateKey(target);
};

/** 29 February only exists in leap years — skip, don't slide to the 28th. */
export const addYearsStrict = (key: string, years: number): string | null =>
  addMonthsStrict(key, years * 12);

/** 0 = Sunday … 6 = Saturday. */
export const dayOfWeek = (key: string): number => {
  const date = parseDateKey(key);
  return date ? date.getUTCDay() : 0;
};

const addMinutesToTime = (time: string, minutes: number) => {
  const [h = 0, m = 0] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const dayShift = Math.floor(total / (24 * 60));
  const rem = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return { time: `${pad(Math.floor(rem / 60))}:${pad(rem % 60)}`, dayShift };
};

// ---------------------------------------------------------------------------
// Pattern normalisation
// ---------------------------------------------------------------------------

/**
 * The event model carries three overlapping recurrence fields: `recurring`
 * (string), `isRecurring` (boolean) and `recurringPattern` (the rich object).
 * Only the rich object can express what the app needs. This reconciles them so
 * expansion has one shape to deal with, and so existing rows — which only ever
 * stored the string — keep working with no migration.
 *
 * `recurringPattern` wins when present.
 */
export const resolvePattern = (event: CalendarEvent): RecurringPattern | null => {
  const raw = event.recurringPattern;

  if (raw && typeof raw === 'object' && raw.frequency) {
    return { ...raw, interval: raw.interval && raw.interval > 0 ? raw.interval : 1 };
  }

  const legacy = event.recurring;
  if (!legacy || legacy === 'none') return null;
  if (legacy !== 'weekly' && legacy !== 'monthly' && legacy !== 'yearly') return null;

  const pattern: RecurringPattern = { frequency: legacy, interval: 1 };
  if (legacy === 'weekly') {
    // Anchor to the weekday the series started on.
    pattern.daysOfWeek = [dayOfWeek(event.date)];
  }
  return pattern;
};

export const isRecurringEvent = (event: CalendarEvent): boolean => resolvePattern(event) !== null;

// ---------------------------------------------------------------------------
// Expansion
// ---------------------------------------------------------------------------

const DEFAULT_MAX = 750;

const buildOccurrence = (
  event: CalendarEvent,
  seriesDate: string,
  isRecurring: boolean,
  override?: RecurrenceOverrideFields
): Occurrence => {
  const date = override?.date ?? seriesDate;
  const time = override?.time ?? event.time ?? '09:00';
  const duration = override?.duration ?? event.duration ?? 60;

  // Multi-day events carry an explicit endDate; preserve that span when the
  // series repeats. Otherwise derive it from a duration crossing midnight.
  let endDate = date;
  if (event.endDate && event.endDate > event.date) {
    const from = parseDateKey(event.date);
    const to = parseDateKey(event.endDate);
    if (from && to) {
      endDate = addDays(date, Math.round((to.getTime() - from.getTime()) / 86_400_000));
    }
  } else {
    const { dayShift } = addMinutesToTime(time, duration);
    if (dayShift > 0) endDate = addDays(date, dayShift);
  }

  return {
    occurrenceId: `${event.id}:${seriesDate}`,
    event,
    date,
    time,
    duration,
    endDate,
    seriesDate,
    isRecurring,
    isOverridden: Boolean(override),
    overrides: override,
  };
};

/**
 * Expand one event into every instance touching [rangeStart, rangeEnd].
 *
 * Non-recurring events return at most one occurrence. Recurring events are
 * walked from their own start date so `endAfter` counts the true series
 * position, not the position within the requested window.
 */
export const expandOccurrences = (
  event: CalendarEvent,
  rangeStart: string,
  rangeEnd: string,
  exceptions: RecurrenceException[] = [],
  options: ExpandOptions = {}
): Occurrence[] => {
  if (!event || !isDateKey(event.date)) return [];
  if (!isDateKey(rangeStart) || !isDateKey(rangeEnd) || rangeEnd < rangeStart) return [];

  const max = options.maxOccurrences ?? DEFAULT_MAX;
  const pattern = resolvePattern(event);
  const byDate = new Map(
    exceptions.filter((ex) => ex.eventId === event.id).map((ex) => [ex.seriesDate, ex])
  );

  // --- One-off -------------------------------------------------------------
  if (!pattern) {
    const ex = byDate.get(event.date);
    if (ex?.type === 'skip') return [];
    const occ = buildOccurrence(event, event.date, false, ex?.overrides);
    return occ.endDate >= rangeStart && occ.date <= rangeEnd ? [occ] : [];
  }

  // --- Series --------------------------------------------------------------
  const interval = pattern.interval && pattern.interval > 0 ? pattern.interval : 1;
  const seriesEnd =
    pattern.endDate && isDateKey(pattern.endDate) && pattern.endDate < rangeEnd
      ? pattern.endDate
      : rangeEnd;

  const results: Occurrence[] = [];
  let emitted = 0; // counts toward endAfter, including instances before the range
  let guard = 0;

  const consider = (seriesDate: string): boolean => {
    if (pattern.endAfter && emitted >= pattern.endAfter) return false;
    emitted += 1;

    const ex = byDate.get(seriesDate);
    if (ex?.type === 'skip') return true;

    const occ = buildOccurrence(event, seriesDate, true, ex?.overrides);
    // endDate >= rangeStart keeps multi-day events that started before the window.
    if (occ.endDate >= rangeStart && occ.date <= rangeEnd) results.push(occ);
    return true;
  };

  if (pattern.frequency === 'weekly') {
    const days =
      pattern.daysOfWeek && pattern.daysOfWeek.length > 0
        ? [...new Set(pattern.daysOfWeek)].sort((a, b) => a - b)
        : [dayOfWeek(event.date)];

    let weekStart = addDays(event.date, -dayOfWeek(event.date));
    let weekIndex = 0;

    while (weekStart <= seriesEnd && guard < max * 8) {
      guard += 1;
      if (weekIndex % interval === 0) {
        for (const dow of days) {
          const candidate = addDays(weekStart, dow);
          if (candidate < event.date || candidate > seriesEnd) continue;
          if (!consider(candidate)) return results;
          if (results.length >= max) return results;
        }
      }
      weekStart = addDays(weekStart, 7);
      weekIndex += 1;
    }
    return results;
  }

  if (pattern.frequency === 'daily') {
    let cursor = event.date;
    while (cursor <= seriesEnd && guard < max * 8) {
      guard += 1;
      if (!consider(cursor)) return results;
      if (results.length >= max) return results;
      cursor = addDays(cursor, interval);
    }
    return results;
  }

  if (pattern.frequency === 'monthly' || pattern.frequency === 'yearly') {
    const stepMonths = (pattern.frequency === 'yearly' ? 12 : 1) * interval;

    // dayOfMonth lets a series say "the 15th" independently of its start date.
    let anchor = event.date;
    if (pattern.frequency === 'monthly' && pattern.dayOfMonth) {
      const d = parseDateKey(event.date);
      if (d) {
        const candidate = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(pattern.dayOfMonth)}`;
        if (parseDateKey(candidate)) anchor = candidate;
      }
    }

    let step = 0;
    while (guard < max * 8) {
      guard += 1;
      const candidate = addMonthsStrict(anchor, step * stepMonths);
      step += 1;

      // A skipped month (e.g. the 31st of February) must not stop the series.
      if (candidate === null) {
        if (step > max) break;
        continue;
      }
      if (candidate > seriesEnd) break;
      if (candidate < event.date) continue;
      if (!consider(candidate)) return results;
      if (results.length >= max) return results;
    }
    return results;
  }

  return results;
};

/** Expand a list of events and return every occurrence in range, date-sorted. */
export const expandEvents = (
  events: CalendarEvent[],
  rangeStart: string,
  rangeEnd: string,
  exceptions: RecurrenceException[] = [],
  options: ExpandOptions = {}
): Occurrence[] => {
  const out: Occurrence[] = [];
  for (const event of events) {
    out.push(...expandOccurrences(event, rangeStart, rangeEnd, exceptions, options));
  }
  return out.sort((a, b) =>
    a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)
  );
};

/** Occurrences grouped by date key — the shape a month grid wants. */
export const groupOccurrencesByDate = (occurrences: Occurrence[]): Map<string, Occurrence[]> => {
  const map = new Map<string, Occurrence[]>();
  for (const occ of occurrences) {
    // Multi-day events appear on every day they span.
    let cursor = occ.date;
    let guard = 0;
    while (cursor <= occ.endDate && guard < 400) {
      const list = map.get(cursor);
      if (list) list.push(occ);
      else map.set(cursor, [occ]);
      cursor = addDays(cursor, 1);
      guard += 1;
    }
  }
  return map;
};

/**
 * The window to materialise recurring events over for a calendar view.
 *
 * Generous on purpose: a month grid renders leading and trailing days from
 * adjacent months, and Agenda looks forward, so a tight range clips instances
 * at the edges.
 */
export const getExpansionRange = (date: Date, view: string): { start: string; end: string } => {
  const isYear = view === 'YEAR';
  const padMonths = isYear ? 12 : 2;

  const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1, 12, 0, 0));
  start.setUTCMonth(start.getUTCMonth() - padMonths);

  const end = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0, 12, 0, 0));
  end.setUTCMonth(end.getUTCMonth() + padMonths);

  return { start: toDateKey(start), end: toDateKey(end) };
};
