jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    calendarEmailIntake: { findFirst: jest.fn() },
    calendarEvent: { create: jest.fn(), findFirst: jest.fn() },
    familyMember: { findFirst: jest.fn() },
  },
}));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }),
  },
}));

import prisma from '@/lib/prisma';
import { POST } from './route';

const makeRequest = (body: Record<string, unknown>) => ({ json: async () => body }) as any;
const makeContext = () => ({ params: Promise.resolve({ familyId: 'family-id' }) }) as any;

describe('school email calendar event provenance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejects an unrelated event linked to an authenticated school intake', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      sender: 'Stewart Fleming <admin@stewartfleming.bromley.sch.uk>',
      metadata: { schoolSenderVerified: true },
      parsedDrafts: [{
        title: 'School trip', person: 'child-id', date: '2026-10-02', time: '09:00',
        duration: 60, type: 'education', location: 'School',
      }],
    });

    const result = await (POST as any)(makeRequest({
      title: 'Different event', personId: 'child-id', date: '2026-10-02', time: '09:00',
      durationMinutes: 60, eventType: 'education', location: 'School',
      source: 'gmail-school-email', sourceId: 'school-intake',
    }), makeContext());

    expect(result.status).toBe(400);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });

  it('allows a reviewed cohort event after a family member is explicitly assigned', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      sender: 'Stewart Fleming <admin@stewartfleming.bromley.sch.uk>',
      metadata: { schoolSenderVerified: true },
      parsedDrafts: [{
        title: 'Reading Morning (Key Stage 2)', person: '', date: '2026-10-01', time: '09:00',
        duration: 60, type: 'education', timeSpecified: false,
        source: 'Key Stage 2 reading morning Thursday 1 October 2026',
      }],
    });
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'child-id' });
    (prisma.calendarEvent.create as jest.Mock).mockResolvedValue({
      id: 'created-event',
      eventDate: new Date('2026-10-01T00:00:00Z'),
      eventTime: new Date('2026-10-01T00:00:00Z'),
      durationMinutes: 1439,
      personId: 'child-id',
      eventType: 'education',
      recurringPattern: 'none',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await (POST as any)(makeRequest({
      title: 'Reading Morning (Key Stage 2)', personId: 'child-id', date: '2026-10-01', time: '00:00',
      durationMinutes: 1439, eventType: 'education', source: 'gmail-school-email', sourceId: 'school-intake',
    }), makeContext());

    expect(result.status).toBe(200);
    expect(prisma.familyMember.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'child-id',
        familyId: 'family-id',
        AND: [
          { OR: [{ role: { contains: 'student', mode: 'insensitive' } }, { role: { contains: 'child', mode: 'insensitive' } }] },
          { OR: [{ ageGroup: { contains: 'child', mode: 'insensitive' } }, { ageGroup: { contains: 'primary', mode: 'insensitive' } }] },
        ],
      },
      select: { id: true },
    });
    expect(prisma.calendarEvent.create).toHaveBeenCalled();
  });

  it('returns the already saved school event instead of creating a retry duplicate', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      sender: 'Stewart Fleming <admin@stewartfleming.bromley.sch.uk>',
      metadata: { schoolSenderVerified: true },
      parsedDrafts: [{
        title: 'School trip', person: 'child-id', date: '2026-10-02', time: '09:00',
        duration: 60, type: 'education', location: 'School', source: 'school trip 2 October at 9am',
      }],
    });
    const existing = {
      id: 'saved-event', familyId: 'family-id', personId: 'child-id', title: 'School trip',
      eventDate: new Date('2026-10-02T09:00:00.000Z'), eventTime: new Date('2026-10-02T09:00:00.000Z'),
      durationMinutes: 60, eventType: 'education', recurringPattern: 'none', createdAt: new Date(), updatedAt: new Date(),
    };
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(existing);

    const result = await (POST as any)(makeRequest({
      title: 'School trip', personId: 'child-id', date: '2026-10-02', time: '09:00',
      durationMinutes: 60, eventType: 'education', location: 'School',
      source: 'gmail-school-email', sourceId: 'school-intake',
    }), makeContext());

    expect(result.status).toBe(200);
    expect(result.body.id).toBe('saved-event');
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });

  it('rejects impossible date keys before creating an event', async () => {
    const result = await (POST as any)(makeRequest({
      title: 'School trip', personId: 'child-id', date: '2026-11-31', time: '09:00',
      durationMinutes: 60, eventType: 'education',
    }), makeContext());
    expect(result.status).toBe(400);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });
});
