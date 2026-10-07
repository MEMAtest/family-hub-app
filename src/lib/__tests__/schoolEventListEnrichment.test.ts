/** @jest-environment node */
jest.mock('@/lib/neonAuth', () => ({ getNeonSessionIdentity: jest.fn() }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  calendarEvent: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  calendarEmailIntake: { findMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
  familyMember: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn(), create: jest.fn(), updateMany: jest.fn() },
} }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { getNeonSessionIdentity } from '@/lib/neonAuth';
import { GET } from '@/app/api/families/[familyId]/events/route';
import { enrichSavedSchoolEventResponses } from '../schoolIntakeServer';
import { initialSchoolRules, schoolSavedEventAttendance } from '@/utils/schoolSources';

const members = [{ id: 'amari', name: 'Amari', role: 'Child' }, { id: 'askia', name: 'Askia', role: 'Child' },
  { id: 'parent', name: 'Ademola', role: 'Parent' }];
const context = (familyId = 'family') => ({ params: Promise.resolve({ familyId }) });
const event = (id: string, overrides = {}) => ({ id, familyId: 'family', sourceId: 'intake', title: 'PTA AGM',
  personId: 'askia', person: members[1], eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07'),
  durationMinutes: 1439, eventType: 'education', metadata: null as unknown, ...overrides });
