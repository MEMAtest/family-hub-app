/** @jest-environment node */
jest.mock('@/lib/neonAuth', () => ({ getNeonSessionIdentity: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarEvent: { findFirst: jest.fn(), update: jest.fn() }, calendarEmailIntake: { findFirst: jest.fn(), update: jest.fn() },
  familyMember: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn(), create: jest.fn() },
} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { getNeonSessionIdentity } from '@/lib/neonAuth';
import { GET } from './route';
import { initialSchoolRules } from '@/utils/schoolSources';
const members = [{ id: 'amari', name: 'Amari', role: 'Child' }, { id: 'askia', name: 'Askia', role: 'Child' },
  { id: 'parent', name: 'Ademola', role: 'Parent' }];
const context = (familyId = 'family') => ({ params: Promise.resolve({ familyId, eventId: 'pta' }) });
let event: any;
let intake: any;
describe('legacy saved school source enrichment', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...env, BYPASS_AUTH_FOR_TESTS: 'true', TEST_AUTH_FAMILY_ID: 'family', TEST_AUTH_FAMILY_MEMBER_ID: 'parent', NEXT_PUBLIC_E2E: 'false' };
    event = { id: 'pta', sourceId: 'intake', title: 'PTA AGM', personId: 'askia', eventDate: new Date('2026-10-07'), metadata: null };
    intake = { id: 'intake', familyId: 'family', sender: 'office@stewartfleming.bromley.sch.uk', subject: 'Weekly update',
      text: 'Stewart Fleming Primary School', normalizedText: 'PTA AGM 7 October 2026', html: '',
      receivedAt: new Date('2026-10-06'), metadata: {}, parsedDrafts: [{ importId: 'draft-pta', title: 'PTA AGM',
        person: '', date: '2026-10-07', source: 'PTA AGM 7 October 2026', sourceLine: 1, warnings: [], importStatus: 'needs_review' }] };
    (prisma.calendarEvent.findFirst as jest.Mock).mockResolvedValue(event);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(intake);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ version: 1, data: initialSchoolRules(members) });
  });
  afterAll(() => { process.env = env; });
  it('returns concerned Amari separately from unconfirmed adult attendance without writing', async () => {
    const response = await (GET as any)({}, context());
    expect(response.status).toBe(200);
    expect(response.body.source).toMatchObject({ institution: 'Stewart Fleming Primary School', schoolAssignment: {
      concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation',
    } });
    expect(prisma.calendarEvent.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'pta', familyId: 'family' } }));
    expect(prisma.calendarEmailIntake.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'intake', familyId: 'family' } }));
    expect(event.personId).toBe('askia');
    expect(prisma.calendarEvent.update).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.update).not.toHaveBeenCalled();
    expect(prisma.familyDocument.create).not.toHaveBeenCalled();
  });
  it('respects main durable adult attendee override without changing source concern', async () => {
    event.personId = 'parent';
    event.metadata = { assignmentOverride: { personId: 'parent', changedBy: 'parent', changedAt: '2026-10-07' } };
    const response = await (GET as any)({}, context());
    expect(response.body.source.schoolAssignment).toMatchObject({ concernedMemberIds: ['amari'], attendeePersonId: 'parent', attendeeStatus: 'confirmed', basis: 'manual' });
    expect(event.metadata.assignmentOverride.personId).toBe('parent');
  });
  it('rejects anonymous and foreign-family reads before fetching source records', async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = 'false';
    (getNeonSessionIdentity as jest.Mock).mockResolvedValue(null);
    expect((await (GET as any)({}, context())).status).toBe(401);
    process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    expect((await (GET as any)({}, context('foreign'))).status).toBe(404);
    expect(prisma.calendarEvent.findFirst).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.findFirst).not.toHaveBeenCalled();
  });
  it('returns no linked source when the family-scoped intake cannot be found', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    expect((await (GET as any)({}, context())).body.source).toBeNull();
    expect(prisma.familyMember.findMany).not.toHaveBeenCalled();
  });
});
