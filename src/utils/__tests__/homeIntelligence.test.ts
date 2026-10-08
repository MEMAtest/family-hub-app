import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';
import type { PropertyTask } from '@/types/property.types';
import { buildHomeIntelligenceSignals } from '@/utils/homeIntelligence';

const today = '2026-10-09';
const members = [{ id: 'amari', name: 'Amari' }, { id: 'askia', name: 'Askia' }, { id: 'ade', name: 'Ade' }];

const task = (overrides: Partial<CalendarTask> = {}) => ({
  id: 'task-1', title: 'Bring PE kit', assignees: ['amari'], assignedDate: today, dueDate: '2026-10-10',
  taskType: 'homework', subject: 'School', priority: 'medium', createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
}) as CalendarTask;

const event = (overrides: Partial<CalendarEvent> = {}) => ({
  id: 'event-1', title: 'School trip', person: 'amari', date: '2026-10-11', time: '09:00', duration: 60,
  type: 'education', priority: 'medium', status: 'confirmed', recurring: 'none', isRecurring: false,
  location: '', notes: '', cost: 0, reminders: [], createdAt: new Date(), updatedAt: new Date(),
  ...overrides,
}) as CalendarEvent;

const propertyTask = (overrides: Partial<PropertyTask> = {}) => ({
  id: 'home-1', title: 'Service the boiler', category: 'Heating', priority: 'short', impact: 'Keep heating reliable',
  timeframe: 'This month', status: 'outstanding', nextDueDate: '2026-10-12', workLogs: [], source: 'maintenance',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
}) as PropertyTask;

it('combines nursery preparation, school tasks and changed school events', () => {
  const signals = buildHomeIntelligenceSignals({ today, members, tasks: [task()], events: [
    event({ id: 'cancelled', status: 'cancelled' }),
    event({ id: 'time', title: 'Photo day', metadata: { calendarTiming: { status: 'unknown' } } }),
  ], nurseryNotices: [{ id: 'notice', status: 'content_required', nurseryChildId: 'askia',
    nurserySummary: { kind: 'content_pending', title: 'Nursery notice preview', purpose: 'Preview only', actions: ['Open the full post.'] } }] });
  expect(signals.map((signal) => signal.id)).toEqual(expect.arrayContaining([
    'school-task:task-1', 'school-change:cancelled', 'school-time:time', 'nursery-content:notice',
  ]));
  expect(signals.find((signal) => signal.id === 'nursery-content:notice')).toMatchObject({ ownerLabel: 'Askia', kind: 'exception' });
});

it('flags incomplete service details, due bills and amounts above plan', () => {
  const signals = buildHomeIntelligenceSignals({ today, members, expenses: [
    { id: 'virgin', expenseName: 'Virgin Media', amount: 72, budgetLimit: 60, category: 'Utilities', isRecurring: true, personId: 'ade' },
    { id: 'water', expenseName: 'Water', amount: 35, category: 'Utilities', isRecurring: true, recurringFrequency: 'monthly', paymentDate: '2026-09-12' },
  ] });
  expect(signals).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'bill-date:virgin', status: 'needs_detail', ownerLabel: 'Ade' }),
    expect.objectContaining({ id: 'bill-limit:virgin', status: 'changed' }),
    expect.objectContaining({ id: 'bill-due:water:2026-10-12', dueDate: '2026-10-12' }),
  ]));
});

it('shows scheduled maintenance and groups important jobs that have no date', () => {
  const signals = buildHomeIntelligenceSignals({ today, propertyTasks: [
    propertyTask(), propertyTask({ id: 'home-2', title: 'Gas safety check', priority: 'urgent', nextDueDate: undefined }),
  ] });
  expect(signals).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: 'maintenance-due:home-1:2026-10-12', area: 'maintenance' }),
    expect.objectContaining({ id: 'maintenance:missing-dates', kind: 'exception', urgency: 1 }),
  ]));
});

it('does not surface completed preparation or distant routine work', () => {
  const signals = buildHomeIntelligenceSignals({ today, tasks: [task({ completedAt: new Date().toISOString() })],
    propertyTasks: [propertyTask({ nextDueDate: '2027-04-01' })], nurseryNotices: [{ id: 'done', preparationTask: { completed: true },
      nurserySummary: { kind: 'preparation', title: 'Bring a book', purpose: 'Book week', actions: ['Bring a book.'] } }] });
  expect(signals).toEqual([]);
});
