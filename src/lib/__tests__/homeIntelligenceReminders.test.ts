jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarTask: { findMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() }, budgetExpense: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
  familyMember: { findMany: jest.fn() }, notification: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), upsert: jest.fn() },
  $transaction: jest.fn(),
} }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn(), sendFamilyPushNotification: jest.fn() }));

import prisma from '@/lib/prisma';
import { sendMemberPushNotification, sendFamilyPushNotification } from '@/lib/webPush';
import { runHomeIntelligenceSweep } from '@/lib/homeIntelligenceReminders';
import { applyTaskReminderAction, loadTaskReminderStates } from '@/lib/taskReminderActions';

const dbTask = {
  id: 'task', title: 'Bring PE kit', assignees: ['amari'], assignedDate: new Date('2026-10-08'), dueDate: new Date('2026-10-09'),
  dueTime: null, completedAt: null, completedBy: null, taskType: 'homework', subject: 'School', notes: null,
  priority: 'medium', effortMinutes: null, sourceEventId: null, recurrenceRule: null,
  createdAt: new Date('2026-10-08'), updatedAt: new Date('2026-10-08'),
};
const ade = { id: 'ade', name: 'Ade', role: 'Parent', ageGroup: 'Adult', user: { neonAuthId: 'ade-account' } };
const angela = { ...ade, id: 'angela', name: 'Angela', user: { neonAuthId: 'angela-account' } };
let states: Map<string, any[]>;
let records: Map<string, any>;

beforeEach(() => {
  jest.resetAllMocks();
  states = new Map(); records = new Map();
  (prisma.calendarTask.findMany as jest.Mock).mockResolvedValue([dbTask]);
  (prisma.budgetExpense.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: [] });
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([ade]);
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.notification.findMany as jest.Mock).mockImplementation(async ({ where }) => (states.get(where.recipientPersonId) ?? []).map(metadata => ({ metadata })));
  (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
    if (records.has(data.id)) throw Object.assign(new Error('Duplicate'), { code: 'P2002' });
    records.set(data.id, data); return data;
  });
  (prisma.notification.update as jest.Mock).mockResolvedValue({ id: 'notification' });
  (sendMemberPushNotification as jest.Mock).mockResolvedValue({ sent: 1, failed: 0 });
});

it('runs only in the London morning and evening routine windows', async () => {
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T11:00:00Z'))).skipped).toBe('outside_routine_window');
  expect(prisma.calendarTask.findMany).not.toHaveBeenCalled();
});

it('creates one recipient-scoped prompt and records provider acceptance without claiming delivery', async () => {
  const result = await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'));
  expect(result).toMatchObject({ planned: 1, created: 1, pushAccepted: 1, deliveryConfirmed: false });
  expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    title: 'Bring PE kit', message: expect.stringContaining('School: Bring PE kit'),
    recipientPersonId: 'ade', expiresAt: new Date('2026-10-09T23:00:00Z'),
    actions: expect.arrayContaining([expect.objectContaining({ action: 'view_home_intelligence' })]),
  }) }));
  expect(sendMemberPushNotification).toHaveBeenCalledWith('family', 'ade', expect.any(Object));
  expect(sendFamilyPushNotification).not.toHaveBeenCalled();
  expect(prisma.notification.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
    metadata: expect.objectContaining({ pushStatus: 'accepted', deliveryConfirmed: false }),
  }) }));
});

it('deduplicates repeated scheduler ticks in the same routine phase', async () => {
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 'existing' });
  const result = await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:15:00Z'));
  expect(result.created).toBe(0);
  expect(prisma.notification.create).not.toHaveBeenCalled();
  expect(sendFamilyPushNotification).not.toHaveBeenCalled();
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('suppresses a parent\'s Not needed task in later routine phases without suppressing the other parent', async () => {
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([ade, angela]);
  states.set('ade', [{ taskId: 'task', resolution: 'not_needed' }]);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).created).toBe(1);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:15:00Z'))).created).toBe(1);
  expect([...records.values()].every(record => record.recipientPersonId === 'angela')).toBe(true);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.map(call => call[1])).toEqual(['angela', 'angela']);
  expect(sendFamilyPushNotification).not.toHaveBeenCalled();
});

it('keeps scheduled task snooze personal across phases and allows a later routine tick after wake', async () => {
  states.set('ade', [{ taskId: 'task', snoozedUntil: '2026-10-09T19:30:00Z' }]);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).created).toBe(0);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:15:00Z'))).created).toBe(0);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:30:00Z'))).created).toBe(1);
});

it('removes only the suppressed task from a mixed scheduled digest', async () => {
  (prisma.calendarTask.findMany as jest.Mock).mockResolvedValue([dbTask, { ...dbTask, id: 'photo', title: 'Bring nursery photo' }]);
  states.set('ade', [{ taskId: 'task', resolution: 'not_needed' }]);
  await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'));
  const record = [...records.values()][0];
  expect(record.message).toContain('Bring nursery photo');
  expect(record.message).not.toContain('Bring PE kit');
  expect(record.metadata.signalIds).toEqual(['school-task:photo']);
});

