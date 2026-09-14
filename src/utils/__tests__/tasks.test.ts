import type { CalendarTask } from '@/types/calendar.types';
import {
  compareByUrgency,
  daysUntilDue,
  expandTasks,
  formatTaskLabel,
  getTaskStatus,
  tasksActiveOn,
} from '@/utils/tasks';

const makeTask = (overrides: Partial<CalendarTask> = {}): CalendarTask => ({
  id: 'task-1',
  title: 'Fractions worksheet',
  assignees: ['child-1'],
  assignedDate: '2026-09-02', // Wednesday
  dueDate: '2026-09-06', // Sunday
  taskType: 'homework',
  subject: 'Maths',
  priority: 'medium',
  createdAt: new Date('2026-09-02T00:00:00Z'),
  updatedAt: new Date('2026-09-02T00:00:00Z'),
  ...overrides,
});

describe('the core requirement: set Wednesday, due Sunday', () => {
  it('spans the whole window, not a single point in time', () => {
    const [occ] = expandTasks([makeTask()], '2026-09-01', '2026-09-30');
    expect(occ.assignedDate).toBe('2026-09-02');
    expect(occ.dueDate).toBe('2026-09-06');
  });

  it('is active on every day between being set and being due', () => {
    const occurrences = expandTasks([makeTask()], '2026-09-01', '2026-09-30');
    expect(tasksActiveOn(occurrences, '2026-09-02')).toHaveLength(1); // set
    expect(tasksActiveOn(occurrences, '2026-09-04')).toHaveLength(1); // mid-window
    expect(tasksActiveOn(occurrences, '2026-09-06')).toHaveLength(1); // due
    expect(tasksActiveOn(occurrences, '2026-09-01')).toHaveLength(0); // before
    expect(tasksActiveOn(occurrences, '2026-09-07')).toHaveLength(0); // after
  });

  it('still shows when it was set before the window but is due inside it', () => {
    const task = makeTask({ assignedDate: '2026-08-28', dueDate: '2026-09-03' });
    expect(expandTasks([task], '2026-09-01', '2026-09-30')).toHaveLength(1);
  });
});

describe('status', () => {
  const task = makeTask();

  it('reports the right status as the deadline approaches', () => {
    expect(getTaskStatus(task, '2026-09-01')).toBe('not-started');
    expect(getTaskStatus(task, '2026-09-02')).toBe('in-progress');
    expect(getTaskStatus(task, '2026-09-04')).toBe('due-soon');
    expect(getTaskStatus(task, '2026-09-06')).toBe('due-today');
    expect(getTaskStatus(task, '2026-09-07')).toBe('overdue');
  });

  it('treats a completed task as done regardless of date', () => {
    const done = makeTask({ completedAt: '2026-09-03T18:00:00Z' });
    expect(getTaskStatus(done, '2026-09-30')).toBe('completed');
  });

  it('counts days to the deadline, negative once past', () => {
    expect(daysUntilDue(task, '2026-09-02')).toBe(4);
    expect(daysUntilDue(task, '2026-09-06')).toBe(0);
    expect(daysUntilDue(task, '2026-09-09')).toBe(-3);
  });

  it('sorts outstanding work by deadline, then priority, with done last', () => {
    const sorted = [
      makeTask({ id: 'c', dueDate: '2026-09-10', completedAt: '2026-09-03T00:00:00Z' }),
      makeTask({ id: 'a', dueDate: '2026-09-08', priority: 'low' }),
      makeTask({ id: 'b', dueDate: '2026-09-08', priority: 'high' }),
      makeTask({ id: 'd', dueDate: '2026-09-05' }),
    ].sort(compareByUrgency);
    expect(sorted.map((t) => t.id)).toEqual(['d', 'b', 'a', 'c']);
  });
});

describe('repeating work', () => {
  it('repeats weekly and keeps the set-to-due gap on every instance', () => {
    const task = makeTask({
      recurringPattern: { frequency: 'weekly', interval: 1 },
    });
    const occurrences = expandTasks([task], '2026-09-01', '2026-09-30');

    expect(occurrences.map((o) => [o.assignedDate, o.dueDate])).toEqual([
      ['2026-09-02', '2026-09-06'],
      ['2026-09-09', '2026-09-13'],
      ['2026-09-16', '2026-09-20'],
      ['2026-09-23', '2026-09-27'],
      ['2026-09-30', '2026-10-04'],
    ]);
  });

  it('only marks the first instance complete when the parent record is', () => {
    const task = makeTask({
      completedAt: '2026-09-05T10:00:00Z',
      recurringPattern: { frequency: 'weekly', interval: 1 },
    });
    const occurrences = expandTasks([task], '2026-09-01', '2026-09-20');
    expect(occurrences[0].completedAt).toBe('2026-09-05T10:00:00Z');
    expect(occurrences[1].completedAt).toBeNull();
  });

  it('gives each instance a unique id', () => {
    const task = makeTask({ recurringPattern: { frequency: 'weekly', interval: 1 } });
    const ids = expandTasks([task], '2026-09-01', '2026-09-30').map((o) => o.occurrenceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('labels', () => {
  it('leads with the subject and ends with the deadline', () => {
    const [occ] = expandTasks([makeTask()], '2026-09-01', '2026-09-30');
    expect(formatTaskLabel(occ)).toBe('Maths: Fractions worksheet — due Sun');
  });

  it('says today and tomorrow rather than the weekday when it is close', () => {
    const [occ] = expandTasks([makeTask()], '2026-09-01', '2026-09-30');
    expect(formatTaskLabel(occ, '2026-09-06')).toContain('due today');
    expect(formatTaskLabel(occ, '2026-09-05')).toContain('due tomorrow');
    expect(formatTaskLabel(occ, '2026-09-08')).toContain('overdue');
  });

  it('ticks off completed work', () => {
    const [occ] = expandTasks(
      [makeTask({ completedAt: '2026-09-03T00:00:00Z' })],
      '2026-09-01',
      '2026-09-30'
    );
    expect(formatTaskLabel(occ)).toBe('✓ Maths: Fractions worksheet');
  });
});

describe('rejects nonsense', () => {
  it('ignores tasks with malformed dates rather than crashing the grid', () => {
    expect(expandTasks([makeTask({ dueDate: 'whenever' })], '2026-09-01', '2026-09-30')).toEqual([]);
  });

  it('handles a same-day task', () => {
    const task = makeTask({ assignedDate: '2026-09-02', dueDate: '2026-09-02' });
    const [occ] = expandTasks([task], '2026-09-01', '2026-09-30');
    expect(occ.assignedDate).toBe(occ.dueDate);
  });
});
