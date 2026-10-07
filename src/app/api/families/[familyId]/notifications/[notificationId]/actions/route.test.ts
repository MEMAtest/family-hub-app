jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: any) => handler }));
jest.mock('@/lib/familyReminders', () => {
  class ReminderActionError extends Error { constructor(message: string, public status: number) { super(message); } }
  return { applyFamilyReminderAction: jest.fn(), ReminderActionError };
});
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) } }));
import { POST } from './route';
import { applyFamilyReminderAction, ReminderActionError } from '@/lib/familyReminders';
const context = { params: Promise.resolve({ familyId: 'family', notificationId: 'reminder' }) };
const invoke = (body: unknown) => (POST as any)({ json: async () => body }, context, { familyMemberId: 'ade' });
beforeEach(() => jest.resetAllMocks());
it('uses the authenticated member rather than an identity supplied in the body', async () => {
  (applyFamilyReminderAction as jest.Mock).mockResolvedValue({ resolution: 'cover' });
  expect((await invoke({ action: 'cover', personId: 'angela' })).status).toBe(200);
  expect(applyFamilyReminderAction).toHaveBeenCalledWith('family', 'ade', 'reminder', 'cover', undefined);
});
it('rejects unsupported actions without mutation', async () => {
  expect((await invoke({ action: 'delete' })).status).toBe(400);
  expect(applyFamilyReminderAction).not.toHaveBeenCalled();
});
it('preserves recipient authorization errors from the action service', async () => {
  (applyFamilyReminderAction as jest.Mock).mockRejectedValue(new ReminderActionError('Sign in as the recipient', 403));
  expect((await invoke({ action: 'done' })).status).toBe(403);
});