it('fails closed before any recipient notification if durable state cannot be read', async () => {
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([ade, angela]);
  (prisma.notification.findMany as jest.Mock).mockRejectedValueOnce(new Error('State unavailable'));
  await expect(runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).rejects.toThrow('State unavailable');
  expect(prisma.notification.create).not.toHaveBeenCalled();
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('fails closed for malformed durable task state rather than treating it as no opt-outs', async () => {
  states.set('ade', [{ snoozedUntil: 'invalid' }]);
  await expect(runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).rejects.toThrow('Personal task reminder state is invalid');
  expect(prisma.notification.create).not.toHaveBeenCalled();
});

it('uses the deterministic recipient record to deduplicate concurrent ticks', async () => {
  const now = new Date('2026-10-09T07:05:00Z');
  await Promise.all([runHomeIntelligenceSweep('family', now), runHomeIntelligenceSweep('family', now)]);
  expect(records.size).toBe(1);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
});

it('does not send to children or an unclaimed parent account', async () => {
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ ...ade, user: null },
    { id: 'amari', name: 'Amari', role: 'Student', ageGroup: 'Child' }]);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).created).toBe(1);
  expect([...records.values()][0].recipientPersonId).toBe('ade');
  expect([...records.values()][0].metadata.pushStatus).toBe('unavailable');
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('does not schedule school tasks completed by the household', async () => {
  (prisma.calendarTask.findMany as jest.Mock).mockResolvedValue([]);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).created).toBe(0);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('rehearses actual task actions through morning, evening, personal wake and household completion', async () => {
  const task = { ...dbTask, familyId: 'family' };
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([ade, angela]);
  (prisma.calendarTask.findMany as jest.Mock).mockImplementation(async () => task.completedAt ? [] : [task]);
  (prisma.calendarTask.findFirst as jest.Mock).mockImplementation(async ({ where }) =>
    where.id === task.id && where.familyId === task.familyId ? task : null);
  (prisma.calendarTask.update as jest.Mock).mockImplementation(async ({ data }) => Object.assign(task, data));
  (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback(prisma));
  (prisma.notification.upsert as jest.Mock).mockImplementation(async ({ create }) => {
    states.set(create.recipientPersonId, [create.metadata]); return create;
  });
  const morning = new Date('2026-10-09T07:00:00Z');
  await applyTaskReminderAction('family', 'angela', 'task', 'snooze', new Date('2026-10-09T19:30:00Z'), morning);
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:05:00Z'))).created).toBe(1);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.map(call => call[1])).toEqual(['ade']);
  await applyTaskReminderAction('family', 'ade', 'task', 'not_needed', undefined, new Date('2026-10-09T07:10:00Z'));
  expect((await loadTaskReminderStates('family', 'ade'))[0].resolution).toBe('not_needed');
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:15:00Z'))).created).toBe(0);
  expect(task.completedAt).toBeNull();
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T19:30:00Z'))).created).toBe(1);
  expect((sendMemberPushNotification as jest.Mock).mock.calls.map(call => call[1])).toEqual(['ade', 'angela']);
  await applyTaskReminderAction('family', 'angela', 'task', 'complete', undefined, new Date('2026-10-09T19:31:00Z'));
  expect(task.completedBy).toBe('angela');
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-10T07:05:00Z'))).created).toBe(0);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(2);
  expect(sendFamilyPushNotification).not.toHaveBeenCalled();
});

it('restores a personal snooze for subsequent scheduled prompts without completing the task', async () => {
  states.set('ade', [{ taskId: 'task', snoozedUntil: '2026-10-10T08:00:00Z' }]);
  const morning = new Date('2026-10-09T07:05:00Z');
  expect((await runHomeIntelligenceSweep('family', morning)).created).toBe(0);
  (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback(prisma));
  (prisma.calendarTask.findFirst as jest.Mock).mockResolvedValue({ ...dbTask, familyId: 'family' });
  (prisma.notification.upsert as jest.Mock).mockImplementation(async ({ create }) => {
    states.set(create.recipientPersonId, [create.metadata]); return create;
  });
  await applyTaskReminderAction('family', 'ade', 'task', 'restore', undefined, morning);
  expect((await loadTaskReminderStates('family', 'ade'))[0]).toMatchObject({ resolution: null, snoozedUntil: null });
  expect((await runHomeIntelligenceSweep('family', new Date('2026-10-09T07:10:00Z'))).created).toBe(1);
  expect(sendMemberPushNotification).toHaveBeenCalledWith('family', 'ade', expect.any(Object));
  expect(prisma.calendarTask.update).not.toHaveBeenCalled();
});
