import type { CalendarEvent, Person } from '@/types/calendar.types';
import { formatMinutesAsClock, getEventWindowForDate } from '@/utils/calendarConflicts';
import { hasUnspecifiedEventTime } from '@/utils/eventSemantics';
import { schoolSavedEventAttendance } from '@/utils/schoolSources';

export type ScheduleHealthInsight = {
  id: string;
  kind: 'conflict' | 'duplicate' | 'availability' | 'owner' | 'time' | 'coverage' | 'preparation';
  title: string;
  detail: string;
  eventId?: string;
  relatedEventIds?: string[];
  occurrenceDate: string;
};
const personName = (event: CalendarEvent, people: Person[]) =>
  people.find((person) => person.id === event.person)?.name;
const workStatus = (event: CalendarEvent) => event.workStatus ?? event.metadata?.workStatus as CalendarEvent['workStatus'];
const presence = (event: CalendarEvent) => {
  const work = workStatus(event);
  return work && ['office', 'remote', 'client_site'].includes(work.type) ? work.type :
    /^(?:in (?:the )?office|office|work from home|working from home|wfh|home working)$/i.test(event.title.trim())
      ? /home|wfh/i.test(event.title) ? 'remote' : 'office' : null;
};
const untimedNotice = (event: CalendarEvent) => hasUnspecifiedEventTime(event) &&
  (event.duration >= 1440 || /\b(notice|newsletter|term dates|inset|non.uniform|photo day)\b/i.test(event.title));
const normalizedTitle = (event: CalendarEvent) => event.title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const needsAttendance = (event: CalendarEvent) =>
  !['other', 'work', 'brain'].includes(event.type) || Boolean(event.attendees?.length) ||
  /\b(pick[ -]?up|collect(?:ion)?|attend(?:ance)?|meeting|appointment|dentist|pta)\b/i.test(event.title);

