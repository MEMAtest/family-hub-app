jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyMember: { findFirst: jest.fn() },
  calendarEvent: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/schoolIntakeServer', () => ({ validateSchoolEventImport: jest.fn(), schoolEventMetadata: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { POST, PUT } from './route';
const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'ade' };
const request = (body: unknown) => ({ json: async () => body });
const stored = { id: 'trip', familyId: 'family', personId: 'angela', title: 'Wedding',
  eventDate: new Date('2026-10-08T06:00Z'), eventTime: new Date('2026-10-08T06:00Z'),
  durationMinutes: 60, eventType: 'personal', recurringPattern: 'none', metadata: {} };

describe('event persistence boundaries', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'angela' });
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(stored);
    (prisma.calendarEvent.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...stored, ...data }));
    (prisma.calendarEvent.update as jest.Mock).mockImplementation(async ({ data }) => ({ ...stored, ...data }));
  });
  it('persists travel, cancellation, reminders and parent targeting on creation', async () => {
    const travel = { destination: 'Dusseldorf', departureDate: '2026-10-08', coordinatorPersonIds: ['ade'] };
    const response = await (POST as any)(request({ personId: 'angela', title: 'Wedding', date: '2026-10-08', time: '06:00',
      eventType: 'personal', status: 'tentative', workStatus: { type: 'travel', affectsPickup: true }, travel,
      reminders: [], reminderPreferences: { push: false } }), context, auth);
    expect(response.status).toBe(200);
    expect(response.body.travel).toEqual(travel);
    expect(response.body.status).toBe('tentative');
    expect(response.body.reminderPreferences.push).toBe(false);
  });
  it('preserves existing provenance when only a rich field is updated', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({ ...stored, metadata: { institution: 'Verified school', travel: { destination: 'Dusseldorf' } } });
    const response = await (PUT as any)(request({ id: 'trip', status: 'cancelled', metadata: { institution: 'Spoofed' } }), context, auth);
    expect(response.body.metadata).toMatchObject({ institution: 'Verified school', status: 'cancelled', travel: { destination: 'Dusseldorf' } });
  });
  it('records explicit manual reassignment instead of silently allowing a future repair to undo it', async () => {
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({ ...stored, source: 'calendar-intake', sourceId: 'intake' });
    const response = await (PUT as any)(request({ id: 'trip', person: 'ade' }), context, auth);
    expect(response.body.metadata.assignmentOverride).toMatchObject({ personId: 'ade', changedBy: 'ade' });
  });
  it('rejects another household member ID before writing', async () => {
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue(null);
    const response = await (POST as any)(request({ personId: 'foreign', title: 'Trip', date: '2026-10-08' }), context, auth);
    expect(response.status).toBe(400);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });
});
