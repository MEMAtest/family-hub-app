import type { CalendarEvent, Person } from '@/types/calendar.types';
import type { InAppNotification } from '@/types/notification.types';
import { getScheduleHealthInsights } from '@/utils/scheduleHealth';
import { isFamilyReminder } from '@/lib/familyReminderContract';
import { addDays, expandEvents } from '@/utils/recurrence';

export const homePickupWarnings = (events: CalendarEvent[], people: Person[], date?: string) => {
  const active = events.filter(event => !event.metadata?.schoolImportReview);
  const occurrences = date ? expandEvents(active, date, addDays(date, 6)).map(item => ({
    ...item.event, ...item.overrides, date: item.date, time: item.time, duration: item.duration,
    endDate: item.endDate, occurrenceDate: item.date,
  })) : active;
  return getScheduleHealthInsights(occurrences, people).filter(insight =>
    ['availability', 'conflict', 'coverage'].includes(insight.kind) &&
    occurrences.some(event => (insight.relatedEventIds ?? [insight.eventId]).includes(event.id) &&
      (/\bpick[ -]?up|\bcollect(?:ion)?\b/i.test(event.title) ||
        (event.workStatus ?? event.metadata?.workStatus as CalendarEvent['workStatus'])?.affectsPickup ||
        (event.travel ?? event.metadata?.travel as CalendarEvent['travel'])?.coverage?.some(item => /\bpick[ -]?up|\bcollect(?:ion)?\b/i.test(item.title)))));
};

export const explicitCoverReminder = (event: CalendarEvent, notifications: InAppNotification[], now: Date) => {
  if (event.status === 'cancelled' || event.metadata?.status === 'cancelled' || event.metadata?.schoolImportReview) return;
  const travel = event.travel ?? event.metadata?.travel as CalendarEvent['travel'];
  if (!travel?.coordinatorPersonIds?.length || !travel.coverage?.some(item => ['unknown', 'outstanding'].includes(item.status))) return;
  return notifications.find(notification => isFamilyReminder(notification) && notification.relatedEventId === event.id &&
    notification.metadata?.purpose === 'coverage' && notification.metadata?.canAct === true &&
    notification.metadata?.occurrence === (event.occurrenceDate ?? event.date) &&
    notification.recipientPersonId && notification.recipientPersonId !== event.person && travel.coordinatorPersonIds!.includes(notification.recipientPersonId) &&
    notification.actionRequired && notification.expiresAt && new Date(notification.expiresAt) > now &&
    (!notification.snoozedUntil || new Date(notification.snoozedUntil) <= now));
};
