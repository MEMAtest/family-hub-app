import type { CalendarTask } from '@/types/calendar.types';
import { buildTaskEntries, getTaskEntryStyle, isTaskEntry } from '@/utils/taskCalendar';

const makeTask = (o: Partial<CalendarTask> = {}): CalendarTask => ({
  id: 'task-1',
  title: 'Fractions worksheet',
  assignees: ['child-1'],
  assignedDate: '2026-09-02',
  dueDate: '2026-09-06',
  taskType: 'homework',
  subject: 'Maths',
  priority: 'medium',
  createdAt: new Date('2026-09-02T00:00:00Z'),
  updatedAt: new Date('2026-09-02T00:00:00Z'),
  ...o,
});

/**
 * The grid works in local time, so a band's start/end are local-midnight Dates.
 * Reading them back with toISOString() would compare against UTC and fail
 * anywhere east or west of Greenwich — which is every British summer.
 */
const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

describe('drawing a task on the calendar', () => {
  it('renders as an all-day band from set date to due date', () => {
    const [entry] = buildTaskEntries([makeTask()], '2026-09-01', '2026-09-30', '2026-09-03');
    expect(entry.allDay).toBe(true);
    expect(localDate(entry.start)).toBe('2026-09-02');
    expect(isTaskEntry(entry)).toBe(true);
  });

  it('ends the band after the due date, because all-day ends are exclusive', () => {
    // A band ending at Sunday 00:00 would not cover Sunday at all.
    const [entry] = buildTaskEntries([makeTask()], '2026-09-01', '2026-09-30', '2026-09-03');
    expect(localDate(entry.end)).toBe('2026-09-07');
  });

  it('says what it is and when it is due', () => {
    const [entry] = buildTaskEntries([makeTask()], '2026-09-01', '2026-09-30', '2026-09-03');
    expect(entry.title).toBe('Maths: Fractions worksheet — due Sun');
  });

  it('does not collide with event ids', () => {
    const [entry] = buildTaskEntries([makeTask()], '2026-09-01', '2026-09-30', '2026-09-03');
    expect(entry.id.startsWith('task:')).toBe(true);
  });
});

describe('urgency drives the colour', () => {
  const cases: Array<[string, string]> = [
    ['2026-09-01', 'not-started'],
    ['2026-09-02', 'in-progress'],
    ['2026-09-05', 'due-soon'],
    ['2026-09-06', 'due-today'],
    ['2026-09-08', 'overdue'],
  ];

  it.each(cases)('on %s the band is %s', (today, expected) => {
    const [entry] = buildTaskEntries([makeTask()], '2026-08-01', '2026-09-30', today);
    expect(entry.status).toBe(expected);
  });

  it('strikes through and fades completed work', () => {
    const [entry] = buildTaskEntries(
      [makeTask({ completedAt: '2026-09-03T00:00:00Z' })],
      '2026-09-01',
      '2026-09-30',
      '2026-09-04'
    );
    const { style } = getTaskEntryStyle(entry);
    expect(entry.status).toBe('completed');
    expect(style.textDecoration).toBe('line-through');
    expect(style.opacity).toBeLessThan(1);
  });

  it('gives overdue work a red band', () => {
    const [entry] = buildTaskEntries([makeTask()], '2026-08-01', '2026-09-30', '2026-09-10');
    expect(getTaskEntryStyle(entry).style.borderColor).toBe('#dc2626');
  });

  it('marks the start edge dashed and the deadline edge solid', () => {
    const [entry] = buildTaskEntries([makeTask()], '2026-09-01', '2026-09-30', '2026-09-03');
    const { style } = getTaskEntryStyle(entry);
    expect(style.borderLeftStyle).toBe('dashed');
    expect(style.borderRightStyle).toBe('solid');
  });
});

describe('repeating homework', () => {
  it('draws a band for every week', () => {
    const entries = buildTaskEntries(
      [makeTask({ recurringPattern: { frequency: 'weekly', interval: 1 } })],
      '2026-09-01',
      '2026-09-30',
      '2026-09-03'
    );
    expect(entries).toHaveLength(5);
    expect(new Set(entries.map((e) => e.id)).size).toBe(5);
  });
});
