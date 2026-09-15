import type { CalendarEvent, CalendarTask, Person } from '@/types/calendar.types';
import { addDays, expandEvents, type Occurrence } from '@/utils/recurrence';
import { expandTasks, getTaskStatus, type TaskOccurrence } from '@/utils/tasks';

/**
 * The Monday morning digest: what the week actually holds.
 *
 * The important word is "actually". Before recurrence was expanded, a digest
 * built from stored rows would have listed a weekly swimming lesson once, in
 * whichever week it was created, and shown nothing for it ever again — a weekly
 * summary that quietly omitted everything weekly. So this goes through
 * `expandEvents` and `expandTasks` rather than reading `event.date`, and cannot
 * drift from what the grid draws.
 *
 * Pure: no database, no network, no clock. The caller supplies the week start.
 */

export interface DigestEntry {
  date: string;
  time: string;
  title: string;
  who: string;
  location?: string;
}

export interface DigestDay {
  date: string;
  /** "Monday 14 September" */
  label: string;
  entries: DigestEntry[];
}

export interface DigestTask {
  title: string;
  dueDate: string;
  dueLabel: string;
  who: string;
  status: ReturnType<typeof getTaskStatus>;
  subject?: string;
}

export interface WeeklyDigest {
  weekStart: string;
  weekEnd: string;
  /** "15 - 21 September 2026" */
  rangeLabel: string;
  days: DigestDay[];
  tasks: DigestTask[];
  eventCount: number;
  busiestDay: { label: string; count: number } | null;
  /** Same person, two places, overlapping times. */
  clashes: Array<{ date: string; label: string; a: string; b: string; who: string }>;
  totalCost: number;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Parse `YYYY-MM-DD` at UTC noon, so no timezone can nudge it onto another day. */
const parseKey = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
};

export const formatDayLabel = (key: string) => {
  const date = parseKey(key);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
};

const formatRange = (start: string, end: string) => {
  const a = parseKey(start);
  const b = parseKey(end);
  const sameMonth = a.getUTCMonth() === b.getUTCMonth();
  const left = sameMonth ? `${a.getUTCDate()}` : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]}`;
  return `${left} - ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]} ${b.getUTCFullYear()}`;
};

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const nameOf = (people: Person[], id: string) =>
  people.find((p) => p.id === id)?.name ?? 'Everyone';

/** Overlapping occurrences for the same person on the same day. */
const findClashes = (occurrences: Occurrence[], people: Person[]) => {
  const out: WeeklyDigest['clashes'] = [];
  const byDayPerson = new Map<string, Occurrence[]>();

  for (const occ of occurrences) {
    if (!occ.event.person) continue;
    const key = `${occ.date}|${occ.event.person}`;
    byDayPerson.set(key, [...(byDayPerson.get(key) ?? []), occ]);
  }

  for (const [key, group] of byDayPerson) {
    if (group.length < 2) continue;
    const [date, personId] = key.split('|');
    const sorted = [...group].sort((a, b) => minutes(a.time) - minutes(b.time));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const current = sorted[i];
      const next = sorted[i + 1];
      const currentEnd = minutes(current.time) + (current.duration || 0);
      if (currentEnd > minutes(next.time)) {
        out.push({
          date,
          label: formatDayLabel(date),
          a: `${current.event.title} (${current.time})`,
          b: `${next.event.title} (${next.time})`,
          who: nameOf(people, personId),
        });
      }
    }
  }

  return out.sort((a, b) => a.date.localeCompare(b.date));
};

export const buildWeeklyDigest = (
  events: CalendarEvent[],
  tasks: CalendarTask[],
  people: Person[],
  weekStart: string
): WeeklyDigest => {
  const weekEnd = addDays(weekStart, 6);

  const live = events.filter((event) => event.status !== 'cancelled');
  const occurrences = expandEvents(live, weekStart, weekEnd);

  const days: DigestDay[] = [];
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(weekStart, i);
    const entries = occurrences
      .filter((occ) => occ.date === date)
      .sort((a, b) => minutes(a.time) - minutes(b.time))
      .map((occ) => ({
        date,
        time: occ.time,
        title: occ.event.title,
        who: nameOf(people, occ.event.person),
        location: occ.event.location || undefined,
      }));
    days.push({ date, label: formatDayLabel(date), entries });
  }

  // Homework set before the week but due inside it still belongs here, so
  // expand from well before the start rather than from Monday.
  const taskOccurrences: TaskOccurrence[] = expandTasks(tasks, addDays(weekStart, -60), weekEnd);
  const digestTasks: DigestTask[] = taskOccurrences
    .filter((occ) => !occ.completedAt && occ.dueDate >= weekStart && occ.dueDate <= weekEnd)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .map((occ) => ({
      title: occ.task.title,
      dueDate: occ.dueDate,
      dueLabel: formatDayLabel(occ.dueDate),
      who: occ.task.assignees.map((id) => nameOf(people, id)).join(' & ') || 'Everyone',
      status: getTaskStatus({ ...occ.task, completedAt: occ.completedAt, dueDate: occ.dueDate }, weekStart),
      subject: occ.task.subject,
    }));

  const withEntries = days.filter((day) => day.entries.length > 0);
  const busiest = withEntries.reduce<DigestDay | null>(
    (max, day) => (!max || day.entries.length > max.entries.length ? day : max),
    null
  );

  return {
    weekStart,
    weekEnd,
    rangeLabel: formatRange(weekStart, weekEnd),
    days,
    tasks: digestTasks,
    eventCount: occurrences.length,
    busiestDay: busiest ? { label: busiest.label, count: busiest.entries.length } : null,
    clashes: findClashes(occurrences, people),
    totalCost: occurrences.reduce((sum, occ) => sum + (occ.event.cost || 0), 0),
  };
};

/** Monday of the week containing `date` (ISO weeks: Monday first). */
export const mondayOf = (date: string): string => {
  const day = parseKey(date).getUTCDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(date, offset);
};
