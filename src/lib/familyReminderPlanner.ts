import { createHash } from 'crypto';
import type { CalendarEvent } from '@/types/calendar.types';
import { addDays, expandEvents, isRecurringEvent, parseDateKey, type RecurrenceException } from '@/utils/recurrence';
import type { FamilyReminderMetadata, TravelReminderContext } from './familyReminderContract';

export type ReminderMember = { id: string; name: string; role?: string; ageGroup?: string };
export type ReminderEvent = CalendarEvent & { metadata?: FamilyReminderMetadata };
export type ReminderPurpose = 'preparation' | 'coverage' | 'bins';
export type ReminderIntent = {
  id: string; stateId: string; eventId: string; occurrence: string;
  recipientPersonId: string; recipientName: string; purpose: ReminderPurpose;
  phase: string; title: string; message: string; dueAt: Date; expiresAt: Date; push: boolean;
  fingerprint: string;
};
export const reminderRecordId = (kind: string, parts: string[]) =>
  `family-reminder-${kind}-${createHash('sha256').update(JSON.stringify(parts)).digest('hex')}`;
export const londonParts = (now: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
}).formatToParts(now).map(({ type, value }) => [type, value]));
export const londonDate = (now: Date) => {
  const p = londonParts(now);
  return `${p.year}-${p.month}-${p.day}`;
};

