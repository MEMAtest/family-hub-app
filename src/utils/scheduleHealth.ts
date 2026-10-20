import type { CalendarEvent, Person } from '@/types/calendar.types';
import { getEventWindowForDate } from '@/utils/calendarConflicts';
import { hasUnspecifiedEventTime } from '@/utils/eventSemantics';

export type ScheduleHealthInsight = {
  id: string;
  kind: 'conflict' | 'owner' | 'time' | 'coverage' | 'preparation';
  title: string;
  detail: string;
  eventId?: string;
};
const personName = (event: CalendarEvent, people: Person[]) =>
  people.find((person) => person.id === event.person)?.name;

export const getScheduleHealthInsights = (
  events: CalendarEvent[],
  people: Person[]
): ScheduleHealthInsight[] => {
  const insights: ScheduleHealthInsight[] = [];
  const knownPeople = new Set(people.map((person) => person.id));

  events.forEach((event) => {
    const owner = personName(event, people);
    if (!event.person || !knownPeople.has(event.person)) {
      insights.push({
        id: `owner-${event.id}`,
        kind: 'owner',
        title: `${event.title} needs an owner`,
        detail: 'Choose the family member this applies to.',
        eventId: event.id,
      });
    }
    if (hasUnspecifiedEventTime(event)) {
      insights.push({
        id: `time-${event.id}`,
        kind: 'time',
        title: `${event.title} needs a time`,
        detail: `${event.date}${owner ? ` · ${owner}` : ''}`,
        eventId: event.id,
      });
    }

    const travel = event.travel ?? event.metadata?.travel as CalendarEvent['travel'];
    const openCoverage = travel?.coverage?.filter((item) => item.status === 'unknown' || item.status === 'outstanding') ?? [];
    if (openCoverage.length > 0) {
      insights.push({
        id: `coverage-${event.id}`,
        kind: 'coverage',
        title: `Cover to confirm for ${event.title}`,
        detail: openCoverage.map((item) => item.title).join(' · '),
        eventId: event.id,
      });
    } else if ((travel || event.workStatus?.affectsPickup) && !travel?.coverage?.length) {
      insights.push({
        id: `coverage-${event.id}`,
        kind: 'coverage',
        title: travel ? 'Travel cover is not recorded' : 'Pickup cover is not recorded',
        detail: `${event.title}${owner ? ` · ${owner}` : ''}`,
        eventId: event.id,
      });
    }

    const openPreparation = travel?.preparation?.filter((item) => item.status === 'unknown' || item.status === 'outstanding') ?? [];
    if (openPreparation.length > 0) {
      insights.push({
        id: `preparation-${event.id}`,
        kind: 'preparation',
        title: `Preparation for ${event.title}`,
        detail: openPreparation.map((item) => item.title).join(' · '),
        eventId: event.id,
      });
    }
  });

  const byPersonAndDate = new Map<string, CalendarEvent[]>();
  events.forEach((event) => {
    if (!event.person || !knownPeople.has(event.person) || hasUnspecifiedEventTime(event)) return;
    const key = `${event.person}-${event.date}`;
    byPersonAndDate.set(key, [...(byPersonAndDate.get(key) ?? []), event]);
  });
  byPersonAndDate.forEach((personEvents) => {
    for (let first = 0; first < personEvents.length; first += 1) {
      for (let second = first + 1; second < personEvents.length; second += 1) {
        const left = getEventWindowForDate(personEvents[first], personEvents[first].date);
        const right = getEventWindowForDate(personEvents[second], personEvents[second].date);
        if (!left || !right || left.startMinute >= right.endMinute || right.startMinute >= left.endMinute) continue;
        const owner = personName(personEvents[first], people);
        insights.push({
          id: `conflict-${[personEvents[first].id, personEvents[second].id].sort().join('-')}`,
          kind: 'conflict',
          title: `${owner ?? 'One person'} has overlapping plans`,
          detail: `${personEvents[first].title} and ${personEvents[second].title} · ${personEvents[first].date}`,
          eventId: personEvents[first].id,
        });
      }
    }
  });

  const order: ScheduleHealthInsight['kind'][] = ['conflict', 'coverage', 'preparation', 'owner', 'time'];
  return insights.sort((left, right) => order.indexOf(left.kind) - order.indexOf(right.kind));
};
