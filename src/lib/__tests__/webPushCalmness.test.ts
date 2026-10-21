jest.mock('web-push', () => ({ __esModule: true, default: { setVapidDetails: jest.fn(), sendNotification: jest.fn() } }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  notification: { findFirst: jest.fn() }, pushSubscription: { findMany: jest.fn(), update: jest.fn() },
} }));

const oldPublic = process.env.VAPID_PUBLIC_KEY;
const oldPrivate = process.env.VAPID_PRIVATE_KEY;
process.env.VAPID_PUBLIC_KEY = 'test';
process.env.VAPID_PRIVATE_KEY = 'test';
const { sendFamilyPushNotification, sendMemberPushNotification } = require('../webPush');
const prisma = require('../prisma').default;
const webpush = require('web-push').default;

beforeEach(() => {
  jest.clearAllMocks();
  prisma.pushSubscription.findMany.mockResolvedValue([{ endpoint: 'https://push.test/device', p256dh: 'p', auth: 'a' }]);
  webpush.sendNotification.mockResolvedValue({});
});
afterAll(() => {
  if (oldPublic === undefined) delete process.env.VAPID_PUBLIC_KEY; else process.env.VAPID_PUBLIC_KEY = oldPublic;
  if (oldPrivate === undefined) delete process.env.VAPID_PRIVATE_KEY; else process.env.VAPID_PRIVATE_KEY = oldPrivate;
});

it.each(['gmail-nursery-email', 'gmail-school-email', 'grandir-parent-portal', 'notification-sweep'])(
  'keeps a bulk %s import inbox-only, never calling the provider', async source => {
    prisma.notification.findFirst.mockResolvedValue({ read: false, metadata: { source } });
    for (let index = 0; index < 20; index++) await sendFamilyPushNotification('family', {
      title: 'Imported', body: 'History', data: { notificationId: `import-${index}` },
    });
    expect(prisma.pushSubscription.findMany).not.toHaveBeenCalled();
    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

it('preserves scheduled grouped home-intelligence pushes with a bounded source envelope', async () => {
  prisma.notification.findFirst.mockResolvedValue({ read: false, timestamp: new Date(), metadata: { source: 'home-intelligence' } });
  await sendFamilyPushNotification('family', { title: 'Household summary', body: 'Review', data: { notificationId: 'home-summary' } });
  expect(webpush.sendNotification).toHaveBeenCalledTimes(1);
  expect(Date.parse(JSON.parse(webpush.sendNotification.mock.calls[0][1]).data.expiresAt)).toBeGreaterThan(Date.now());
  webpush.sendNotification.mockClear();
  prisma.notification.findFirst.mockResolvedValue({ read: false, timestamp: new Date('2026-01-01'), metadata: { source: 'home-intelligence' } });
  await sendFamilyPushNotification('family', { title: 'Old summary', body: 'Old', data: { notificationId: 'old-home-summary' } });
  expect(webpush.sendNotification).not.toHaveBeenCalled();
});

it.each([
  { read: true }, { expiresAt: new Date(0) }, { snoozedUntil: new Date(Date.now() + 60_000) },
  { recipientPersonId: 'other' },
])('does not deliver inactive or wrong-recipient records: %p', async state => {
  prisma.notification.findFirst.mockResolvedValue(state);
  await sendMemberPushNotification('family', 'ade', { title: 'Private', body: 'Private', data: { notificationId: 'n' } });
  expect(webpush.sendNotification).not.toHaveBeenCalled();
});

it('gives each recurring occurrence its own durable delivery key and bounds offline TTL', async () => {
  for (const occurrenceId of ['2026-10-21', '2026-10-22']) await sendMemberPushNotification('family', 'ade', {
    title: 'Event', body: 'Upcoming', tag: 'series', data: { occurrenceId },
  });
  const envelopes = webpush.sendNotification.mock.calls.map((call: any[]) => JSON.parse(call[1]));
  expect(envelopes[0].data.deliveryId).not.toBe(envelopes[1].data.deliveryId);
  expect(envelopes[0].requireInteraction).toBe(false);
  expect(webpush.sendNotification.mock.calls[0][2]).toEqual({ TTL: 900, urgency: 'normal' });
});

it('does not permanently suppress repeated explicit device tests sharing a tag', async () => {
  const payload = { title: 'Test', body: 'Test', tag: 'push-test-family' };
  await sendMemberPushNotification('family', 'ade', payload);
  await sendMemberPushNotification('family', 'ade', payload);
  const ids = webpush.sendNotification.mock.calls.map((call: any[]) => JSON.parse(call[1]).data.deliveryId);
  expect(ids[0]).not.toBe(ids[1]);
});

it('targets an explicit device within the recipient and family, never broadening to other phones', async () => {
  prisma.pushSubscription.findMany.mockResolvedValue([]);
  const result = await sendMemberPushNotification('family', 'ade', { title: 'Test', body: 'Test' }, 'other-member-device');
  expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith({ where: {
    familyId: 'family', personId: 'ade', isActive: true, id: 'other-member-device',
  } });
  expect(result.sent).toBe(0);
  expect(webpush.sendNotification).not.toHaveBeenCalled();
});

it.each([404, 410])('marks an expired device inactive after provider status %s', async statusCode => {
  webpush.sendNotification.mockRejectedValue({ statusCode, endpoint: 'private-endpoint' });
  const result = await sendMemberPushNotification('family', 'ade', { title: 'Test', body: 'Test' }, 'phone');
  expect(result).toEqual(expect.objectContaining({ sent: 0, inactive: 1, failed: 0 }));
  expect(prisma.pushSubscription.update).toHaveBeenCalledWith({
    where: { endpoint: 'https://push.test/device' }, data: { isActive: false },
  });
});

it('does not log endpoint secrets or provider response bodies on failure', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  try {
    webpush.sendNotification.mockRejectedValue({ statusCode: 503, endpoint: 'private-endpoint', body: 'private-provider-body' });
    const result = await sendMemberPushNotification('family', 'ade', { title: 'Test', body: 'Test' }, 'phone');
    expect(result).toEqual(expect.objectContaining({ sent: 0, failed: 1 }));
    expect(warn).toHaveBeenCalledWith('Failed to send web push notification', { statusCode: 503 });
  } finally { warn.mockRestore(); }
});
