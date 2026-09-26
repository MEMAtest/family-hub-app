import type { CalendarTask, TaskStatus } from '@/types/calendar.types';
import {
  addDays,
  dayOfWeek,
  expandOccurrences,
  isDateKey,
  parseDateKey,
  type RecurrenceException,
} from '@/utils/recurrence';
import type { CalendarEvent } from '@/types/calendar.types';

/**
 * Tasks — work with a deadline, as opposed to events, which happen at a time.
 *
 * "Homework set on Wednesday, due Sunday" cannot be expressed as an event: an
 * event is a point (or a block) on one day, and has no notion of being done.
 * A task spans assigned -> due, belongs to one or more people, and is either
 * finished or it isn't.
 *
 * The calendar renders a task as a band across its window with the due end
 * emphasised, so at a glance you can see what is hanging over the week rather
 * than a misleading 30-minute block at an invented time.
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

/** How many days until the due date. Negative means overdue. */
export const daysUntilDue = (task: CalendarTask, today: string): number => {
  const due = parseDateKey(task.dueDate);
  const now = parseDateKey(today);
  if (!due || !now) return 0;
  return Math.round((due.getTime() - now.getTime()) / 86_400_000);
};

/**
 * Status drives every colour and sort order in the UI, so it lives in one place.
 * "due-soon" is within two days, which is the point at which a parent wants to
 * start nudging.
 */
export const getTaskStatus = (task: CalendarTask, today: string): TaskStatus => {
  if (task.completedAt) return 'completed';

  const remaining = daysUntilDue(task, today);
  if (remaining < 0) return 'overdue';
  if (remaining === 0) return 'due-today';
  if (remaining <= 2) return 'due-soon';
  if (today >= task.assignedDate) return 'in-progress';
  return 'not-started';
};

export const isOutstanding = (task: CalendarTask): boolean => !task.completedAt;

/** Sort for any "what needs doing" list: soonest deadline first, done last. */
export const compareByUrgency = (a: CalendarTask, b: CalendarTask): number => {
  if (Boolean(a.completedAt) !== Boolean(b.completedAt)) return a.completedAt ? 1 : -1;
  if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
  const rank = { high: 0, medium: 1, low: 2 } as const;
  return rank[a.priority] - rank[b.priority];
};

// ---------------------------------------------------------------------------
// Occurrences
// ---------------------------------------------------------------------------

export interface TaskOccurrence {
  occurrenceId: string;
  task: CalendarTask;
  assignedDate: string;
  dueDate: string;
  /** Whether this specific instance has been completed. */
  completedAt?: string | null;
  isRecurring: boolean;
}

/**
 * Repeating work ("spellings every Friday, due the following Friday") is stored
 * once and expanded the same way events are, preserving the gap between set and
 * due for every instance.
 *
 * Reuses the event expander rather than reimplementing recurrence, so the two
 * can never drift apart on DST, month-end or endAfter handling.
 */
export const expandTasks = (
  tasks: CalendarTask[],
  rangeStart: string,
  rangeEnd: string,
  exceptions: RecurrenceException[] = []
): TaskOccurrence[] => {
  const out: TaskOccurrence[] = [];

  for (const task of tasks) {
    if (!isDateKey(task.assignedDate) || !isDateKey(task.dueDate)) continue;

    const windowDays = Math.max(
      0,
      Math.round(
        ((parseDateKey(task.dueDate)?.getTime() ?? 0) -
          (parseDateKey(task.assignedDate)?.getTime() ?? 0)) /
          86_400_000
      )
    );

    if (!task.recurringPattern) {
      // Include a task whose window overlaps the range at all, so something set
      // last week and due this week still shows.
      if (task.dueDate >= rangeStart && task.assignedDate <= rangeEnd) {
        out.push({
          occurrenceId: `${task.id}:${task.assignedDate}`,
          task,
          assignedDate: task.assignedDate,
          dueDate: task.dueDate,
          completedAt: task.completedAt ?? null,
          isRecurring: false,
        });
      }
      continue;
    }

    // Borrow the event expander by describing the task's assigned date as an
    // event, then re-derive the due date from the window length.
    const shim: CalendarEvent = {
      id: task.id,
      title: task.title,
      person: task.assignees[0] ?? '',
      date: task.assignedDate,
      time: '09:00',
      duration: 0,
      recurring: 'none',
      cost: 0,
      type: 'education',
      isRecurring: true,
      recurringPattern: task.recurringPattern,
      priority: task.priority,
      status: 'confirmed',
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };

    // Widen the start so an instance assigned before the window but due inside
    // it is still produced.
    const lookback = addDays(rangeStart, -Math.min(windowDays, 60));

    for (const occ of expandOccurrences(shim, lookback, rangeEnd, exceptions)) {
      const dueDate = addDays(occ.date, windowDays);
      if (dueDate < rangeStart) continue;
      out.push({
        occurrenceId: `${task.id}:${occ.seriesDate}`,
        task,
        assignedDate: occ.date,
        dueDate,
        // A repeating task's completion is per-instance; the parent record's
        // completedAt only describes the first one.
        completedAt: occ.date === task.assignedDate ? task.completedAt ?? null : null,
        isRecurring: true,
      });
    }
  }

  return out.sort((a, b) =>
    a.dueDate === b.dueDate
      ? a.assignedDate.localeCompare(b.assignedDate)
      : a.dueDate.localeCompare(b.dueDate)
  );
};

// ---------------------------------------------------------------------------
// Presentation helpers
// ---------------------------------------------------------------------------

const SHORT_DAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * The label a parent actually wants to read on a calendar band: what it is and
 * when it has to be in, in that order.
 */
export const formatTaskLabel = (occ: TaskOccurrence, today?: string): string => {
  const { task } = occ;
  const subject = task.subject ? `${task.subject}: ` : '';
  const base = `${subject}${task.title}`;

  if (occ.completedAt) return `✓ ${base}`;

  if (today) {
    const remaining = Math.round(
      ((parseDateKey(occ.dueDate)?.getTime() ?? 0) - (parseDateKey(today)?.getTime() ?? 0)) /
        86_400_000
    );
    if (remaining < 0) return `${base} — overdue`;
    if (remaining === 0) return `${base} — due today`;
    if (remaining === 1) return `${base} — due tomorrow`;
  }

  return `${base} — due ${SHORT_DAY[dayOfWeek(occ.dueDate)]}`;
};

/** Tailwind-ish token per status, so colour is decided once, not per component. */
export const TASK_STATUS_STYLES: Record<TaskStatus, { label: string; tone: string }> = {
  completed: { label: 'Done', tone: 'slate' },
  overdue: { label: 'Overdue', tone: 'red' },
  'due-today': { label: 'Due today', tone: 'amber' },
  'due-soon': { label: 'Due soon', tone: 'amber' },
  'in-progress': { label: 'In progress', tone: 'blue' },
  'not-started': { label: 'Not started', tone: 'slate' },
};

/**
 * Everything outstanding for a given day, for the Monday digest and the
 * "what's hanging over us" panel. A task appears on every day of its window,
 * not only its due date — that is the whole point of having a window.
 */
export const tasksActiveOn = (occurrences: TaskOccurrence[], date: string): TaskOccurrence[] =>
  occurrences.filter((occ) => occ.assignedDate <= date && occ.dueDate >= date);
