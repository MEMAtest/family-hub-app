import type { CalendarEvent, CalendarTask, Person } from '@/types/calendar.types';
import { buildWeeklyDigest, mondayOf, formatDayLabel } from '@/lib/weeklyDigest';
import { renderWeeklyDigestSubject, renderWeeklyDigestText } from '@/lib/weeklyDigestEmail';

const people: Person[] = [
  { id: 'p1', name: 'Amari', color: '#147c72', icon: 'A', role: 'Child' },
  { id: 'p2', name: 'Askia', color: '#8b5cf6', icon: 'K', role: 'Child' },
];

const event = (over: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'e1',
  title: 'Swimming lesson',
  person: 'p1',
  date: '2026-09-02',
  time: '17:00',
  duration: 60,
  recurring: 'weekly',
  isRecurring: true,
  cost: 0,
  type: 'sport',
  priority: 'medium',
  status: 'confirmed',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  ...over,
});

const task = (over: Partial<CalendarTask> = {}): CalendarTask => ({
  id: 't1',
  title: 'Fractions worksheet',
  assignees: ['p1'],
  assignedDate: '2026-09-09',
  dueDate: '2026-09-16',
  taskType: 'homework',
  subject: 'Maths',
  priority: 'medium',
  createdAt: new Date('2026-09-09T00:00:00Z'),
  updatedAt: new Date('2026-09-09T00:00:00Z'),
  ...over,
});

/** Monday 14 September 2026. */
const WEEK = '2026-09-14';

describe('the week a digest describes', () => {
  it('includes a repeating event that was created weeks earlier', () => {
    // The whole reason this had to wait for recurrence: a digest built from
    // stored rows would list this once, in the week it was created, and never
    // again — a weekly summary silently missing everything weekly.
    const digest = buildWeeklyDigest([event()], [], people, WEEK);
    expect(digest.eventCount).toBe(1);
    expect(digest.days.find((d) => d.date === '2026-09-16')?.entries[0]).toMatchObject({
      title: 'Swimming lesson',
      time: '17:00',
      who: 'Amari',
    });
  });

  it('covers exactly seven days, Monday to Sunday', () => {
    const digest = buildWeeklyDigest([], [], people, WEEK);
    expect(digest.days).toHaveLength(7);
    expect(digest.days[0].label).toBe('Monday 14 September');
    expect(digest.days[6].label).toBe('Sunday 20 September');
    expect(digest.weekEnd).toBe('2026-09-20');
  });

  it('leaves out a series that ended before the week', () => {
    const digest = buildWeeklyDigest(
      [event({ recurringPattern: { frequency: 'weekly', interval: 1, endDate: '2026-09-09' } })],
      [],
      people,
      WEEK
    );
    expect(digest.eventCount).toBe(0);
  });

  it('orders a day by time, not by insertion', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'late', title: 'Swimming', date: '2026-09-15', time: '17:00', recurring: 'none', isRecurring: false }),
        event({ id: 'early', title: 'Breakfast club', date: '2026-09-15', time: '07:45', recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.days[1].entries.map((e) => e.title)).toEqual(['Breakfast club', 'Swimming']);
  });

  it('names the busiest day', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'a', date: '2026-09-15', recurring: 'none', isRecurring: false }),
        event({ id: 'b', date: '2026-09-15', time: '18:30', recurring: 'none', isRecurring: false }),
        event({ id: 'c', date: '2026-09-17', recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.busiestDay).toEqual({ label: 'Tuesday 15 September', count: 2 });
  });

  it('totals what the week costs', () => {
    const digest = buildWeeklyDigest(
      [event({ recurring: 'none', isRecurring: false, date: '2026-09-15', cost: 12.5 })],
      [],
      people,
      WEEK
    );
    expect(digest.totalCost).toBe(12.5);
  });

  it('ignores a cancelled event', () => {
    const digest = buildWeeklyDigest([event({ status: 'cancelled' })], [], people, WEEK);
    expect(digest.eventCount).toBe(0);
  });
});

