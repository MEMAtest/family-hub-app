import type { CalendarEvent, RecurringPattern } from '@/types/calendar.types';

const RICH_RECURRENCE_PREFIX = 'kinboard:v1:';

const richFields = ['workStatus', 'travel', 'reminders', 'reminderPreferences', 'attendees', 'priority', 'status', 'color'] as const;
const objectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};

/** Only editable event fields enter metadata; server-owned provenance stays intact. */
export const mergeCalendarEventMetadata = (input: Record<string, unknown>, previous?: unknown) => {
  const result = { ...objectRecord(previous) };
  const nested = objectRecord(input.metadata);
  for (const key of richFields) {
    const value = input[key] !== undefined ? input[key] : nested[key];
    if (value !== undefined) result[key] = value;
  }
  return JSON.parse(JSON.stringify(result)) as Record<string, any>;
};

export const readCalendarEventMetadata = (value: unknown): Partial<CalendarEvent> => {
  const record = objectRecord(value);
  const result: Record<string, unknown> = {};
  for (const key of richFields) if (record[key] !== undefined) result[key] = record[key];
  return { ...result, metadata: record } as Partial<CalendarEvent>;
};

const isRecurringPattern = (value: unknown): value is RecurringPattern => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const pattern = value as Partial<RecurringPattern>;
  return ['daily', 'weekly', 'monthly', 'yearly'].includes(String(pattern.frequency)) &&
    Number.isInteger(pattern.interval) && Number(pattern.interval) > 0 &&
    (pattern.daysOfWeek === undefined || (
      Array.isArray(pattern.daysOfWeek) &&
      pattern.daysOfWeek.every((day) => Number.isInteger(day) && day >= 0 && day <= 6)
    ));
};

/** Store richer recurrence rules in the existing text column without changing legacy values. */
export const encodeStoredRecurringPattern = (value: unknown, richPattern?: unknown) => {
  if (typeof value === 'string' && value.startsWith(RICH_RECURRENCE_PREFIX)) return value;
  const pattern = isRecurringPattern(richPattern) ? richPattern : isRecurringPattern(value) ? value : null;
  if (pattern) return `${RICH_RECURRENCE_PREFIX}${JSON.stringify(pattern)}`;
  return value === 'weekly' || value === 'monthly' || value === 'yearly' ? value : 'none';
};

export const decodeStoredRecurringPattern = (value: unknown): {
  recurring: CalendarEvent['recurring'];
  recurringPattern?: RecurringPattern;
} => {
  if (typeof value !== 'string') return { recurring: 'none' };
  if (value.startsWith(RICH_RECURRENCE_PREFIX)) {
    try {
      const pattern: unknown = JSON.parse(value.slice(RICH_RECURRENCE_PREFIX.length));
      if (isRecurringPattern(pattern)) {
        return {
          recurring: pattern.frequency === 'daily' ? 'none' : pattern.frequency,
          recurringPattern: pattern,
        };
      }
    } catch {
      return { recurring: 'none' };
    }
  }
  if (value === 'weekly' || value === 'monthly' || value === 'yearly') return { recurring: value };
  return { recurring: 'none' };
};

export const buildUtcDateTime = (
  dateValue?: string | null,
  timeValue?: string | null,
  fallback?: Date | string | null
) => {
  if (dateValue) {
    const [year, month, day] = dateValue.split('-').map(Number);
    const [hours, minutes] = (timeValue || '00:00').split(':').map(Number);
    return new Date(Date.UTC(year, month - 1, day, hours || 0, minutes || 0, 0, 0));
  }

  if (fallback) {
    return new Date(fallback);
  }

  return new Date();
};

export const toDateKey = (value: Date) => value.toISOString().split('T')[0];

export const toTimeKey = (value: Date) => {
  const hours = value.getUTCHours().toString().padStart(2, '0');
  const minutes = value.getUTCMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const inferEndDate = (eventDate: Date, eventTime: Date, durationMinutes?: number | null) => {
  if (!durationMinutes || durationMinutes <= 0) return undefined;
  const date = toDateKey(eventDate);
  const time = toTimeKey(eventTime);
  const start = buildUtcDateTime(date, time);
  const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
  const endDate = toDateKey(end);
  return endDate > date ? endDate : undefined;
};

export const toCalendarEventResponse = (event: any) => {
  const recurrence = decodeStoredRecurringPattern(event.recurringPattern);
  return {
    ...event,
    ...readCalendarEventMetadata(event.metadata),
    date: toDateKey(event.eventDate),
    endDate: inferEndDate(event.eventDate, event.eventTime, event.durationMinutes),
    time: toTimeKey(event.eventTime),
    person: event.personId,
    duration: event.durationMinutes,
    type: event.eventType,
    ...recurrence,
    source: event.source ?? undefined,
    sourceId: event.sourceId ?? undefined,
    googleCalendarId: event.googleCalendarId ?? undefined,
    googleEventId: event.googleEventId ?? undefined,
  };
};

export const calendarEventDraftToDbData = (
  familyId: string,
  draft: Omit<CalendarEvent, 'id' | 'createdAt' | 'updatedAt'> & {
    source?: string;
    sourceId?: string;
    googleCalendarId?: string;
    googleEventId?: string;
  }
) => {
  const dateTime = buildUtcDateTime(draft.date, draft.time);

  return {
    familyId,
    personId: draft.person,
    title: draft.title,
    description: '',
    eventDate: dateTime,
    eventTime: dateTime,
    durationMinutes: draft.duration || 60,
    location: draft.location || '',
    cost: draft.cost || 0,
    eventType: draft.type || 'other',
    recurringPattern: encodeStoredRecurringPattern(draft.recurring, draft.recurringPattern),
    isRecurring: draft.isRecurring || false,
    notes: draft.notes || '',
    source: draft.source,
    sourceId: draft.sourceId,
    googleCalendarId: draft.googleCalendarId,
    googleEventId: draft.googleEventId,
    metadata: mergeCalendarEventMetadata(draft as unknown as Record<string, unknown>, draft.metadata),
  };
};
