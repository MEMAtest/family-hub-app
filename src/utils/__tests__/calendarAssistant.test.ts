import { runCalendarAssistant } from '@/utils/calendarAssistant';
import type { CalendarEvent, Person } from '@/types/calendar.types';

const people: Person[] = [
  { id: 'child-1', name: 'Angela', color: '#147c72', icon: '👧', role: 'Child' },
];

const event: CalendarEvent = {
  id: 'event-1',
  title: 'Summer Holiday Starts',
  person: 'child-1',
  date: '2026-07-20',
  time: '09:00',
  duration: 60,
  recurring: 'none',
  cost: 0,
  type: 'education',
  notes: 'School holiday',
  isRecurring: false,
  priority: 'high',
  status: 'confirmed',
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('calendar assistant parser', () => {
  it('searches summer holiday events', () => {
    const response = runCalendarAssistant({
      command: 'find summer holidays',
      events: [event],
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(response.action).toBe('search');
    expect(response.results?.[0].id).toBe('event-1');
  });

  it('creates confirmation-first event drafts', () => {
    const response = runCalendarAssistant({
      command: 'create swimming lesson next Tuesday at 5pm',
      events: [],
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(response.action).toBe('create');
    expect(response.draft).toMatchObject({
      title: 'Swimming Lesson',
      person: 'child-1',
      date: '2026-07-07',
      time: '17:00',
      type: 'sport',
    });
  });
});
