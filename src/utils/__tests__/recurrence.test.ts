import type { CalendarEvent } from '@/types/calendar.types';
import {
  addDays,
  addMonthsStrict,
  expandEvents,
  expandOccurrences,
  getExpansionRange,
  groupOccurrencesByDate,
  parseDateKey,
  resolvePattern,
  type RecurrenceException,
} from '@/utils/recurrence';

const makeEvent = (overrides: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id: 'evt-1',
  title: 'Swimming',
  person: 'child-1',
  date: '2026-09-02', // a Wednesday
  time: '17:00',
  duration: 60,
  recurring: 'none',
  cost: 0,
  type: 'sport',
  isRecurring: false,
  priority: 'medium',
  status: 'confirmed',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

const dates = (occ: ReturnType<typeof expandOccurrences>) => occ.map((o) => o.date);

describe('date helpers', () => {
  it('rejects impossible dates rather than rolling them over', () => {
    expect(parseDateKey('2026-02-31')).toBeNull();
    expect(parseDateKey('2026-13-01')).toBeNull();
    expect(parseDateKey('not-a-date')).toBeNull();
    expect(parseDateKey('2026-02-28')).not.toBeNull();
  });

  it('crosses the BST -> GMT boundary without losing or repeating a day', () => {
    // UK clocks go back on 25 October 2026.
    expect(addDays('2026-10-24', 1)).toBe('2026-10-25');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
  });

  it('crosses the GMT -> BST boundary without losing or repeating a day', () => {
    // UK clocks go forward on 29 March 2026.
    expect(addDays('2026-03-28', 1)).toBe('2026-03-29');
    expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
  });

  it('skips months that have no such day instead of clamping', () => {
    expect(addMonthsStrict('2026-01-31', 1)).toBeNull(); // no 31 February
    expect(addMonthsStrict('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsStrict('2026-01-15', 1)).toBe('2026-02-15');
  });
});

describe('resolvePattern', () => {
  it('returns null for a one-off event', () => {
    expect(resolvePattern(makeEvent())).toBeNull();
  });

  it('upgrades a legacy weekly string, anchored to the start weekday', () => {
    const pattern = resolvePattern(makeEvent({ recurring: 'weekly', isRecurring: true }));
    expect(pattern).toEqual({ frequency: 'weekly', interval: 1, daysOfWeek: [3] }); // Wednesday
  });

  it('prefers recurringPattern over the legacy string', () => {
    const pattern = resolvePattern(
      makeEvent({
        recurring: 'weekly',
        isRecurring: true,
        recurringPattern: { frequency: 'monthly', interval: 2 },
      })
    );
    expect(pattern?.frequency).toBe('monthly');
    expect(pattern?.interval).toBe(2);
  });

  it('defaults a zero or missing interval to 1', () => {
    const pattern = resolvePattern(
      makeEvent({ recurringPattern: { frequency: 'weekly', interval: 0 } })
    );
    expect(pattern?.interval).toBe(1);
  });
});

describe('expandOccurrences — the bug this module exists to fix', () => {
  it('shows a weekly event on every following week, not just the day it was created', () => {
    const event = makeEvent({ recurring: 'weekly', isRecurring: true });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-09-30'))).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
    ]);
  });

  it('returns a one-off event once, and only inside the range', () => {
    const event = makeEvent();
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-09-30'))).toEqual(['2026-09-02']);
    expect(expandOccurrences(event, '2026-10-01', '2026-10-31')).toHaveLength(0);
  });

  it('does not emit occurrences before the series start', () => {
    const event = makeEvent({ recurring: 'weekly', isRecurring: true });
    expect(dates(expandOccurrences(event, '2026-08-01', '2026-09-10'))).toEqual([
      '2026-09-02',
      '2026-09-09',
    ]);
  });

  it('gives every occurrence a distinct, stable id', () => {
    const event = makeEvent({ recurring: 'weekly', isRecurring: true });
    const ids = expandOccurrences(event, '2026-09-01', '2026-09-30').map((o) => o.occurrenceId);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids[0]).toBe('evt-1:2026-09-02');
  });
});

