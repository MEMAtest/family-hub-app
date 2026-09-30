jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { calendarEmailIntake: { findFirst: jest.fn(), update: jest.fn() } },
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
import { PATCH } from './route';

const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as any;
const makeContext = () => ({ params: Promise.resolve({ familyId: 'family-id' }) }) as any;

describe('calendar email intake review status', () => {
  beforeEach(() => jest.clearAllMocks());

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
