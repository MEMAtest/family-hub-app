jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { family: { findUnique: jest.fn() }, gmailConnection: { findUnique: jest.fn() }, calendarEmailIntake: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), update: jest.fn() } },
}));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/gmailCalendarServer', () => ({ gmailForwardingAddress: jest.fn() }));
jest.mock('@/lib/whatsappCalendarReminders', () => ({
  getWhatsAppConsentState: jest.fn(),
  getWhatsAppConfig: jest.fn(),
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }),
  },
}));

import prisma from '@/lib/prisma';
import { GET, PATCH } from './route';

const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as any;
const makeContext = () => ({ params: Promise.resolve({ familyId: 'family-id' }) }) as any;

describe('calendar email intake review status', () => {
  beforeEach(() => jest.clearAllMocks());

  it('counts all pending drafts for this family, not just the twelve visible inbox messages', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id', familyCode: 'code' });
    (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarEmailIntake.aggregate as jest.Mock).mockResolvedValue({ _sum: { needsReview: 18 } });
    const result = await (GET as any)({}, makeContext());
    expect(result.status).toBe(200);
    expect(result.body.pendingReviewCount).toBe(18);
    expect(prisma.calendarEmailIntake.aggregate).toHaveBeenCalledWith({ where: { familyId: 'family-id', status: { in: ['review_required', 'partial_review'] } }, _sum: { needsReview: true } });
  });

  it('keeps an intake pending when some imported events still need review', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      id: 'intake-id', createdEventIds: ['already-imported'],
    });
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({
      id: 'intake-id', status: 'partial_review', createdEventIds: ['already-imported', 'created-now'],
    });

    const result = await (PATCH as any)(makeRequest({
      intakeId: 'intake-id', createdEventIds: ['created-now'], needsReview: 1,
    }), makeContext());

    expect(result.status).toBe(200);
    expect(prisma.calendarEmailIntake.update).toHaveBeenCalledWith({
      where: { id: 'intake-id' },
      data: {
        status: 'partial_review',
        createdEventIds: ['already-imported', 'created-now'],
        needsReview: 1,
      },
    });
  });

  it('marks an intake complete only when no event remains to review', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ id: 'intake-id', createdEventIds: [] });
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({
      id: 'intake-id', status: 'reviewed_imported', createdEventIds: ['created-now'],
    });

    await (PATCH as any)(makeRequest({ intakeId: 'intake-id', createdEventIds: ['created-now'], needsReview: 0 }), makeContext());

    expect(prisma.calendarEmailIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'reviewed_imported', needsReview: 0 }),
    }));
  });
});
