import { runCalendarAssistant } from '@/utils/calendarAssistant';
import type { CalendarEvent, Person } from '@/types/calendar.types';

const people: Person[] = [
  { id: 'child-1', name: 'Angela', color: '#147c72', icon: '👧', role: 'Child' },
  { id: 'child-2', name: 'Askia', color: '#3855c8', icon: '🧒', role: 'Child' },
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

  it('prepares each holiday club day instead of incorrectly using today', () => {
    const response = runCalendarAssistant({
      command: 'add Angela holiday club 20th to 24th July 2026, 9am to 3pm',
      events: [],
      people,
      today: new Date('2026-07-17T09:00:00Z'),
    });

    expect(response.action).toBe('create');
    expect(response.drafts).toHaveLength(5);
    expect(response.drafts?.map((draft) => draft.date)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
    ]);
    expect(response.drafts?.every((draft) => draft.time === '09:00' && draft.duration === 360)).toBe(true);
    expect(response.warnings).not.toContain('I could not confidently find a date, so I used today.');
  });

  it('creates weekly after-school club drafts with the named child and useful defaults', () => {
    const response = runCalendarAssistant({
      command: 'add after-school club every Monday at 3:30pm for Askia',
      events: [],
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(response.action).toBe('create');
    expect(response.draft).toMatchObject({
      title: 'After School Club',
      person: 'child-2',
      date: '2026-07-13',
      time: '15:30',
      duration: 90,
      recurring: 'weekly',
      isRecurring: true,
      type: 'education',
      priority: 'high',
    });
  });

  it('warns when a multi-child event uses the default assignee', () => {
    const response = runCalendarAssistant({
      command: 'create swimming lesson next Tuesday at 5pm',
      events: [],
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(response.draft?.person).toBe('child-1');
    expect(response.warnings).toContain('No child was named, so I assigned this to Angela.');
  });

  it('creates gym drafts as quick fitness events', () => {
    const response = runCalendarAssistant({
      command: 'add gyming tomorrow at 6:30am for Angela',
      events: [],
      people,
      today: new Date('2026-07-06T09:00:00Z'),
    });

    expect(response.action).toBe('create');
    expect(response.draft).toMatchObject({
      title: 'Gyming',
      person: 'child-1',
      date: '2026-07-07',
      time: '06:30',
      duration: 60,
      recurring: 'none',
      isRecurring: false,
      type: 'fitness',
    });
  });
});

describe('sentences without a command verb (regression)', () => {
  const parents: Person[] = [
    ...people,
    { id: 'p1', name: 'Ade', color: '#000', icon: '👨', role: 'Parent' },
  ];

  it('creates an event from natural phrasing', () => {
    const result = runCalendarAssistant({
      command: 'Angela has swimming on Tuesdays at 5',
      events: [],
      people: parents,
      today: new Date('2026-09-02T09:00:00'),
    });
    expect(result.action).toBe('create');
    expect(result.draft?.title).toBe('Swimming');
    expect(result.draft?.person).toBe('child-1');
    expect(result.draft?.time).toBe('17:00');
    expect(result.draft?.recurringPattern?.frequency).toBe('weekly');
  });

  it('creates a task when there is a deadline', () => {
    const result = runCalendarAssistant({
      command: 'Askia has maths homework due Sunday',
      events: [],
      people: parents,
      today: new Date('2026-09-02T09:00:00'),
    });
    expect(result.taskDraft?.dueDate).toBe('2026-09-06');
    expect(result.taskDraft?.assignees).toEqual(['child-2']);
    expect(result.taskDraft?.subject).toBe('Maths');
  });

  it('asks who it is for rather than guessing a child', () => {
    const result = runCalendarAssistant({
      command: 'football training every Saturday at 10am',
      events: [],
      people: parents,
      today: new Date('2026-09-02T09:00:00'),
    });
    expect(result.needs).toContain('assignee');
    expect(result.warnings.join(' ')).toContain('Who is this for');
    expect(result.draft?.person).toBe('');
  });
});
