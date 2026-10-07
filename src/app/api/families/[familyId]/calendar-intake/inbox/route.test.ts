jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  family: { findUnique: jest.fn() }, familyMember: { findMany: jest.fn() }, gmailConnection: { findUnique: jest.fn() },
  calendarEmailIntake: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), updateMany: jest.fn() },
  calendarEvent: { findMany: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/gmailCalendarServer', () => ({ gmailForwardingAddress: jest.fn() }));
jest.mock('@/lib/whatsappCalendarReminders', () => ({ getWhatsAppConsentState: jest.fn(), getWhatsAppConfig: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { GET, PATCH } from './route';
const context = { params: Promise.resolve({ familyId: 'family-id' }) };
const auth = { familyMemberId: 'parent-id' };
const request = (body: unknown) => ({ json: async () => body });
const draft = { importId: 'photo', sourceEventKey: 'photo-key', title: 'Photographs', person: 'askia', date: '2026-10-07', source: 'School photographs' };
const intake = { id: 'intake-id', status: 'review_required', needsReview: 2, createdEventIds: ['already-imported'],
  parsedDrafts: [draft], metadata: {}, updatedAt: new Date('2026-10-06') };

describe('calendar intake decisions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockImplementation(async () => ({ ...intake, parsedDrafts: [{ ...draft }] }));
    (prisma.calendarEmailIntake.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'created-now', personId: 'askia', title: 'Photographs', eventDate: new Date('2026-10-07') }]);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', role: 'Child', name: 'Amari' }, { id: 'askia', role: 'Child', name: 'Askia' }]);
  });
  it('counts all pending messages, including gated content and OCR', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarEmailIntake.aggregate as jest.Mock).mockResolvedValue({ _sum: { needsReview: 18 }, _count: { id: 7 } });
    const response = await (GET as any)({}, context);
    expect(response.body.pendingReviewCount).toBe(18);
    expect(prisma.calendarEmailIntake.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: { familyId: 'family-id', status: { in: ['review_required', 'partial_review', 'needs_ocr', 'content_required'] } },
    }));
  });
  it('preserves unselected drafts when some events were imported', async () => {
    const response = await (PATCH as any)(request({ intakeId: 'intake-id', createdEventIds: ['created-now'], needsReview: 1 }), context, auth);
    expect(response.status).toBe(200);
    expect(prisma.calendarEmailIntake.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({
      status: 'partial_review', needsReview: 1, createdEventIds: ['already-imported', 'created-now'],
    }) }));
  });
  it('persists explicit attendee choices and the original imported choice', async () => {
    const response = await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'photo', personId: 'amari' }] }), context, auth);
    expect(response.status).toBe(200);
    const data = (prisma.calendarEmailIntake.updateMany as jest.Mock).mock.calls[0][0].data;
    expect(data.status).toBe('review_required');
    expect(data.metadata.schoolOverrides['photo-key']).toMatchObject({ personId: 'amari', actorId: 'parent-id' });
    expect(data.metadata.schoolOriginalParsedDrafts[0].person).toBe('askia');
    expect(data.parsedDrafts[0].schoolAssignment.originalPersonId).toBe('askia');
  });
  it('rejects a foreign child, unknown draft, and foreign event linkage', async () => {
    expect((await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'photo', personId: 'foreign' }] }), context, auth)).status).toBe(400);
    expect((await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'missing', personId: 'amari' }] }), context, auth)).status).toBe(400);
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
    expect((await (PATCH as any)(request({ intakeId: 'intake-id', createdEventIds: ['foreign'] }), context, auth)).status).toBe(400);
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
  });
  it('rejects concurrent stale intake changes', async () => {
    (prisma.calendarEmailIntake.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    expect((await (PATCH as any)(request({ intakeId: 'intake-id', dismissed: true, needsReview: 0 }), context, auth)).status).toBe(409);
  });
  it('does not silently complete gated content without explicit dismissal', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ ...intake, status: 'content_required' });
    const response = await (PATCH as any)(request({ intakeId: 'intake-id', needsReview: 0 }), context, auth);
    expect(response.body.status).toBe('content_required');
  });
});
