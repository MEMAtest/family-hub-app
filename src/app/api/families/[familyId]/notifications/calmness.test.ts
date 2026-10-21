jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { notification: {
  findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), updateMany: jest.fn(),
} } }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn() }));
jest.mock('@/lib/schoolIntakeServer', () => ({ enrichSavedSchoolEventResponses: jest.fn() }));
jest.mock('@/lib/familyReminders', () => ({ applyFamilyReminderAction: jest.fn(), ReminderActionError: class extends Error {} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));

import prisma from '@/lib/prisma';
import { sendMemberPushNotification } from '@/lib/webPush';
import { POST } from './route';
import { POST as readAll } from './read-all/route';
import { DELETE } from './[notificationId]/route';

const context = { params: Promise.resolve({ familyId: 'family', notificationId: 'notice' }) };
const auth = { familyMemberId: 'ade' };
const data = { type: 'reminder', title: 'Overdue', message: 'Task', priority: 'high', category: 'event', metadata: { dedupeKey: 'brain-1' } };
const request = { json: async () => data };

beforeEach(() => { jest.clearAllMocks(); (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
  (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, timestamp: new Date() })); });

it('uses a stable recipient/family dedupe ID and never pushes hydration discoveries', async () => {
  await (POST as any)(request, context, auth);
  const firstId = (prisma.notification.create as jest.Mock).mock.calls[0][0].data.id;
  await (POST as any)(request, context, auth);
  expect((prisma.notification.create as jest.Mock).mock.calls[1][0].data.id).toBe(firstId);
  await (POST as any)(request, context, { familyMemberId: 'angela' });
  expect((prisma.notification.create as jest.Mock).mock.calls[2][0].data.id).not.toBe(firstId);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('returns historical read or dismissed receipts unchanged', async () => {
  const saved = { id: 'old', ...data, read: true, expiresAt: new Date(0) };
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue(saved);
  const response = await (POST as any)(request, context, auth);
  expect(response.body).toMatchObject({ id: 'old', read: true, expiresAt: new Date(0).toISOString() });
  expect(prisma.notification.create).not.toHaveBeenCalled();
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('handles concurrent creation conflicts without another delivery', async () => {
  (prisma.notification.findFirst as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'winner' });
  (prisma.notification.create as jest.Mock).mockRejectedValueOnce({ code: 'P2002' });
  const response = await (POST as any)(request, context, auth);
  expect(response.status).toBe(200);
  expect(response.body.id).toBe('winner');
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('dismisses by expiry, retaining the server receipt', async () => {
  (prisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 'notice', recipientPersonId: 'ade' });
  await (DELETE as any)({}, context, auth);
  expect(prisma.notification.update).toHaveBeenCalledWith({ where: { id: 'notice' }, data: { read: true, expiresAt: expect.any(Date) } });
});

it('bulk-read excludes sleeping, expired and other recipients, including when identity is unclaimed', async () => {
  await (readAll as any)({}, context, { familyMemberId: null });
  const where = (prisma.notification.updateMany as jest.Mock).mock.calls[0][0].where;
  expect(where.OR).toEqual([{ recipientPersonId: null }]);
  expect(where.AND).toEqual([
    { OR: [{ expiresAt: null }, { expiresAt: { gt: expect.any(Date) } }] },
    { OR: [{ snoozedUntil: null }, { snoozedUntil: { lte: expect.any(Date) } }] },
  ]);
});
