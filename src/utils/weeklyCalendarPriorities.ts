import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';
import { addDays, expandEvents } from './recurrence';
import { expandTasks } from './tasks';
import { recurringSourceDateWarning } from './schoolEventPresentation';

export function weeklyCalendarPriorities(events: CalendarEvent[], tasks: CalendarTask[], start: string, limit = 8) {
  const end = addDays(start, 6);
  const eventItems = expandEvents(events.filter((event) => event.status !== 'cancelled' && !recurringSourceDateWarning(event)), start, end)
    .map((occurrence) => ({ kind: 'event' as const, date: occurrence.date < start ? start : occurrence.date, time: occurrence.time, priority: occurrence.event.priority, occurrence }));
  const taskItems = expandTasks(tasks, start, end).filter((occurrence) => !occurrence.completedAt && occurrence.dueDate <= end)
    .map((occurrence) => ({ kind: 'task' as const, date: occurrence.dueDate, time: occurrence.task.dueTime || '', priority: occurrence.task.priority, occurrence }));
  const rank = { high: 0, medium: 1, low: 2 };
  return [...eventItems, ...taskItems].sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time) || rank[a.priority] - rank[b.priority]).slice(0, limit);
}
