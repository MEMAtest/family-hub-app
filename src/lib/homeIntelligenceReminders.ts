import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendFamilyPushNotification } from '@/lib/webPush';
import { londonDate, londonParts } from '@/lib/familyReminderPlanner';
import { buildHomeIntelligenceSignals, type BudgetExpenseInput } from '@/utils/homeIntelligence';
import type { CalendarTask } from '@/types/calendar.types';
import type { PropertyTask } from '@/types/property.types';

const json = (value: Record<string, unknown>) => value as Prisma.InputJsonObject;

const toCalendarTask = (task: {
  id: string; title: string; assignees: string[]; assignedDate: Date; dueDate: Date; dueTime: string | null;
  completedAt: Date | null; completedBy: string | null; taskType: string; subject: string | null; notes: string | null;
  priority: string; effortMinutes: number | null; sourceEventId: string | null; recurrenceRule: Prisma.JsonValue | null;
  createdAt: Date; updatedAt: Date;
}): CalendarTask => ({
  id: task.id, title: task.title, assignees: task.assignees, assignedDate: task.assignedDate.toISOString().slice(0, 10),
  dueDate: task.dueDate.toISOString().slice(0, 10), dueTime: task.dueTime || undefined,
  completedAt: task.completedAt?.toISOString() || null, completedBy: task.completedBy,
  taskType: task.taskType as CalendarTask['taskType'], subject: task.subject || undefined, notes: task.notes || undefined,
  priority: task.priority as CalendarTask['priority'], effortMinutes: task.effortMinutes || undefined,
  sourceEventId: task.sourceEventId || undefined,
  recurringPattern: task.recurrenceRule as unknown as CalendarTask['recurringPattern'], createdAt: task.createdAt, updatedAt: task.updatedAt,
});

const propertyTasksFrom = (value: unknown): PropertyTask[] => Array.isArray(value)
  ? value.filter((item): item is PropertyTask => Boolean(item && typeof item === 'object' && typeof (item as PropertyTask).id === 'string'))
  : [];

export const runHomeIntelligenceSweep = async (familyId: string, now = new Date(), deliverPush = true) => {
  const hour = londonParts(now).hour;
  if (hour !== '08' && hour !== '20') return { planned: 0, created: 0, pushAccepted: 0, deliveryConfirmed: false, skipped: 'outside_routine_window' };

  const today = londonDate(now);
  const taskFloor = new Date(now.getTime() - 30 * 86_400_000);
  const [tasks, expenses, propertyDocument, members] = await Promise.all([
    prisma.calendarTask.findMany({ where: { familyId, completedAt: null, dueDate: { gte: taskFloor } }, orderBy: { dueDate: 'asc' }, take: 100 }),
    prisma.budgetExpense.findMany({ where: { familyId, isRecurring: true }, orderBy: { createdAt: 'desc' }, take: 100 }),
    prisma.familyDocument.findUnique({ where: { familyId_key: { familyId, key: 'property.tasks' } }, select: { data: true } }),
    prisma.familyMember.findMany({ where: { familyId }, select: { id: true, name: true } }),
  ]);

  const signals = buildHomeIntelligenceSignals({
    today,
    tasks: tasks.map(toCalendarTask),
    expenses: expenses as unknown as BudgetExpenseInput[],
    propertyTasks: propertyTasksFrom(propertyDocument?.data),
    members,
  }).filter((signal) => signal.urgency <= 2).slice(0, 4);
  if (!signals.length) return { planned: 0, created: 0, pushAccepted: 0, deliveryConfirmed: false };

  const phase = `${today}-${hour}`;
  const dedupeKey = `home-intelligence:${phase}`;
  const existing = await prisma.notification.findFirst({ where: {
    familyId, metadata: { path: ['dedupeKey'], equals: dedupeKey },
  }, select: { id: true } });
  if (existing) return { planned: signals.length, created: 0, pushAccepted: 0, deliveryConfirmed: false };

  const title = signals.length === 1 ? signals[0].title : `${signals.length} household items need attention`;
  const message = signals.map((signal) => `${signal.area === 'school' ? 'School' : signal.area === 'bills' ? 'Bills' : 'Home'}: ${signal.title}`).join(' · ');
  const url = '/?homeFocus=all';
  const notification = await prisma.notification.create({ data: {
    familyId, type: 'reminder', title, message, icon: '✓', priority: signals.some((signal) => signal.urgency === 1) ? 'high' : 'medium',
    category: 'event', read: false, actionRequired: true,
    actions: [
      { id: 'open', label: 'Review household', type: 'primary', action: 'view_home_intelligence', data: { url } },
      { id: 'snooze', label: 'Snooze', type: 'secondary', action: 'snooze' },
      { id: 'dismiss', label: 'Dismiss', type: 'secondary', action: 'dismiss' },
    ],
    metadata: json({ source: 'home-intelligence', dedupeKey, phase, url, signalIds: signals.map((signal) => signal.id) }),
  } });

  let pushAccepted = 0;
  if (deliverPush) {
    try {
      const push = await sendFamilyPushNotification(familyId, { title, body: message, tag: dedupeKey,
        data: { familyId, notificationId: notification.id, type: 'home-intelligence', url },
        actions: [{ action: 'view', title: 'Review household' }] });
      pushAccepted = push.sent;
      await prisma.notification.update({ where: { id: notification.id }, data: { metadata: json({
        source: 'home-intelligence', dedupeKey, phase, url, signalIds: signals.map((signal) => signal.id),
        pushStatus: push.sent ? 'accepted' : push.failed ? 'unknown' : 'unavailable', deliveryConfirmed: false,
      }) } });
    } catch {
      await prisma.notification.update({ where: { id: notification.id }, data: { metadata: json({
        source: 'home-intelligence', dedupeKey, phase, url, signalIds: signals.map((signal) => signal.id),
        pushStatus: 'unknown', deliveryConfirmed: false, manualReviewRequired: true,
      }) } });
    }
  }
  return { planned: signals.length, created: 1, pushAccepted, deliveryConfirmed: false };
};