export const getScheduleHealthInsights = (
  events: CalendarEvent[],
  people: Person[]
): ScheduleHealthInsight[] => {
  const insights: ScheduleHealthInsight[] = [];
  const knownPeople = new Set(people.map((person) => person.id));
  const activeEvents = events.filter((event) => event.status !== 'cancelled' && event.metadata?.status !== 'cancelled' && !event.metadata?.binCollection && event.sourceId !== 'council-bin-calendar');

  activeEvents.forEach((event) => {
    const owner = personName(event, people);
    if (!event.person || !knownPeople.has(event.person)) {
      insights.push({
        id: `owner-${event.id}-${event.occurrenceDate ?? event.date}`,
        kind: 'owner',
        title: `${event.title} needs an owner`,
        detail: 'Choose the family member this applies to.',
        eventId: event.id,
        occurrenceDate: event.occurrenceDate ?? event.date,
      });
    }
    if (hasUnspecifiedEventTime(event) && !untimedNotice(event) && !presence(event)) {
      insights.push({
        id: `time-${event.id}-${event.occurrenceDate ?? event.date}`,
        kind: 'time',
        title: `${event.title} needs a time`,
        detail: `${event.date}${owner ? ` · ${owner}` : ''}`,
        eventId: event.id,
        occurrenceDate: event.occurrenceDate ?? event.date,
      });
    }

    const travel = event.travel ?? event.metadata?.travel as CalendarEvent['travel'];
    const openCoverage = travel?.coverage?.filter((item) => item.status === 'unknown' || item.status === 'outstanding') ?? [];
    if (openCoverage.length > 0) {
      insights.push({
        id: `coverage-${event.id}-${event.occurrenceDate ?? event.date}`,
        kind: 'coverage',
        title: `Cover to confirm for ${event.title}`,
        detail: openCoverage.map((item) => item.title).join(' · '),
        eventId: event.id,
        occurrenceDate: event.occurrenceDate ?? event.date,
      });
    } else if ((travel || workStatus(event)?.affectsPickup) && !travel?.coverage?.length) {
      insights.push({
        id: `coverage-${event.id}-${event.occurrenceDate ?? event.date}`,
        kind: 'coverage',
        title: travel ? 'Travel cover is not recorded' : 'Pickup cover is not recorded',
        detail: `${event.title}${owner ? ` · ${owner}` : ''}`,
        eventId: event.id,
        occurrenceDate: event.occurrenceDate ?? event.date,
      });
    }

    const openPreparation = travel?.preparation?.filter((item) => item.status === 'unknown' || item.status === 'outstanding') ?? [];
    if (openPreparation.length > 0) {
      insights.push({
        id: `preparation-${event.id}-${event.occurrenceDate ?? event.date}`,
        kind: 'preparation',
        title: `Preparation for ${event.title}`,
        detail: openPreparation.map((item) => item.title).join(' · '),
        eventId: event.id,
        occurrenceDate: event.occurrenceDate ?? event.date,
      });
    }
  });

  const byPerson = new Map<string, CalendarEvent[]>();
  activeEvents.forEach((event) => {
    if (hasUnspecifiedEventTime(event) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(event.time)) return;
    const attendance = schoolSavedEventAttendance(event, people);
    const participants = new Set([attendance.attendeePersonId, ...(event.attendees ?? [])]);
    participants.forEach((id) => {
      if (id && knownPeople.has(id)) byPerson.set(id, [...(byPerson.get(id) ?? []), event]);
    });
  });
  byPerson.forEach((personEvents, personId) => {
    for (let first = 0; first < personEvents.length; first += 1) {
      for (let second = first + 1; second < personEvents.length; second += 1) {
        const a = personEvents[first];
        const b = personEvents[second];
        const date = a.date > b.date ? a.date : b.date;
        const left = getEventWindowForDate(a, date);
        const right = getEventWindowForDate(b, date);
        if (!left || !right || left.startMinute >= right.endMinute || right.startMinute >= left.endMinute) continue;
        const owner = people.find((person) => person.id === personId)?.name ?? 'One person';
        const duplicate = normalizedTitle(a) === normalizedTitle(b) && a.date === b.date && a.time === b.time && a.endDate === b.endDate && a.duration === b.duration;
        const presenceEvent = presence(a) ? a : presence(b) ? b : null;
        if (!duplicate && presence(a) && presence(b)) continue;
        if (!duplicate && presenceEvent && !needsAttendance(presenceEvent === a ? b : a)) continue;
        if (!duplicate && presenceEvent && presence(presenceEvent) === 'remote' && !workStatus(presenceEvent)?.affectsPickup) continue;
        const kind = duplicate ? 'duplicate' : presenceEvent ? 'availability' : 'conflict';
        const start = Math.max(left.startMinute, right.startMinute);
        const end = Math.min(left.endMinute, right.endMinute);
        const range = (window: typeof left) => `${formatMinutesAsClock(window.startMinute)}-${formatMinutesAsClock(window.endMinute)}`;
        const pair = [
          `${a.id}:${a.occurrenceDate ?? a.date}:${range(left)}`,
          `${b.id}:${b.occurrenceDate ?? b.date}:${range(right)}`,
        ].sort().join('|');
        const linkedEvent = presenceEvent === a ? b : a;
        insights.push({
          id: `${kind}-${personId}-${date}-${pair}`,
          kind,
          title: duplicate ? 'Probable duplicate plans' : presenceEvent ? `Check ${owner}'s availability` : `${owner} has overlapping plans`,
          detail: `${a.title} (${range(left)}) and ${b.title} (${range(right)}) · ${date}. ` +
            (duplicate ? 'These may be the same plan; check before removing either.' :
              `${end - start} min overlap, ${formatMinutesAsClock(start)}-${formatMinutesAsClock(end)}.` +
              (presenceEvent ? ' Work location is availability only; confirm pickup or attendance.' : '')),
          eventId: linkedEvent.id,
          relatedEventIds: [a.id, b.id].sort(),
          occurrenceDate: linkedEvent.occurrenceDate ?? linkedEvent.date,
        });
      }
    }
  });

  const order: ScheduleHealthInsight['kind'][] = ['conflict', 'duplicate', 'availability', 'coverage', 'preparation', 'owner', 'time'];
  return insights.sort((left, right) => order.indexOf(left.kind) - order.indexOf(right.kind));
};
