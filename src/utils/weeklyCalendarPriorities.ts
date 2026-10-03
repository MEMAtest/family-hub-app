import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';
import { addDays, expandEvents } from './recurrence';
import { expandTasks } from './tasks';
import { recurringSourceDateWarning } from './schoolEventPresentation';

export function weeklyCalendarPriorities(events: CalendarEvent[], tasks: CalendarTask[], start: string) {
  const end = addDays(start, 6);
  const eventItems = expandEvents(events.filter((event) => event.status !== 'cancelled' && !recurringSourceDateWarning(event)), start, end)
    .map((occurrence) => ({ kind: 'event' as const, date: occurrence.date, time: occurrence.time, priority: occurrence.event.priority, occurrence }));
  const taskItems = expandTasks(tasks, start, end).filter((occurrence) => !occurrence.completedAt && occurrence.dueDate <= end)
    .map((occurrence) => ({ kind: 'task' as const, date: occurrence.dueDate, time: occurrence.task.dueTime || '', priority: occurrence.task.priority, occurrence }));
  const rank = { high: 0, medium: 1, low: 2 };
  return [...eventItems, ...taskItems].sort((a, b) => rank[a.priority] - rank[b.priority] || a.date.localeCompare(b.date) || a.time.localeCompare(b.time)).slice(0, 8);
}
