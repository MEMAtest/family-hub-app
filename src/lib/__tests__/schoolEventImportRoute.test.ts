/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyMember: { findFirst: jest.fn(), findMany: jest.fn() }, familyDocument: { findUnique: jest.fn() },
  calendarEmailIntake: { findFirst: jest.fn() }, calendarEvent: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { POST, PUT } from '@/app/api/families/[familyId]/events/route';
import { initialSchoolRules } from '@/utils/schoolSources';
import { schoolImportedEventId } from '../schoolIntakeServer';
const members = [{ id: 'amari', name: 'Amari', role: 'Child' }, { id: 'askia', name: 'Askia', role: 'Child' }];
const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'parent' };
const request = (body: unknown) => ({ json: async () => body });
const input = { personId: 'amari', title: 'Individual and sibling photographs', date: '2026-10-07',
  time: '00:00', durationMinutes: 1439, eventType: 'education', location: '', source: 'calendar-intake', sourceId: 'intake' };
let intake: any;
describe('school event POST integration', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    intake = { id: 'intake', familyId: 'family', sender: 'parent@example.test', text: 'Stewart Fleming Primary School',
      status: 'review_required', receivedAt: new Date('2026-10-06'), metadata: { schoolSenderVerified: false }, parsedDrafts: [{
        importId: 'photo', sourceEventKey: 'photo-key', title: input.title, person: 'askia', date: input.date, time: '09:00',
        timeSpecified: false, duration: 60, type: 'education', source: 'All children photographs 7 October 2026',
        sourceLine: 1, recurring: 'none', importStatus: 'ready', warnings: [],
      }] };
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'amari' });
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: initialSchoolRules(members), version: 1 });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(intake);
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.calendarEvent.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, recurringPattern: 'none' }));
  });
  it('validates a generic linked intake and replaces spoofed source metadata with a server snapshot', async () => {
    const response = await (POST as any)(request({ ...input, metadata: {
      schoolProvenance: { senderVerified: true, institutionKey: 'forged', concernedMemberIds: ['foreign'] },
      schoolAssignment: { concernedMemberIds: ['askia'], attendeePersonId: 'askia', attendeeStatus: 'confirmed' },
    } }), context, auth);
    expect(response.status).toBe(200);
    const data = (prisma.calendarEvent.create as jest.Mock).mock.calls[0][0].data;
    expect(data.id).toBe(schoolImportedEventId('family', 'intake', 'photo-key', 'amari'));
    expect(data.metadata.schoolProvenance).toMatchObject({ intakeId: 'intake', institutionKey: 'stewart-fleming', senderVerified: false, sender: 'parent@example.test' });
    expect(data.metadata.schoolAssignment).toMatchObject({ originalPersonId: 'askia', sourceEventKey: 'photo-key',
      concernedMemberIds: ['amari'], attendeePersonId: 'amari', attendeeStatus: 'confirmed' });
    expect(data.metadata.schoolProvenance.concernedMemberIds).toEqual(['amari']);
  });
  it('rejects unauthenticated trusted school mail and an event not present in the linked intake', async () => {
    expect((await (POST as any)(request({ ...input, source: 'gmail-school-email' }), context, auth)).status).toBe(400);
    expect((await (POST as any)(request({ ...input, title: 'Invented assembly' }), context, auth)).status).toBe(400);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    expect((await (POST as any)(request(input), context, auth)).status).toBe(400);
    expect(prisma.calendarEmailIntake.findFirst).toHaveBeenCalledWith({ where: { id: 'intake', familyId: 'family' } });
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });
  it('returns a saved import on repeat, but requires repair for a differently assigned saved event', async () => {
    const saved = { ...input, id: 'saved', familyId: 'family', eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07'), metadata: {} };
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(saved);
    expect((await (POST as any)(request(input), context, auth)).body.id).toBe('saved');
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue({ ...saved, personId: 'askia' });
    expect((await (POST as any)(request(input), context, auth)).status).toBe(409);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
  });
  it('recovers concurrent deterministic-ID creation without making a second event', async () => {
    const id = schoolImportedEventId('family', 'intake', 'photo-key', 'amari');
    (prisma.calendarEvent.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValueOnce(null).mockResolvedValue({ id, personId: 'amari', title: input.title,
      eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07'), metadata: {} });
    const response = await (POST as any)(request(input), context, auth);
    expect(response.status).toBe(200);
    expect(response.body.id).toBe(id);
    expect(prisma.calendarEvent.create).toHaveBeenCalledTimes(1);
    expect(prisma.calendarEvent.findFirst).toHaveBeenLastCalledWith({ where: { id, familyId: 'family', sourceId: 'intake' }, include: { person: true } });
  });
  it.each(['24:00', '09:60', '9:00', '', null, 900])('rejects malformed POST and PUT times %j before persistence', async (time) => {
    expect((await (POST as any)(request({ ...input, time }), context, auth)).status).toBe(400);
    expect((await (PUT as any)(request({ id: 'saved', time }), context, auth)).status).toBe(400);
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.update).not.toHaveBeenCalled();
  });
  it.each(['00:00', '23:59'])('accepts valid boundary time %s for ordinary events', async (time) => {
    const response = await (POST as any)(request({ personId: 'amari', title: 'Family date', date: input.date, time }), context, auth);
    expect(response.status).toBe(200);
  });
});