describe('homework in the digest', () => {
  it('lists work set before the week but due inside it', () => {
    // Set the previous Wednesday, due this Wednesday — the common shape.
    const digest = buildWeeklyDigest([], [task()], people, WEEK);
    expect(digest.tasks).toHaveLength(1);
    expect(digest.tasks[0]).toMatchObject({ title: 'Fractions worksheet', dueLabel: 'Wednesday 16 September', who: 'Amari' });
  });

  it('leaves out work already done', () => {
    const digest = buildWeeklyDigest([], [task({ completedAt: '2026-09-10T00:00:00Z' })], people, WEEK);
    expect(digest.tasks).toHaveLength(0);
  });

  it('leaves out work due after the week', () => {
    const digest = buildWeeklyDigest([], [task({ dueDate: '2026-09-25' })], people, WEEK);
    expect(digest.tasks).toHaveLength(0);
  });

  it('names everyone a shared task belongs to', () => {
    const digest = buildWeeklyDigest([], [task({ assignees: ['p1', 'p2'] })], people, WEEK);
    expect(digest.tasks[0].who).toBe('Amari & Askia');
  });
});

describe('clashes', () => {
  it('catches one person in two places at once', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'swim', title: 'Swimming', date: '2026-09-15', time: '17:00', duration: 60, recurring: 'none', isRecurring: false }),
        event({ id: 'foot', title: 'Football', date: '2026-09-15', time: '17:30', duration: 60, recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.clashes).toHaveLength(1);
    expect(digest.clashes[0]).toMatchObject({ who: 'Amari', label: 'Tuesday 15 September' });
  });

  it('does not call two different children a clash', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'swim', person: 'p1', date: '2026-09-15', time: '17:00', recurring: 'none', isRecurring: false }),
        event({ id: 'foot', person: 'p2', date: '2026-09-15', time: '17:00', recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.clashes).toHaveLength(0);
  });

  it('catches a clash between two separate weekly series', () => {
    // Neither event's stored row falls in this week; only expansion finds this.
    const digest = buildWeeklyDigest(
      [
        event({ id: 'swim', title: 'Swimming', date: '2026-08-18', time: '17:00', duration: 60 }),
        event({ id: 'tutor', title: 'Tutoring', date: '2026-08-18', time: '17:30', duration: 60 }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.clashes).toHaveLength(1);
  });

  it('does not flag back-to-back events that merely touch', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'a', date: '2026-09-15', time: '16:00', duration: 60, recurring: 'none', isRecurring: false }),
        event({ id: 'b', date: '2026-09-15', time: '17:00', duration: 60, recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(digest.clashes).toHaveLength(0);
  });
});

describe('mondayOf', () => {
  it.each([
    ['2026-09-14', '2026-09-14'], // Monday itself
    ['2026-09-17', '2026-09-14'], // Thursday
    ['2026-09-20', '2026-09-14'], // Sunday belongs to the week that began Monday
    ['2026-09-21', '2026-09-21'], // next Monday
  ])('%s -> %s', (input, expected) => {
    expect(mondayOf(input)).toBe(expected);
  });

  it('is stable across a clock change', () => {
    // 25 October 2026 is the BST -> GMT switch.
    expect(mondayOf('2026-10-25')).toBe('2026-10-19');
    expect(formatDayLabel('2026-10-25')).toBe('Sunday 25 October');
  });
});

describe('the email itself', () => {
  it('says what the week holds in the subject', () => {
    const digest = buildWeeklyDigest([event()], [task()], people, WEEK);
    expect(renderWeeklyDigestSubject(digest, 'My Family')).toBe('My Family this week: 1 thing on, 1 due');
  });

  it('flags clashes in the subject', () => {
    const digest = buildWeeklyDigest(
      [
        event({ id: 'a', date: '2026-09-15', time: '17:00', duration: 60, recurring: 'none', isRecurring: false }),
        event({ id: 'b', date: '2026-09-15', time: '17:30', duration: 60, recurring: 'none', isRecurring: false }),
      ],
      [],
      people,
      WEEK
    );
    expect(renderWeeklyDigestSubject(digest, 'My Family')).toContain('1 clash');
  });

  it('does not pretend a quiet week is busy', () => {
    const digest = buildWeeklyDigest([], [], people, WEEK);
    expect(renderWeeklyDigestSubject(digest, 'My Family')).toBe('My Family: a clear week (14 - 20 September 2026)');
    expect(renderWeeklyDigestText(digest, 'My Family')).toContain('Nothing scheduled');
  });
});