describe('expandOccurrences — intervals and multiple weekdays', () => {
  it('handles fortnightly', () => {
    const event = makeEvent({ recurringPattern: { frequency: 'weekly', interval: 2 } });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-10-15'))).toEqual([
      '2026-09-02',
      '2026-09-16',
      '2026-09-30',
      '2026-10-14',
    ]);
  });

  it('handles several days a week', () => {
    const event = makeEvent({
      recurringPattern: { frequency: 'weekly', interval: 1, daysOfWeek: [1, 3] }, // Mon + Wed
    });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-09-16'))).toEqual([
      '2026-09-02',
      '2026-09-07',
      '2026-09-09',
      '2026-09-14',
      '2026-09-16',
    ]);
  });

  it('handles daily with an interval', () => {
    const event = makeEvent({ recurringPattern: { frequency: 'daily', interval: 3 } });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-09-12'))).toEqual([
      '2026-09-02',
      '2026-09-05',
      '2026-09-08',
      '2026-09-11',
    ]);
  });

  it('handles monthly, skipping months without the day', () => {
    const event = makeEvent({
      date: '2026-01-31',
      recurringPattern: { frequency: 'monthly', interval: 1 },
    });
    // February and April have no 31st, so those months are skipped entirely
    // rather than silently sliding to the 28th or 30th.
    expect(dates(expandOccurrences(event, '2026-01-01', '2026-05-01'))).toEqual([
      '2026-01-31',
      '2026-03-31',
    ]);
  });

  it('keeps a monthly series going after a skipped month', () => {
    const event = makeEvent({
      date: '2026-01-31',
      recurringPattern: { frequency: 'monthly', interval: 1 },
    });
    // Regression guard: a skipped month must not terminate the series.
    expect(dates(expandOccurrences(event, '2026-05-01', '2026-08-01'))).toEqual([
      '2026-05-31',
      '2026-07-31',
    ]);
  });

  it('handles yearly', () => {
    const event = makeEvent({ recurringPattern: { frequency: 'yearly', interval: 1 } });
    expect(dates(expandOccurrences(event, '2026-01-01', '2029-01-01'))).toEqual([
      '2026-09-02',
      '2027-09-02',
      '2028-09-02',
    ]);
  });
});

describe('expandOccurrences — series endings', () => {
  it('stops at endDate', () => {
    const event = makeEvent({
      recurringPattern: { frequency: 'weekly', interval: 1, endDate: '2026-09-17' },
    });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-12-31'))).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
    ]);
  });

  it('stops after endAfter occurrences', () => {
    const event = makeEvent({ recurringPattern: { frequency: 'weekly', interval: 1, endAfter: 3 } });
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-12-31'))).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
    ]);
  });

  it('counts endAfter from the series start, not from the start of the window', () => {
    // Regression guard: querying a later window must not restart the count and
    // resurrect a series that has already finished.
    const event = makeEvent({ recurringPattern: { frequency: 'weekly', interval: 1, endAfter: 3 } });
    expect(expandOccurrences(event, '2026-10-01', '2026-12-31')).toHaveLength(0);
  });
});

