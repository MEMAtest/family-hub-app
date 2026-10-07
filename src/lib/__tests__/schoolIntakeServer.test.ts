/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyMember: { findMany: jest.fn() }, familyDocument: { findUnique: jest.fn(), create: jest.fn() },
  calendarEmailIntake: { findFirst: jest.fn() },
} }));
import prisma from '@/lib/prisma';
import { getSchoolEventImportMetadata, loadSchoolRules, prepareSchoolIntake } from '../schoolIntakeServer';
import { initialSchoolRules } from '@/utils/schoolSources';
import { importDraftToCalendarEventDraft } from '@/utils/calendarImport';

const members = [{ id: 'askia-id', name: 'Askia', role: 'Child' }, { id: 'amari-id', name: 'Amari', role: 'Child' }];
let intake: any;
const event = (overrides = {}) => ({ source: 'gmail-school-email', personId: 'amari-id', title: 'Individual and sibling photographs',
  date: '2026-10-07', time: '00:00', durationMinutes: 1439, eventType: 'education', location: '', ...overrides });
describe('school intake server trust and source persistence', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    intake = { id: 'intake', familyId: 'family', sender: 'office@stewartfleming.bromley.sch.uk', subject: 'Weekly update',
      text: 'Stewart Fleming Primary School', receivedAt: new Date('2026-10-06'), status: 'review_required',
      metadata: { schoolSenderVerified: true, sourceDate: 'Tue, 6 Oct 2026 20:00:00 +0100' }, parsedDrafts: [{
        importId: 'photo', sourceEventKey: 'photo-key', person: 'askia-id', title: 'Individual and sibling photographs',
        date: '2026-10-07', time: '09:00', timeSpecified: false, duration: 60, type: 'education', recurring: 'none',
        cost: 0, isRecurring: false, priority: 'high', status: 'confirmed', confidence: 0.9,
        source: 'All children Individual and sibling photographs 7 October 2026', sourceLine: 1, warnings: [], importStatus: 'ready',
      }] };
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockImplementation(async ({ where }) => where.familyId === intake.familyId ? intake : null);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue(members);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: initialSchoolRules(members), version: 1 });
    (prisma.familyDocument.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, version: 1 }));
  });
  it('accepts the corrected source enrollment and derives the original import snapshot on the server', async () => {
    const metadata: any = await getSchoolEventImportMetadata('family', 'intake', event());
    expect(metadata).toMatchObject({ schoolProvenance: { intakeId: 'intake', institutionKey: 'stewart-fleming',
      sender: 'office@stewartfleming.bromley.sch.uk', senderVerified: true, sourceDate: 'Tue, 6 Oct 2026 20:00:00 +0100' },
      schoolAssignment: { basis: 'institution', originalPersonId: 'askia-id', sourceEventKey: 'photo-key' } });
    expect(await getSchoolEventImportMetadata('family', 'intake', event({ personId: 'askia-id' }))).toBeNull();
    expect(intake.parsedDrafts[0].person).toBe('askia-id');
    expect(prisma.familyDocument.create).not.toHaveBeenCalled();
  });
  it('rejects spoofed school authentication, lookalike sender, unrelated draft and foreign family/member', async () => {
    for (const request of [event({ personId: 'foreign' }), event({ title: 'Invented event' }), event({ date: '2026-10-08' }), event({ time: '09:00' })]) {
      expect(await getSchoolEventImportMetadata('family', 'intake', request)).toBeNull();
    }
    expect(await getSchoolEventImportMetadata('other-family', 'intake', event())).toBeNull();
    intake.metadata.schoolSenderVerified = false;
    expect(await getSchoolEventImportMetadata('family', 'intake', event())).toBeNull();
    intake.metadata.schoolSenderVerified = true;
    intake.sender = 'office@stewartfleming.bromley.sch.uk.attacker.example';
    expect(await getSchoolEventImportMetadata('family', 'intake', event())).toBeNull();
  });
  it('validates a generic linked intake without upgrading an unauthenticated forward to trusted mail', async () => {
    intake.metadata.schoolSenderVerified = false;
    intake.sender = 'parent@example.test';
    intake.text = 'From: office@stewartfleming.bromley.sch.uk\nStewart Fleming Primary School';
    expect(await getSchoolEventImportMetadata('family', 'intake', event())).toBeNull();
    expect(await getSchoolEventImportMetadata('family', 'intake', event({ source: 'calendar-intake' }))).toMatchObject({ schoolProvenance: {
      senderVerified: false, sender: 'parent@example.test', originalSenderClaim: 'office@stewartfleming.bromley.sch.uk',
    } });
  });
  it('requires an explicitly persisted assignment for a narrow cohort', async () => {
    intake.parsedDrafts[0].source = 'Key Stage 2 photographs 7 October 2026';
    expect(await getSchoolEventImportMetadata('family', 'intake', event())).toBeNull();
    intake.metadata.schoolOverrides = { 'photo-key': { personId: 'amari-id', actorId: 'parent', at: '2026-10-07' } };
    expect(await getSchoolEventImportMetadata('family', 'intake', event())).toMatchObject({ schoolAssignment: { basis: 'manual', manualOverride: { personId: 'amari-id' } } });
  });
  it.each(['content_required', 'review_required'])('does not turn gated %s Grandir notifications into events', async (status) => {
    intake.status = status;
    intake.sender = 'Famly <notify@famly.example>';
    intake.text = 'Grandir nursery: Sign in to view the post';
    expect(await getSchoolEventImportMetadata('family', 'intake', event({ source: 'calendar-intake' }))).toBeNull();
  });
  it.each([
    { label: 'paste', sender: undefined, rawText: 'Stewart Fleming Primary School\nAll children photographs 7 October 2026' },
    { label: 'forward', sender: 'parent@example.test', rawText: 'From: admin@stewartfleming.bromley.sch.uk\nStewart Fleming Primary School\nAll children photographs 7 October 2026' },
    { label: 'upload', sender: undefined, rawText: 'Stewart Fleming Primary School\nAll children photographs 7 October 2026' },
    { label: 'html Gmail', sender: 'office@stewartfleming.bromley.sch.uk', html: '<h1>Stewart Fleming Primary School</h1>', rawText: '' },
  ])('resolves $label consistently with persisted family enrollments', async ({ sender, rawText, html }) => {
    const prepared = await prepareSchoolIntake({ familyId: 'family', members, text: 'All children photographs 7 October 2026',
      rawText, html, sender, today: new Date('2026-10-06'), defaultPersonId: 'askia-id' });
    expect(prepared.source.institution).toBe('stewart-fleming');
    expect(prepared.drafts.length).toBeGreaterThan(0);
    expect(prepared.drafts.every((draft) => draft.person === 'amari-id')).toBe(true);
    expect(importDraftToCalendarEventDraft(prepared.drafts[0]).person).toBe('amari-id');
  });
  it('stores actual IDs once and re-reads a concurrent bootstrap instead of overwriting rules', async () => {
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValueOnce(null).mockResolvedValue({ data: initialSchoolRules(members), version: 3 });
    (prisma.familyDocument.create as jest.Mock).mockRejectedValue({ code: 'P2002' });
    expect(await loadSchoolRules('family', members, true)).toMatchObject({ version: 3, rules: { sources: [
      expect.objectContaining({ memberIds: ['amari-id'] }), expect.objectContaining({ memberIds: ['askia-id'] }),
    ] } });
  });
  it('checks timed conflicts against the resolved child, not the former first-child default', async () => {
    const prepared = await prepareSchoolIntake({ familyId: 'family', members, text: 'School assembly 7 October 2026 at 10am',
      rawText: 'Stewart Fleming Primary School', today: new Date('2026-10-06'), defaultPersonId: 'askia-id',
      existingEvents: [{ id: 'overlap', title: 'Appointment', person: 'amari-id', date: '2026-10-07', time: '10:00', duration: 60 }] });
    expect(prepared.drafts[0]).toMatchObject({ person: 'amari-id', importStatus: 'conflict', conflictWith: ['overlap'] });
  });
});
