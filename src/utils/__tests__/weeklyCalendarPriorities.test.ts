import { weeklyCalendarPriorities } from '../weeklyCalendarPriorities';
import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';

const event: CalendarEvent = { id: 'e', title: 'Club', person: 'p', date: '2026-10-06', time: '15:30', duration: 60, recurring: 'none', isRecurring: false, type: 'sport', priority: 'low', status: 'confirmed', cost: 0, createdAt: new Date(), updatedAt: new Date() };
const task: CalendarTask = { id: 't', title: 'Bring toys', assignees: ['p'], assignedDate: '2026-09-29', dueDate: '2026-09-29', taskType: 'other', priority: 'high', recurringPattern: { frequency: 'weekly', interval: 1, daysOfWeek: [2, 5] }, completedAt: '2026-09-29T07:00:00Z', occurrenceCompletions: { '2026-10-06': '2026-10-06T07:00:00Z' }, createdAt: new Date(), updatedAt: new Date() };

test('weekly bring-items come before lower-priority events and use per-occurrence completion', () => {
  const result = weeklyCalendarPriorities([event], [task], '2026-10-05');
  expect(result.map((entry) => [entry.kind, entry.date])).toEqual([['task', '2026-10-09'], ['event', '2026-10-06']]);
});

test('cancelled events and completed tasks do not crowd weekly priorities', () => {
  expect(weeklyCalendarPriorities([{ ...event, status: 'cancelled' }], [{ ...task, recurringPattern: undefined }], '2026-10-05')).toEqual([]);
});
