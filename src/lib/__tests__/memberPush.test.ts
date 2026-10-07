jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { pushSubscription: { findMany: jest.fn(), update: jest.fn() } } }));
import prisma from '@/lib/prisma';
import webpush from 'web-push';

beforeEach(() => { jest.clearAllMocks(); });
it('requires member identity for private push even without a configured sender', () => {
  const { sendMemberPushNotification } = require('@/lib/webPush');
  expect(() => sendMemberPushNotification('family', '', { title: 'Private', body: 'Private' })).toThrow('recipient');
});
it('queries only the named member active endpoints, never legacy unscoped subscriptions', async () => {
  const oldPublic = process.env.VAPID_PUBLIC_KEY, oldPrivate = process.env.VAPID_PRIVATE_KEY;
  process.env.VAPID_PUBLIC_KEY = 'test-public'; process.env.VAPID_PRIVATE_KEY = 'test-private';
  let send: any;
  jest.isolateModules(() => { send = require('@/lib/webPush').sendMemberPushNotification; });
  // isolateModules shares the explicit mock factories' module instances only inside its registry.
  let isolatedPrisma: any, isolatedPush: any;
  jest.isolateModules(() => {
    isolatedPrisma = require('@/lib/prisma').default;
    isolatedPush = require('web-push').default;
    send = require('@/lib/webPush').sendMemberPushNotification;
    isolatedPrisma.pushSubscription.findMany.mockResolvedValue([{ endpoint: 'https://push.test/angela', p256dh: 'p', auth: 'a' }]);
    isolatedPush.sendNotification.mockResolvedValue({ statusCode: 201 });
  });
  const result = await send('family', 'angela', { title: 'Angela', body: 'Prepare' });
  expect(isolatedPrisma.pushSubscription.findMany).toHaveBeenCalledWith({ where: { familyId: 'family', isActive: true, personId: 'angela' } });
  expect(result.sent).toBe(1); expect(result.configured).toBe(true);
  if (oldPublic === undefined) delete process.env.VAPID_PUBLIC_KEY; else process.env.VAPID_PUBLIC_KEY = oldPublic;
  if (oldPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY; else process.env.VAPID_PRIVATE_KEY = oldPrivate;
});
