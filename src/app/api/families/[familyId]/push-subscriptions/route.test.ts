jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { pushSubscription: {
  findMany: jest.fn(), upsert: jest.fn(), updateMany: jest.fn(),
} } }));
jest.mock('@/lib/webPush', () => ({ isWebPushConfigured: jest.fn(() => true) }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: any) => ({ body, status: init?.status ?? 200, headers: init?.headers }) } }));

import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { GET, POST, DELETE } from './route';

const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'ade' };
const endpoint = 'https://push.example/secret-endpoint';
const device = { id: 'phone', endpoint, isActive: true, lastSeenAt: new Date('2026-10-21T12:00Z') };
const payload = { subscription: { endpoint, keys: { p256dh: 'private-key', auth: 'private-auth' } } };
beforeEach(() => { jest.clearAllMocks(); });

it('checks only the member devices and never returns endpoints or keys', async () => {
  (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([device]);
  const hash = createHash('sha256').update(endpoint).digest('hex');
  const result = await (GET as any)({ url: `https://app.test/api?endpointHash=${hash}` }, context, auth);
  expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({
    where: { familyId: 'family', personId: 'ade' },
    select: { id: true, endpoint: true, deviceLabel: true, isActive: true, lastSeenAt: true },
  });
  expect(result.body).toEqual({ configured: true, activeDevices: 1,
    devices: [{ id: 'phone', label: 'Registered device', isActive: true, lastSeenAt: device.lastSeenAt.toISOString() }],
    currentDevice: { id: 'phone', isActive: true, lastSeenAt: device.lastSeenAt.toISOString() }, deviceReceipt: 'unverified' });
  expect(JSON.stringify(result.body)).not.toContain(endpoint);
  expect(result.headers['Cache-Control']).toBe('no-store');
});

it('does not identify another browser as this device', async () => {
  (prisma.pushSubscription.findMany as jest.Mock).mockResolvedValue([device]);
  const result = await (GET as any)({ url: `https://app.test/api?endpointHash=${'a'.repeat(64)}` }, context, auth);
  expect(result.body.currentDevice).toBeNull();
});

it.each([GET, POST, DELETE])('rejects unlinked members without database access', async handler => {
  const result = await (handler as any)({ url: 'https://app.test/api', json: async () => ({ ...payload, endpoint }) }, context, { familyMemberId: null });
  expect(result.status).toBe(403);
  expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
  expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
  expect(prisma.pushSubscription.updateMany).not.toHaveBeenCalled();
});

it('rejects malformed fingerprints before querying', async () => {
  expect((await (GET as any)({ url: 'https://app.test/api?endpointHash=secret' }, context, auth)).status).toBe(400);
  expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
});

it('does not reassign an endpoint owned by another recipient', async () => {
  (prisma.pushSubscription.upsert as jest.Mock).mockRejectedValue({ code: 'P2002' });
  const result = await (POST as any)({ json: async () => payload }, context, auth);
  expect(result.status).toBe(409);
  expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(expect.objectContaining({
    where: { endpoint, familyId: 'family', personId: 'ade' },
    select: { id: true, isActive: true, lastSeenAt: true },
  }));
});

it('returns registration metadata without endpoint secrets', async () => {
  (prisma.pushSubscription.upsert as jest.Mock).mockResolvedValue(device);
  const result = await (POST as any)({ json: async () => payload }, context, auth);
  expect(result.body).toEqual({ id: 'phone', isActive: true, lastSeenAt: device.lastSeenAt.toISOString() });
});

it('disables only the signed-in recipient endpoint', async () => {
  await (DELETE as any)({ json: async () => ({ endpoint }) }, context, auth);
  expect(prisma.pushSubscription.updateMany).toHaveBeenCalledWith({
    where: { familyId: 'family', personId: 'ade', endpoint }, data: { isActive: false },
  });
});
