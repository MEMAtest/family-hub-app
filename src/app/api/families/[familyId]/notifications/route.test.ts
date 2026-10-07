jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  notification: { findMany: jest.fn(), update: jest.fn(), create: jest.fn() },
  calendarEvent: { findMany: jest.fn() }, familyMember: { findMany: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn() }));
jest.mock('@/lib/notificationRecipients', () => ({ notificationVisibility: jest.fn() }));
jest.mock('@/lib/schoolIntakeServer', () => ({ enrichSavedSchoolEventResponses: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));

import prisma from '@/lib/prisma';
import { sendMemberPushNotification } from '@/lib/webPush';
import { notificationVisibility } from '@/lib/notificationRecipients';
import { enrichSavedSchoolEventResponses } from '@/lib/schoolIntakeServer';
import { GET } from './route';

const request = { url: 'https://example.test/api/families/family/notifications' };
const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'ade' };
const reminder = { id: 'old', title: 'Old title', message: 'Photo day for Askia', relatedEventId: 'photo',
  relatedPersonId: 'askia', recipientPersonId: 'ade', read: false, metadata: { source: 'notification-sweep' } };

beforeEach(() => {
  jest.resetAllMocks();
  (notificationVisibility as jest.Mock).mockResolvedValue({ where: { familyId: 'family', recipientPersonId: 'ade' }, unclaimed: [] });
  (prisma.notification.findMany as jest.Mock).mockResolvedValue([reminder]);
  (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
  (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', name: 'Amari', role: 'Child' }]);
  (enrichSavedSchoolEventResponses as jest.Mock).mockResolvedValue([{ id: 'photo', title: 'Individual and sibling photographs',
    personId: 'amari', source: 'gmail-school-email', sourceId: 'intake', eventDate: new Date('2026-10-07T00:00Z'), metadata: {} }]);
});

it('uses family-scoped canonical events and shared enrichment without writing or sending', async () => {
  const response = await (GET as any)(request, context, auth);
  expect(response.body[0].message).toBe('Individual and sibling photographs · 7 Oct 2026 · Amari');
  expect(response.body[0].metadata.canAct).toBe(true);
  expect(prisma.calendarEvent.findMany).toHaveBeenCalledWith({ where: { familyId: 'family', id: { in: ['photo'] } } });
  expect(enrichSavedSchoolEventResponses).toHaveBeenCalledWith('family', []);
  expect(prisma.notification.update).not.toHaveBeenCalled();
  expect(prisma.notification.create).not.toHaveBeenCalled();
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('does not fetch or rewrite unrelated parent reminders', async () => {
  (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ ...reminder, metadata: { source: 'family-reminder-planner' } }]);
  const response = await (GET as any)(request, context, auth);
  expect(response.body[0].message).toBe(reminder.message);
  expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
  expect(enrichSavedSchoolEventResponses).not.toHaveBeenCalled();
});

it('leaves recipient visibility and action ownership unchanged', async () => {
  (prisma.notification.findMany as jest.Mock).mockResolvedValue([{ ...reminder, recipientPersonId: 'angela' }]);
  (notificationVisibility as jest.Mock).mockResolvedValue({ where: { familyId: 'family' }, unclaimed: [{ id: 'angela', name: 'Angela' }] });
  const response = await (GET as any)(request, context, auth);
  expect(response.body[0].metadata).toMatchObject({ canAct: false, recipientClaimed: false, recipientName: 'Angela' });
  expect(response.body[0].recipientPersonId).toBe('angela');
});
