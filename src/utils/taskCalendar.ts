import type { BigCalendarEvent, CalendarTask } from '@/types/calendar.types';
import { addDays } from '@/utils/recurrence';
import { expandTasks, formatTaskLabel, getTaskStatus, type TaskOccurrence } from '@/utils/tasks';

/**
 * Turning tasks into something the calendar grid can draw.
 *
 * A task is rendered as an all-day band running from the day it was set to the
 * day it is due, rather than as a block at an invented time. That is the whole
 * point: you want to see the week's workload hanging over the days it hangs
 * over, and where the deadline lands.
 *
 * react-big-calendar draws an all-day event as exactly that band, so this needs
 * no custom renderer — only correct start/end dates and an honest title.
 */

export interface TaskCalendarEntry extends BigCalendarEvent {
  /** Marks this entry as a task so styling and click handling can differ. */
  isTask: true;
  occurrence: TaskOccurrence;
  status: ReturnType<typeof getTaskStatus>;
}

/**
 * react-big-calendar treats an all-day event's `end` as exclusive, so a band
 * that should cover through Sunday must end at Monday 00:00 or Sunday is cut off.
 */
const exclusiveEnd = (dueDate: string) => new Date(`${addDays(dueDate, 1)}T00:00:00`);

export const buildTaskEntries = (
  tasks: CalendarTask[],
  rangeStart: string,
  rangeEnd: string,
  today: string
): TaskCalendarEntry[] =>
  expandTasks(tasks, rangeStart, rangeEnd).map((occ) => {
    const status = getTaskStatus(
      { ...occ.task, completedAt: occ.completedAt, dueDate: occ.dueDate },
      today
    );

    return {
      id: `task:${occ.occurrenceId}`,
      title: formatTaskLabel(occ, today),
      start: new Date(`${occ.assignedDate}T00:00:00`),
      end: exclusiveEnd(occ.dueDate),
      allDay: true,
      isTask: true as const,
      occurrence: occ,
      status,
    };
  });

/**
 * Colours by urgency, not by category — for work with a deadline the only
 * question that matters on a calendar is "how close is this to being late".
 */
export const getTaskEntryStyle = (entry: TaskCalendarEntry) => {
  const palette: Record<string, { backgroundColor: string; borderColor: string; color: string }> = {
    completed: { backgroundColor: '#e2e8f0', borderColor: '#94a3b8', color: '#475569' },
    overdue: { backgroundColor: '#fee2e2', borderColor: '#dc2626', color: '#991b1b' },
    'due-today': { backgroundColor: '#fef3c7', borderColor: '#d97706', color: '#92400e' },
    'due-soon': { backgroundColor: '#fef9c3', borderColor: '#ca8a04', color: '#854d0e' },
    'in-progress': { backgroundColor: '#dbeafe', borderColor: '#2563eb', color: '#1e40af' },
    'not-started': { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#475569' },
  };

  const tone = palette[entry.status] ?? palette['not-started'];

  return {
    style: {
      ...tone,
      // A dashed left edge reads as "this started earlier"; the solid right edge
      // is the deadline. Distinguishes a task band from an event block at a glance.
      borderLeftStyle: 'dashed' as const,
      borderLeftWidth: '3px',
      borderRightWidth: '4px',
      borderRightStyle: 'solid' as const,
      borderRadius: '4px',
      fontSize: '0.75rem',
      fontWeight: 600,
      textDecoration: entry.status === 'completed' ? 'line-through' : 'none',
      opacity: entry.status === 'completed' ? 0.65 : 1,
    },
  };
};

export const isTaskEntry = (entry: unknown): entry is TaskCalendarEntry =>
  Boolean(entry) && (entry as TaskCalendarEntry).isTask === true;
