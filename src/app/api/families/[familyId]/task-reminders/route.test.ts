jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: any) => handler }));
jest.mock('@/lib/taskReminderActions', () => {
  class TaskReminderActionError extends Error { constructor(message: string, public status: number) { super(message); } }
  return { applyTaskReminderAction: jest.fn(), loadTaskReminderStates: jest.fn(), TaskReminderActionError };
});
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) } }));
import { POST, GET } from './route';
import { applyTaskReminderAction, loadTaskReminderStates, TaskReminderActionError } from '@/lib/taskReminderActions';
const context = { params: Promise.resolve({ familyId: 'home' }) };
const invoke = (body: unknown) => (POST as any)({ json: async () => body }, context, { familyMemberId: 'ade' });
beforeEach(() => jest.resetAllMocks());

it('loads only the authenticated parent state', async () => {
  (loadTaskReminderStates as jest.Mock).mockResolvedValue([]);
  expect((await (GET as any)({}, context, { familyMemberId: 'ade' })).body).toEqual([]);
  expect(loadTaskReminderStates).toHaveBeenCalledWith('home', 'ade');
});
it('ignores forged actor IDs and uses the authenticated member', async () => {
  await invoke({ taskId: 'kit', action: 'complete', personId: 'angela' });
  expect(applyTaskReminderAction).toHaveBeenCalledWith('home', 'ade', 'kit', 'complete', undefined);
});
it.each([{ taskId: 'kit', action: 'delete' }, { taskId: 'kit', action: 'snooze', until: 'tomorrow' }, { action: 'complete' }])('rejects invalid input %s', async body => {
  expect((await invoke(body)).status).toBe(400);
  expect(applyTaskReminderAction).not.toHaveBeenCalled();
});
it('preserves a stale or cross-household task action error', async () => {
  (applyTaskReminderAction as jest.Mock).mockRejectedValue(new TaskReminderActionError('Task not found.', 404));
  expect((await invoke({ taskId: 'kit', action: 'complete' })).status).toBe(404);
});
it('returns unavailable rather than an empty opt-out list if state loading fails', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  (loadTaskReminderStates as jest.Mock).mockRejectedValue(new Error('Database unavailable'));
  const result = await (GET as any)({}, context, { familyMemberId: 'ade' });
  expect(result.status).toBe(503);
  expect(result.body).toEqual({ error: 'Personal task reminders could not be checked.' });
  log.mockRestore();
});
it('restores only authenticated personal state and rejects wake times on restore', async () => {
  expect((await invoke({ taskId: 'kit', action: 'restore', personId: 'angela' })).status).toBe(200);
  expect(applyTaskReminderAction).toHaveBeenCalledWith('home', 'ade', 'kit', 'restore', undefined);
  jest.clearAllMocks();
  expect((await invoke({ taskId: 'kit', action: 'restore', until: '2026-10-22T08:00:00Z' })).status).toBe(400);
  expect(applyTaskReminderAction).not.toHaveBeenCalled();
});