// Resolve wall time explicitly; choose the earlier autumn overlap and reject spring gaps.
export const wallTimeInstant = (date: string, time: string, zone = 'Europe/London'): Date | null => {
  if (!parseDateKey(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    });
    const target = new Date(`${date}T${time}:00Z`).getTime();
    const matches: Date[] = [];
    // IANA offsets can include quarter hours; derive candidate offsets from nearby instants.
    const offsets = new Set<number>();
    for (const hours of [-36, -12, 0, 12, 36]) {
      const probe = new Date(target + hours * 3_600_000);
      const p = Object.fromEntries(formatter.formatToParts(probe).map(({ type, value }) => [type, value]));
      offsets.add(new Date(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:00Z`).getTime() - probe.getTime());
    }
    for (const offset of offsets) {
      const candidate = new Date(target - offset);
      const p = Object.fromEntries(formatter.formatToParts(candidate).map(({ type, value }) => [type, value]));
      if (`${p.year}-${p.month}-${p.day}` === date && `${p.hour}:${p.minute}` === time) matches.push(candidate);
    }
    return matches.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  } catch { return null; }
};

export const travelContext = (event: ReminderEvent): TravelReminderContext | null => {
  const metadata = event.metadata ?? {};
  const work = metadata.workStatus ?? event.workStatus;
  if (!metadata.travel && !event.travel && work?.type !== 'travel') return null;
  return {
    destination: work?.travelDetails?.destination ?? event.location,
    departureTime: work?.travelDetails?.departureTime,
    returnTime: work?.travelDetails?.returnTime,
    departureTimeZone: 'Europe/London',
    ...(metadata.travel ?? event.travel),
  };
};
export const reminderOccurrenceEvent = (event: ReminderEvent): ReminderEvent => {
  const departureDate = travelContext(event)?.departureDate;
  return !isRecurringEvent(event) && departureDate && parseDateKey(departureDate)
    ? { ...event, date: departureDate } : event;
};
export const reminderFingerprint = (event: ReminderEvent) => createHash('sha256').update(JSON.stringify({
  travel: travelContext(event), person: event.person, date: event.date, status: event.status ?? 'confirmed',
  enabled: event.metadata?.reminderPreferences?.enabled,
  ...(event.metadata?.binCollection ? { binCollection: event.metadata.binCollection } : {}),
})).digest('hex');
const outstanding = (items: TravelReminderContext['preparation']) =>
  (items ?? []).filter((item) => item.status !== 'done' && item.status !== 'not_needed');

export const travelReminderPurposes = (event: ReminderEvent, members: ReminderMember[]) => {
  const travel = travelContext(event);
  if (!travel || event.status === 'cancelled' || event.metadata?.status === 'cancelled' ||
      event.metadata?.reminderPreferences?.enabled === false) return [];
  const traveller = members.find((member) => member.id === event.person);
  if (!traveller) return [];
  const preparation = outstanding(travel.preparation);
  const missing = [!travel.departureTime && 'departure time', !travel.returnDate && 'return date',
    !travel.returnTime && 'return time'].filter(Boolean) as string[];
  const requests: Array<{ recipient: ReminderMember; purpose: ReminderPurpose; message: string }> = [];
  if (missing.length || preparation.length || !travel.preparation?.length) {
    const tasks = preparation.map((item) => item.title);
    requests.push({ recipient: traveller, purpose: 'preparation',
      message: [missing.length ? `Complete ${missing.join(', ')}.` : '',
        tasks.length ? `Check: ${tasks.join('; ')}.` : !travel.preparation?.length ? 'Confirm your travel preparation.' : '']
        .filter(Boolean).join(' ') });
  }
  const coverage = outstanding(travel.coverage);
  if (coverage.length || !travel.coverage?.length) {
    const others = members.filter((member) => member.id !== traveller.id &&
      (/parent|adult/i.test(member.role ?? '') || /adult/i.test(member.ageGroup ?? '')));
    const recipients = travel.coordinatorPersonIds
      ? others.filter((member) => travel.coordinatorPersonIds!.includes(member.id))
      : others.length === 1 ? others : [];
    for (const recipient of recipients) requests.push({ recipient, purpose: 'coverage',
      message: coverage.length ? `Confirm cover: ${coverage.map((item) => item.title).join('; ')}.`
        : `Confirm childcare, pickup or other household cover while ${traveller.name} is away. Nothing has been assigned to you automatically.` });
  }
  return requests;
};

export const eventReminderPurposes = (event: ReminderEvent, members: ReminderMember[]) => {
  const bins = event.metadata?.binCollection;
  if (!bins) return travelReminderPurposes(event, members);
  if (!bins.verified || !parseDateKey(bins.date) || bins.date !== event.date || !bins.services?.length ||
      event.status === 'cancelled' || event.metadata?.status === 'cancelled' || event.metadata?.reminderPreferences?.enabled === false) return [];
  return members.filter(member => /parent|adult/i.test(member.role || '') || /adult/i.test(member.ageGroup || '')).map(recipient => ({
    recipient, purpose: 'bins' as ReminderPurpose, message: `Put out: ${bins.services.join('; ')}. Council collection is ${bins.date}; no collection time is specified.`,
  }));
};

export const planFamilyReminders = (
  familyId: string, events: ReminderEvent[], members: ReminderMember[], now: Date,
  exceptions: RecurrenceException[] = [],
): ReminderIntent[] => {
  const today = londonDate(now);
  const hour = londonParts(now).hour;
  const routine = hour === '08' || hour === '20';
  const intents: ReminderIntent[] = [];
  // Expand the same recurrence model used by the calendar, including each occurrence's identity.
  const occurrenceEvents = events.map(reminderOccurrenceEvent);
  for (const occurrence of expandEvents(occurrenceEvents, today, addDays(today, 1), exceptions)) {
    const event = { ...occurrence.event, ...occurrence.overrides } as ReminderEvent;
    const bins = event.metadata?.binCollection;
    if (bins) {
      // Catch up a missed evening dispatcher tick until midnight, never after collection starts.
      const dueAt = wallTimeInstant(today, '20:00');
      const expiresAt = wallTimeInstant(occurrence.date, '00:00');
      if (occurrence.date !== addDays(today, 1) || !dueAt || !expiresAt || now < dueAt || now >= expiresAt) continue;
      for (const request of eventReminderPurposes(event, members)) {
        const parts = [familyId, event.id, occurrence.date, request.recipient.id, request.purpose];
        const fingerprint = reminderFingerprint(events.find(item => item.id === event.id)!);
        const phase = `${today}-20`;
        intents.push({ id: reminderRecordId('intent', [...parts, phase, fingerprint]), stateId: reminderRecordId('state', parts),
          eventId: event.id, occurrence: occurrence.date, recipientPersonId: request.recipient.id, recipientName: request.recipient.name,
          purpose: 'bins', phase, title: 'Bins tomorrow: put them out tonight', message: request.message, dueAt, expiresAt,
          push: event.metadata?.reminderPreferences?.push !== false, fingerprint });
      }
      continue;
    }
    const travel = travelContext(event);
    if (!travel) continue;
    const departureDate = occurrence.isRecurring ? occurrence.date : travel.departureDate ?? occurrence.date;
    const departure = travel.departureTime
      ? wallTimeInstant(departureDate, travel.departureTime, travel.departureTimeZone) : null;
    const expiry = departure ?? wallTimeInstant(addDays(departureDate, 1), '00:00');
    if (!expiry || expiry <= now || departureDate < today || departureDate > addDays(today, 1)) continue;
    const beforeDeparture = departure && now >= new Date(departure.getTime() - 60 * 60_000) && now < departure;
    // Send on the next dispatcher tick at/after T-60, never after departure.
    const phase = beforeDeparture ? 'departure-60' : routine ? `${today}-${hour}` : null;
    if (!phase) continue;
    for (const request of travelReminderPurposes(event, members)) {
      const parts = [familyId, event.id, occurrence.date, request.recipient.id, request.purpose];
      const fingerprint = reminderFingerprint(events.find((item) => item.id === event.id)!);
      intents.push({
        id: reminderRecordId('intent', [...parts, phase, fingerprint]), stateId: reminderRecordId('state', parts),
        eventId: event.id, occurrence: occurrence.date,
        recipientPersonId: request.recipient.id, recipientName: request.recipient.name,
        purpose: request.purpose, phase, title: request.purpose === 'coverage'
          ? `${request.recipient.name}: confirm travel cover` : `${request.recipient.name}: travel preparation`,
        message: `${event.title} (${departureDate}). ${request.message}`,
        dueAt: beforeDeparture ? new Date(departure!.getTime() - 60 * 60_000)
          : wallTimeInstant(today, `${hour}:00`)!,
        expiresAt: expiry, push: event.metadata?.reminderPreferences?.push !== false,
        fingerprint,
      });
    }
  }
  return intents;
};
