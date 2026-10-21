import { createHash } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { parseTaskReminderStates } from '@/utils/personalSnooze';

export const TASK_REMINDER_STATE = 'school-task-reminder-state';
export class TaskReminderActionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const stateId = (familyId: string, personId: string, taskId: string) =>
  `school-task-state-${createHash('sha256').update(JSON.stringify([familyId, personId, taskId])).digest('hex')}`;

export const loadTaskReminderStates = async (familyId: string, personId: string) => {
  const records = await prisma.notification.findMany({ where: {
    familyId, recipientPersonId: personId, type: 'family_reminder_state',
    metadata: { path: ['source'], equals: TASK_REMINDER_STATE },
  }, select: { metadata: true } });
  return parseTaskReminderStates(records.map(record => record.metadata));
};

export const applyTaskReminderAction = async (familyId: string, personId: string, taskId: string,
  action: 'complete' | 'snooze' | 'not_needed' | 'restore', until?: Date, now = new Date()) => {
  if (!personId) throw new TaskReminderActionError('Sign in to act on this task.', 403);
  if (action !== 'snooze' && until !== undefined) throw new TaskReminderActionError('Only snooze accepts a wake time.', 400);
  if (action === 'snooze' && (!until || !Number.isFinite(until.getTime()) || until <= now ||
      until.getTime() > now.getTime() + 7 * 86_400_000)) {
    throw new TaskReminderActionError('Choose a future snooze time within seven days.', 400);
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async tx => {
        const task = await tx.calendarTask.findFirst({ where: { id: taskId, familyId } });
        if (!task) throw new TaskReminderActionError('Task not found.', 404);
        // Recurring tasks need occurrence-specific actions, not completion of the entire series.
        if (task.recurrenceRule) throw new TaskReminderActionError('Open this recurring task to choose its occurrence.', 409);
        if (task.completedAt) throw new TaskReminderActionError('This task has already been completed.', 409);
        if (action === 'complete') {
          await tx.calendarTask.update({ where: { id: task.id }, data: { completedAt: now, completedBy: personId } });
          return { taskId, completedAt: now.toISOString(), completedBy: personId };
        }
        const id = stateId(familyId, personId, taskId);
        const metadata = { source: TASK_REMINDER_STATE, taskId, actionBy: personId, actionAt: now.toISOString(),
          resolution: action === 'not_needed' ? 'not_needed' : null,
          snoozedUntil: action === 'snooze' ? until!.toISOString() : null };
        await tx.notification.upsert({ where: { id }, create: {
          id, familyId, recipientPersonId: personId, type: 'family_reminder_state', category: 'settings',
          title: 'School task reminder state', message: action, priority: 'low', read: true,
          actionRequired: false, metadata,
        }, update: { metadata } });
        return metadata;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2034') {
        if (attempt < 2) continue;
        throw new TaskReminderActionError('This task changed. Refresh and try again.', 409);
      }
      throw error;
    }
  }
  throw new TaskReminderActionError('This task changed. Refresh and try again.', 409);
};
