import type { CalendarEvent } from '@/types/calendar.types';

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

export const toCalendarEventResponse = (event: any) => ({
  ...event,
  date: toDateKey(event.eventDate),
  endDate: inferEndDate(event.eventDate, event.eventTime, event.durationMinutes),
  time: toTimeKey(event.eventTime),
  person: event.personId,
  duration: event.durationMinutes,
  type: event.eventType,
  recurring: event.recurringPattern,
  source: event.source ?? undefined,
  sourceId: event.sourceId ?? undefined,
  googleCalendarId: event.googleCalendarId ?? undefined,
  googleEventId: event.googleEventId ?? undefined,
});

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
    recurringPattern: draft.recurring || 'none',
    isRecurring: draft.isRecurring || false,
    notes: draft.notes || '',
    source: draft.source,
    sourceId: draft.sourceId,
    googleCalendarId: draft.googleCalendarId,
    googleEventId: draft.googleEventId,
  };
};