let intake: any;
describe('family events GET batch school enrichment', () => {
  const env = { ...process.env };
  beforeEach(() => {
    jest.resetAllMocks();
    process.env = { ...env, BYPASS_AUTH_FOR_TESTS: 'true', TEST_AUTH_FAMILY_ID: 'family', TEST_AUTH_FAMILY_MEMBER_ID: 'parent', NEXT_PUBLIC_E2E: 'false' };
    intake = { id: 'intake', familyId: 'family', sender: 'office@stewartfleming.bromley.sch.uk',
      subject: 'Weekly update', text: 'Stewart Fleming Primary School', normalizedText: 'PTA AGM 7 October 2026', html: '',
      receivedAt: new Date('2026-10-06'), metadata: {}, parsedDrafts: [] };
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([event('pta')]);
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([intake]);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ version: 1, data: initialSchoolRules(members) });
  });
  afterAll(() => { process.env = env; });
  const expectNoWrites = () => {
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.updateMany).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.create).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
    expect(prisma.familyDocument.create).not.toHaveBeenCalled();
    expect(prisma.familyDocument.updateMany).not.toHaveBeenCalled();
  };
  it('enriches an unopened legacy PTA in the raw event array, preserving ownership and DB shape', async () => {
    const original = event('pta');
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([original]);
    const response = await (GET as any)({}, context());
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toMatchObject({ id: 'pta', personId: 'askia', person: members[1],
      eventDate: original.eventDate, eventTime: original.eventTime, durationMinutes: 1439, metadata: {
        schoolAssignment: { concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation' },
        schoolProvenance: { institutionKey: 'stewart-fleming', concernedMemberIds: ['amari'] },
      } });
    expect(schoolSavedEventAttendance(response.body[0], members).attendeeStatus).toBe('needs_confirmation');
    expect(original.metadata).toBeNull();
    expect(original.personId).toBe('askia');
    expectNoWrites();
  });
  it('loads members, rules and deduplicated linked intakes once for multiple events', async () => {
    const rows = Array.from({ length: 20 }, (_, index) => event(`pta-${index}`));
    const result = await enrichSavedSchoolEventResponses('family', rows);
    expect(result.every((value) => (value.metadata as any).schoolAssignment.concernedMemberIds[0] === 'amari')).toBe(true);
    expect(prisma.familyMember.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.familyMember.findMany).toHaveBeenCalledWith({ where: { familyId: 'family' } });
    expect(prisma.familyDocument.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.calendarEmailIntake.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.calendarEmailIntake.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'family', id: { in: ['intake'] } } }));
    expectNoWrites();
  });
  it('preserves manual adult ownership, overrides, audit and unrelated metadata', async () => {
    const override = { personId: 'parent', changedAt: '2026-10-07', changedBy: 'parent' };
    const rows = [event('manual', { personId: 'parent', person: members[2], metadata: {
      assignmentOverride: override, unrelated: { retained: true },
      schoolAssignment: { repairedAt: '2026-10-06' },
    } })];
    const result = await enrichSavedSchoolEventResponses('family', rows);
    expect(result[0]).toMatchObject({ personId: 'parent', metadata: { assignmentOverride: override, unrelated: { retained: true },
      schoolAssignment: { repairedAt: '2026-10-06', concernedMemberIds: ['amari'], attendeePersonId: 'parent', attendeeStatus: 'confirmed', basis: 'manual' },
    } });
    expect((rows[0].metadata as any).assignmentOverride).toEqual(override);
    expectNoWrites();
  });
  it('leaves unmatched nonadult events, unlinked events and missing/foreign intake evidence unchanged', async () => {
    const child = event('photo', { title: 'School photographs', metadata: { existing: true } });
    const unlinked = event('unlinked', { sourceId: null });
    const foreignLinked = event('foreign-linked', { sourceId: 'foreign-intake' });
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([{ ...intake, id: 'foreign-intake', familyId: 'foreign' }]);
    const rows = [child, unlinked, foreignLinked];
    expect(await enrichSavedSchoolEventResponses('family', rows)).toEqual(rows);
    expectNoWrites();
  });
  it('does no enrichment reads for a batch without well-formed source-linked events', async () => {
    const rows = [event('photo', { title: 'School photographs', sourceId: null }), event('unlinked', { sourceId: null })];
    expect(await enrichSavedSchoolEventResponses('family', rows)).toBe(rows);
    expect(prisma.familyMember.findMany).not.toHaveBeenCalled();
    expect(prisma.familyDocument.findUnique).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.findMany).not.toHaveBeenCalled();
  });
  it('enriches a matched nonadult wrong-child import without changing saved ownership', async () => {
    intake.parsedDrafts = [{ importId: 'arbor', sourceEventKey: 'arbor-key', title: 'Arbor booking deadline',
      person: 'askia', date: '2026-10-09', source: 'Arbor booking deadline 9 October 2026', sourceLine: 1, warnings: [], importStatus: 'ready' }];
    const original = event('arbor', { title: 'Arbor booking deadline', eventDate: new Date('2026-10-09') });
    const [result] = await enrichSavedSchoolEventResponses('family', [original]);
    expect(result).toMatchObject({ personId: 'askia', metadata: { schoolAssignment: {
      concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation', originalPersonId: 'askia',
    } } });
    expect(schoolSavedEventAttendance(result, members).attendeeStatus).toBe('needs_confirmation');
    expect(original.metadata).toBeNull();
    expectNoWrites();
  });
  it('preserves an explicit nonadult attendee override while deriving source concern independently', async () => {
    intake.parsedDrafts = [{ importId: 'arbor', title: 'Arbor booking deadline', person: 'amari', date: '2026-10-09',
      source: 'Arbor booking deadline 9 October 2026', sourceLine: 1, warnings: [], importStatus: 'ready' }];
    const override = { personId: 'askia', changedAt: '2026-10-07', changedBy: 'parent' };
    const original = event('arbor', { title: 'Arbor booking deadline', eventDate: new Date('2026-10-09'), metadata: { assignmentOverride: override } });
    const [result] = await enrichSavedSchoolEventResponses('family', [original]);
    expect(result).toMatchObject({ personId: 'askia', metadata: { assignmentOverride: override, schoolAssignment: {
      concernedMemberIds: ['amari'], attendeePersonId: 'askia', attendeeStatus: 'confirmed', basis: 'manual',
    } } });
    expectNoWrites();
  });
  it('leaves malformed dates and unmatched nonadult records unchanged', async () => {
    const malformed = event('malformed', { eventDate: new Date('invalid') });
    const unmatched = event('unmatched', { title: 'Arbor booking deadline', eventDate: new Date('2026-10-09') });
    expect(await enrichSavedSchoolEventResponses('family', [malformed, unmatched])).toEqual([malformed, unmatched]);
    expectNoWrites();
  });
  it('leaves malformed stored draft evidence unchanged instead of failing the whole event list', async () => {
    intake.parsedDrafts = [null, { title: 'Arbor booking deadline' }];
    const rows = [event('pta')];
    expect(await enrichSavedSchoolEventResponses('family', rows)).toEqual(rows);
    expectNoWrites();
  });
  it('is idempotent without mutating records or creating source documents', async () => {
    const first = await enrichSavedSchoolEventResponses('family', [event('pta')]);
    expect(await enrichSavedSchoolEventResponses('family', first)).toEqual(first);
    expectNoWrites();
  });
  it('rejects anonymous and foreign-family GET before reading events', async () => {
    process.env.BYPASS_AUTH_FOR_TESTS = 'false';
    (getNeonSessionIdentity as jest.Mock).mockResolvedValue(null);
    expect((await (GET as any)({}, context())).status).toBe(401);
    process.env.BYPASS_AUTH_FOR_TESTS = 'true';
    expect((await (GET as any)({}, context('foreign'))).status).toBe(404);
    expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.findMany).not.toHaveBeenCalled();
    expectNoWrites();
  });
});
