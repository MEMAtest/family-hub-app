jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  notification: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn() }, calendarEvent: { findMany: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn() }));
jest.mock('@/lib/schoolIntakeServer', () => ({ enrichSavedSchoolEventResponses: async (_family: string, events: unknown[]) => events }));
jest.mock('@/lib/calendarEventMapping', () => ({ toCalendarEventResponse: (event: unknown) => event }));
jest.mock('@/lib/familyReminderPlanner', () => ({ travelContext: (event: any) => event.travel }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));

import prisma from '@/lib/prisma';
import { sendMemberPushNotification } from '@/lib/webPush';
import { POST } from './route';

const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'ade' };
const event = (id: string, extra = {}) => ({ id, familyId: 'family', personId: 'ade', title: id,
  eventDate: new Date('2026-10-21T00:00:00Z'), eventTime: new Date('1970-01-01T13:00:00Z'), eventType: 'meeting', ...extra });
let saved: Map<string, any>;

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-21T12:00:00Z'));
  saved = new Map();
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([event('one'), event('two'), event('three')]);
  (prisma.notification.findFirst as jest.Mock).mockImplementation(async ({ where }) => where.read === false
    ? [...saved.values()].find(n => !n.read && n.type !== 'system') || null : saved.get(where.OR[0].id) || null);
  (prisma.notification.findMany as jest.Mock).mockImplementation(async () => [...saved.values()]);
  (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
    if (saved.has(data.id)) throw { code: 'P2002' };
    saved.set(data.id, data);
    return data;
  });
  (sendMemberPushNotification as jest.Mock).mockResolvedValue({ sent: 1 });
});
afterEach(() => jest.useRealTimers());

it('does not remind a parent about a held unconfirmed imported suggestion', async () => {
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([event('camp', {
    metadata: { schoolImportReview: { reason: 'Confirm booking' } },
  })]);
  expect((await (POST as any)({}, context, auth)).body).toEqual({ created: 0, pushSent: 0 });
  expect(prisma.notification.create).not.toHaveBeenCalled();
});

it('creates silent recipient-scoped event notices and only one catch-up alert', async () => {
  const response = await (POST as any)({}, context, auth);
  expect(response.body).toEqual({ created: 3, pushSent: 1 });
  expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ personId: 'ade', eventDate: { gte: new Date('2026-10-21T00:00Z'), lte: expect.any(Date) } }) }));
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
  expect(sendMemberPushNotification).toHaveBeenCalledWith('family', 'ade', expect.objectContaining({ title: 'Your family catch-up' }));
  expect([...saved.values()].filter(n => n.type === 'reminder')).toEqual(expect.arrayContaining([
    expect.objectContaining({ recipientPersonId: 'ade', expiresAt: new Date('2026-10-21T13:00Z') }),
  ]));
  const second = await (POST as any)({}, context, auth);
  expect(second.body).toEqual({ created: 0, pushSent: 0 });
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
});

it('concurrent launches claim each notice once and cannot fan out catch-up pushes', async () => {
  await Promise.all([(POST as any)({}, context, auth), (POST as any)({}, context, auth)]);
  expect(saved.size).toBe(4);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
});

it('does not issue another summary for a newly discovered event on the same day', async () => {
  await (POST as any)({}, context, auth);
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([event('new')]);
  expect((await (POST as any)({}, context, auth)).body).toEqual({ created: 1, pushSent: 0 });
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
});

it('does not replay past events or duplicate member-specific travel reminders', async () => {
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([
    event('past', { eventTime: new Date('1970-01-01T11:00Z') }), event('travel', { travel: true }),
  ]);
  expect((await (POST as any)({}, context, auth)).body).toEqual({ created: 0, pushSent: 0 });
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('does nothing without a claimed recipient', async () => {
  await (POST as any)({}, context, { familyMemberId: null });
  expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
  expect(prisma.notification.create).not.toHaveBeenCalled();
});

it('offers one summary for unread imported history even without new calendar notices', async () => {
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
  saved.set('nursery', { id: 'nursery', type: 'calendar_email_intake', read: false, actionRequired: true,
    timestamp: new Date(), metadata: { source: 'gmail-nursery-email' } });
  await (POST as any)({}, context, auth);
  await (POST as any)({}, context, auth);
  expect(sendMemberPushNotification).toHaveBeenCalledTimes(1);
  expect(prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({
    familyId: 'family', read: false,
    OR: [{ recipientPersonId: null }, { recipientPersonId: 'ade' }],
  }) }));
});
