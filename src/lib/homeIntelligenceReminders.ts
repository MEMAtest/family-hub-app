import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { sendMemberPushNotification } from '@/lib/webPush';
import { londonDate, londonParts, reminderRecordId } from '@/lib/familyReminderPlanner';
import { londonNotificationDay } from '@/lib/notificationDelivery';
import { loadTaskReminderStates } from '@/lib/taskReminderActions';
import { taskReminderVisible } from '@/utils/personalSnooze';
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
    prisma.familyMember.findMany({ where: { familyId }, select: { id: true, name: true, role: true, ageGroup: true,
      user: { select: { neonAuthId: true } } } }),
  ]);

  const signals = buildHomeIntelligenceSignals({
    today,
    tasks: tasks.map(toCalendarTask),
    expenses: expenses as unknown as BudgetExpenseInput[],
    propertyTasks: propertyTasksFrom(propertyDocument?.data),
    members,
  }).filter((signal) => signal.urgency <= 2);
  if (!signals.length) return { planned: 0, created: 0, pushAccepted: 0, deliveryConfirmed: false };

  const phase = `${today}-${hour}`;
  const legacyDedupeKey = `home-intelligence:${phase}`;
  // Do not replay an already-issued shared prompt when switching to recipient-scoped prompts.
  const existing = await prisma.notification.findFirst({ where: {
    familyId, recipientPersonId: null, metadata: { path: ['dedupeKey'], equals: legacyDedupeKey },
  }, select: { id: true } });
  if (existing) return { planned: signals.length, created: 0, pushAccepted: 0, deliveryConfirmed: false };
  let planned = 0;
  let created = 0;
  let pushAccepted = 0;
  const recipients = members.filter(member => /parent|adult/i.test(member.role ?? '') || /adult/i.test(member.ageGroup ?? ''));
  // Load every recipient's state before creating anything; a failed read must not become an empty opt-out list.
  const recipientStates = await Promise.all(recipients.map(async member => ({
    member, states: await loadTaskReminderStates(familyId, member.id),
  })));
  for (const { member, states } of recipientStates) {
    const personalSignals = signals.filter(signal => !signal.taskId ||
      taskReminderVisible(states.find(state => state.taskId === signal.taskId), now)).slice(0, 4);
    if (!personalSignals.length) continue;
    planned += personalSignals.length;
    const dedupeKey = `${legacyDedupeKey}:${member.id}`;
    const id = reminderRecordId('home', [familyId, member.id, phase]);
    const title = personalSignals.length === 1 ? personalSignals[0].title : `${personalSignals.length} household items need attention`;
    const message = personalSignals.map(signal => `${signal.area === 'school' ? 'School' : signal.area === 'bills' ? 'Bills' : 'Home'}: ${signal.title}`).join(' · ');
    const url = '/?homeFocus=all';
    const metadata = { source: 'home-intelligence', dedupeKey, phase, url,
      signalIds: personalSignals.map(signal => signal.id), deliveryConfirmed: false,
      preferenceCoverage: 'personal_task_state_and_active_subscriptions',
      pushStatus: !deliverPush ? 'disabled' : !member.user?.neonAuthId ? 'unavailable' : 'pending' };
    // The deterministic primary key arbitrates concurrent routine ticks, not a check-then-create race.
    try {
      await prisma.notification.create({ data: {
        id, familyId, recipientPersonId: member.id, relatedPersonId: member.id,
        type: 'reminder', title, message, priority: personalSignals.some(signal => signal.urgency === 1) ? 'high' : 'medium',
        category: 'event', read: false, actionRequired: true, timestamp: now, expiresAt: londonNotificationDay(now).endsAt,
        actions: [
          { id: 'open', label: 'Review household', type: 'primary', action: 'view_home_intelligence', data: { url } },
          { id: 'snooze', label: 'Snooze', type: 'secondary', action: 'snooze' },
          { id: 'dismiss', label: 'Dismiss', type: 'secondary', action: 'dismiss' },
        ], metadata: json(metadata),
      } });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') continue;
      throw error;
    }
    created += 1;
    if (!deliverPush || !member.user?.neonAuthId) continue;
    try {
      const push = await sendMemberPushNotification(familyId, member.id, { title, body: message, tag: dedupeKey,
        data: { familyId, notificationId: id, type: 'home-intelligence', url },
        actions: [{ action: 'view', title: 'Review household' }] });
      pushAccepted += push.sent;
      await prisma.notification.update({ where: { id }, data: { metadata: json({ ...metadata,
        pushStatus: push.sent ? 'accepted' : push.failed ? 'unknown' : 'unavailable', deliveryConfirmed: false,
      }) } });
    } catch {
      await prisma.notification.update({ where: { id }, data: { metadata: json({ ...metadata,
        pushStatus: 'unknown', deliveryConfirmed: false, manualReviewRequired: true,
      }) } });
    }
  }
  return { planned, created, pushAccepted, deliveryConfirmed: false };
};
