jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarTask: { findFirst: jest.fn(), update: jest.fn() },
  notification: { findMany: jest.fn(), upsert: jest.fn() }, $transaction: jest.fn(),
} }));
import prisma from '@/lib/prisma';
import { applyTaskReminderAction, loadTaskReminderStates } from '@/lib/taskReminderActions';
import { personalSnoozeUntil, taskReminderVisible } from '@/utils/personalSnooze';

const morning = new Date('2026-10-09T07:00:00Z');
let tasks: Map<string, any>;
let states: Map<string, any>;
beforeEach(() => {
  jest.resetAllMocks();
  tasks = new Map([['kit', { id: 'kit', familyId: 'home', title: 'Bring PE kit', completedAt: null, recurrenceRule: null }],
    ['photo', { id: 'photo', familyId: 'home', title: 'Bring nursery photo', completedAt: null, recurrenceRule: null }]]);
  states = new Map();
  (prisma.$transaction as jest.Mock).mockImplementation(async callback => callback(prisma));
  (prisma.calendarTask.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
    const task = tasks.get(where.id);
    return task?.familyId === where.familyId ? { ...task } : null;
  });
  (prisma.calendarTask.update as jest.Mock).mockImplementation(async ({ where, data }) => Object.assign(tasks.get(where.id), data));
  (prisma.notification.upsert as jest.Mock).mockImplementation(async ({ where, create, update }) => {
    const result = states.has(where.id) ? { ...states.get(where.id), ...update } : create;
    states.set(where.id, result); return result;
  });
  (prisma.notification.findMany as jest.Mock).mockImplementation(async ({ where }) => [...states.values()].filter(state =>
    state.familyId === where.familyId && state.recipientPersonId === where.recipientPersonId && state.metadata.source === where.metadata.equals));
});

it('rehearses morning snooze, reload, personal dismissal and household completion across two parents', async () => {
  const until = personalSnoozeUntil('1h', morning);
  await applyTaskReminderAction('home', 'angela', 'kit', 'snooze', until, morning);
  const reloaded = await loadTaskReminderStates('home', 'angela');
  expect(reloaded).toHaveLength(1);
  expect(taskReminderVisible(reloaded[0], morning)).toBe(false);
  expect(await loadTaskReminderStates('home', 'ade')).toEqual([]);
  expect(taskReminderVisible(reloaded[0], until)).toBe(true);
  await applyTaskReminderAction('home', 'angela', 'photo', 'not_needed', undefined, morning);
  expect(taskReminderVisible((await loadTaskReminderStates('home', 'angela')).find(state => state.taskId === 'photo'), morning)).toBe(false);
  expect(tasks.get('photo').completedAt).toBeNull();
  expect(tasks.get('kit').completedAt).toBeNull();
  const result = await applyTaskReminderAction('home', 'ade', 'kit', 'complete', undefined, until);
  expect(result).toMatchObject({ completedAt: until.toISOString(), completedBy: 'ade' });
  expect(tasks.get('kit').completedAt).toEqual(until);
  await expect(applyTaskReminderAction('home', 'angela', 'kit', 'snooze', personalSnoozeUntil('tomorrow', until), until))
    .rejects.toMatchObject({ status: 409 });
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), { isolationLevel: 'Serializable' });
});

it('rejects cross-household actions and does not leak another household state', async () => {
  await applyTaskReminderAction('home', 'ade', 'kit', 'not_needed', undefined, morning);
  expect(await loadTaskReminderStates('other-home', 'ade')).toEqual([]);
  await expect(applyTaskReminderAction('other-home', 'ade', 'kit', 'complete', undefined, morning)).rejects.toMatchObject({ status: 404 });
  expect(prisma.calendarTask.update).not.toHaveBeenCalled();
});

it.each([new Date('invalid'), morning, new Date('2026-10-18T07:00:00Z')])('rejects invalid or unbounded snooze %s before any write', async until => {
  await expect(applyTaskReminderAction('home', 'ade', 'kit', 'snooze', until, morning)).rejects.toMatchObject({ status: 400 });
  expect(prisma.notification.upsert).not.toHaveBeenCalled();
});

it('does not complete a recurring task series from an occurrence-ambiguous signal', async () => {
  tasks.get('kit').recurrenceRule = { frequency: 'weekly' };
  await expect(applyTaskReminderAction('home', 'ade', 'kit', 'complete', undefined, morning)).rejects.toMatchObject({ status: 409 });
  expect(prisma.calendarTask.update).not.toHaveBeenCalled();
});

it.each(['snooze', 'not_needed'] as const)('restores persisted personal %s state without completing or deleting the real task', async action => {
  await applyTaskReminderAction('home', 'angela', 'kit', action, action === 'snooze' ? personalSnoozeUntil('1h', morning) : undefined, morning);
  await applyTaskReminderAction('home', 'ade', 'kit', 'not_needed', undefined, morning);
  expect(taskReminderVisible((await loadTaskReminderStates('home', 'angela'))[0], morning)).toBe(false);
  await applyTaskReminderAction('home', 'angela', 'kit', 'restore', undefined, morning);
  const reloaded = (await loadTaskReminderStates('home', 'angela'))[0];
  expect(reloaded).toMatchObject({ taskId: 'kit', resolution: null, snoozedUntil: null });
  expect(taskReminderVisible(reloaded, morning)).toBe(true);
  expect(taskReminderVisible((await loadTaskReminderStates('home', 'ade'))[0], morning)).toBe(false);
  expect(states.size).toBe(2);
  expect(tasks.get('kit').completedAt).toBeNull();
  expect(prisma.calendarTask.update).not.toHaveBeenCalled();
});

it('rejects a restore request carrying a wake time', async () => {
  await expect(applyTaskReminderAction('home', 'ade', 'kit', 'restore', personalSnoozeUntil('1h', morning), morning)).rejects.toMatchObject({ status: 400 });
  expect(prisma.notification.upsert).not.toHaveBeenCalled();
});