describe('expandOccurrences — exceptions', () => {
  const event = makeEvent({ recurring: 'weekly', isRecurring: true });

  it('skips a single cancelled week without touching the rest of the series', () => {
    const exceptions: RecurrenceException[] = [
      { id: 'ex-1', eventId: 'evt-1', seriesDate: '2026-09-09', type: 'skip' },
    ];
    expect(dates(expandOccurrences(event, '2026-09-01', '2026-09-23', exceptions))).toEqual([
      '2026-09-02',
      '2026-09-16',
      '2026-09-23',
    ]);
  });

  it('moves a single instance to another day', () => {
    const exceptions: RecurrenceException[] = [
      {
        id: 'ex-2',
        eventId: 'evt-1',
        seriesDate: '2026-09-09',
        type: 'override',
        overrides: { date: '2026-09-10', time: '18:30' },
      },
    ];
    const result = expandOccurrences(event, '2026-09-01', '2026-09-16', exceptions);
    const moved = result.find((o) => o.seriesDate === '2026-09-09');

    expect(moved?.date).toBe('2026-09-10');
    expect(moved?.time).toBe('18:30');
    expect(moved?.isOverridden).toBe(true);
    expect(result.find((o) => o.seriesDate === '2026-09-16')?.time).toBe('17:00');
  });

  it('ignores exceptions belonging to a different event', () => {
    const exceptions: RecurrenceException[] = [
      { id: 'ex-3', eventId: 'other-event', seriesDate: '2026-09-09', type: 'skip' },
    ];
    expect(expandOccurrences(event, '2026-09-01', '2026-09-16', exceptions)).toHaveLength(3);
  });

  it('applies a skip to a one-off event too', () => {
    const exceptions: RecurrenceException[] = [
      { id: 'ex-4', eventId: 'evt-1', seriesDate: '2026-09-02', type: 'skip' },
    ];
    expect(expandOccurrences(makeEvent(), '2026-09-01', '2026-09-30', exceptions)).toHaveLength(0);
  });
});

describe('expandOccurrences — spans and safety', () => {
  it('keeps a multi-day event that started before the window', () => {
    const event = makeEvent({ date: '2026-08-28', endDate: '2026-09-04', duration: 0 });
    const result = expandOccurrences(event, '2026-09-01', '2026-09-30');
    expect(result).toHaveLength(1);
    expect(result[0].endDate).toBe('2026-09-04');
  });

  it('rolls endDate forward when a duration crosses midnight', () => {
    const event = makeEvent({ time: '23:00', duration: 120 });
    expect(expandOccurrences(event, '2026-09-01', '2026-09-30')[0].endDate).toBe('2026-09-03');
  });

  it('respects maxOccurrences on an open-ended series', () => {
    const event = makeEvent({ recurringPattern: { frequency: 'daily', interval: 1 } });
    expect(
      expandOccurrences(event, '2026-09-02', '2030-01-01', [], { maxOccurrences: 10 })
    ).toHaveLength(10);
  });

  it('returns nothing for a malformed or inverted range', () => {
    const event = makeEvent({ recurring: 'weekly', isRecurring: true });
    expect(expandOccurrences(event, '2026-09-30', '2026-09-01')).toHaveLength(0);
    expect(expandOccurrences(event, 'rubbish', '2026-09-30')).toHaveLength(0);
    expect(
      expandOccurrences(makeEvent({ date: 'rubbish' }), '2026-09-01', '2026-09-30')
    ).toHaveLength(0);
  });
});

describe('expandEvents and grouping', () => {
  it('merges several events and sorts by date then time', () => {
    const events = [
      makeEvent({ id: 'a', date: '2026-09-09', time: '08:00' }),
      makeEvent({ id: 'b', recurring: 'weekly', isRecurring: true, time: '17:00' }),
      makeEvent({ id: 'c', date: '2026-09-09', time: '07:00' }),
    ];
    expect(
      expandEvents(events, '2026-09-01', '2026-09-10').map(
        (o) => `${o.date} ${o.time} ${o.event.id}`
      )
    ).toEqual([
      '2026-09-02 17:00 b',
      '2026-09-09 07:00 c',
      '2026-09-09 08:00 a',
      '2026-09-09 17:00 b',
    ]);
  });

  it('places a multi-day event on every day it spans', () => {
    const event = makeEvent({ date: '2026-09-01', endDate: '2026-09-03', duration: 0 });
    const grouped = groupOccurrencesByDate(expandOccurrences(event, '2026-09-01', '2026-09-30'));
    expect([...grouped.keys()].sort()).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
  });
});

describe('getExpansionRange — the window the grid asks for', () => {
  it('covers the month plus padding either side, so edge days are not clipped', () => {
    const range = getExpansionRange(new Date(2026, 8, 14), 'month'); // Sept 2026
    expect(range.start).toBe('2026-07-01');
    expect(range.end).toBe('2026-11-30');
  });

  it('widens for the year view', () => {
    const range = getExpansionRange(new Date(2026, 8, 14), 'YEAR');
    expect(range.start).toBe('2025-09-01');
    expect(range.end).toBe('2027-09-30');
  });
});

describe('end to end: what the calendar grid actually receives', () => {
  // The original bug in one test. Before the fix, CalendarMain mapped each
  // event row to exactly one grid entry, so a weekly event produced one.
  it('turns a single weekly event row into one grid entry per week', () => {
    const weekly = makeEvent({ recurring: 'weekly', isRecurring: true });
    const { start, end } = getExpansionRange(new Date(2026, 8, 14), 'month');

    const gridEntries = expandEvents([weekly], start, end).map((occ) => ({
      id: occ.occurrenceId,
      title: occ.event.title,
      date: occ.date,
    }));

    const september = gridEntries.filter((e) => e.date.startsWith('2026-09'));
    expect(september.map((e) => e.date)).toEqual([
      '2026-09-02',
      '2026-09-09',
      '2026-09-16',
      '2026-09-23',
      '2026-09-30',
    ]);

    // Every grid entry needs a unique React key, or rows get reused across weeks.
    expect(new Set(gridEntries.map((e) => e.id)).size).toBe(gridEntries.length);
  });
});

describe('rows that were already materialised into instances', () => {
  const swimming = (date: string, time = '08:00'): CalendarEvent => ({
    id: `swim-${date}-${time}`,
    title: 'Swimming Lesson',
    person: 'child-1',
    date,
    time,
    duration: 60,
    recurring: 'weekly',
    isRecurring: true,
    cost: 0,
    type: 'sport',
    priority: 'medium',
    status: 'confirmed',
    createdAt: new Date('2025-10-04T23:29:03Z'),
    updatedAt: new Date('2025-10-04T23:29:03Z'),
  });

  it('does not turn one weekly lesson stored as twelve rows into twelve series', () => {
    // Real data: creating "swimming every week" once wrote a row per week and
    // marked every one recurring. Expanding each of them stacked twelve
    // identical lessons on every single week, for ever.
    const rows = [
      '2025-10-26', '2025-11-02', '2025-11-09', '2025-11-16',
      '2025-11-23', '2025-11-30', '2025-12-07', '2025-12-14',
      '2025-12-21', '2025-12-28',
    ].map((d) => swimming(d));

    const occurrences = expandEvents(rows, '2026-09-14', '2026-09-20');
    expect(occurrences).toHaveLength(0);

    // Each still appears exactly once, on the day it was stored for.
    const inTerm = expandEvents(rows, '2025-10-20', '2025-11-10');
    expect(inTerm.map((o) => o.date)).toEqual(['2025-10-26', '2025-11-02', '2025-11-09']);
  });

  it('still expands a genuine series stored as a single row', () => {
    const occurrences = expandEvents([swimming('2026-09-06', '08:45')], '2026-09-01', '2026-09-30');
    expect(occurrences.map((o) => o.date)).toEqual(['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27']);
  });

  it('keeps two different times apart rather than lumping them together', () => {
    // The same live data had two rows at 07:00 and ten at 08:00.
    const rows = [swimming('2025-10-12', '07:00'), swimming('2025-10-19', '07:00'), swimming('2025-10-26')];
    const occurrences = expandEvents(rows, '2025-10-01', '2025-10-31');
    expect(occurrences.map((o) => `${o.date} ${o.time}`)).toEqual([
      '2025-10-12 07:00',
      '2025-10-19 07:00',
      '2025-10-26 08:00',
    ]);
  });

  it('does not confuse two children with the same club', () => {
    const a = { ...swimming('2026-09-06'), id: 'a', person: 'child-1' };
    const b = { ...swimming('2026-09-06'), id: 'b', person: 'child-2' };
    // One row each: both are genuine series and both must expand.
    const occurrences = expandEvents([a, b], '2026-09-01', '2026-09-20');
    expect(occurrences).toHaveLength(6);
  });
});
