jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  family: { findUnique: jest.fn() }, familyMember: { findMany: jest.fn() }, gmailConnection: { findUnique: jest.fn() },
  familyDocument: { findUnique: jest.fn() },
  calendarEmailIntake: { findFirst: jest.fn(), findMany: jest.fn(), aggregate: jest.fn(), updateMany: jest.fn() },
  calendarEvent: { findMany: jest.fn() },
} }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/gmailCalendarServer', () => ({ gmailForwardingAddress: jest.fn() }));
jest.mock('@/lib/whatsappCalendarReminders', () => ({ getWhatsAppConsentState: jest.fn(), getWhatsAppConfig: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { GET, PATCH, POST } from './route';
import * as ingestion from '@/lib/calendarEmailIngestion';
const context = { params: Promise.resolve({ familyId: 'family-id' }) };
const auth = { familyMemberId: 'parent-id' };
const request = (body: unknown) => ({ json: async () => body });
const draft = { importId: 'photo', sourceEventKey: 'photo-key', title: 'Photographs', person: 'askia', date: '2026-10-07', source: 'School photographs' };
const intake = { id: 'intake-id', familyId: 'family-id', status: 'review_required', needsReview: 2, createdEventIds: ['already-imported'],
  parsedDrafts: [draft], metadata: {}, updatedAt: new Date('2026-10-06') };

describe('calendar intake decisions', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockImplementation(async () => ({ ...intake, parsedDrafts: [{ ...draft }] }));
    (prisma.calendarEmailIntake.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'created-now', personId: 'askia', title: 'Photographs', eventDate: new Date('2026-10-07') }]);
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', role: 'Child', name: 'Amari' }, { id: 'askia', role: 'Child', name: 'Askia' }]);
  });
  it('accepts only the explicit single-intake processing request and uses the authorized family', async () => {
    const process = jest.spyOn(ingestion, 'autoProcessSavedCalendarIntake').mockResolvedValue({ intakeId: 'intake-id', newlyCreatedCount: 1 } as any);
    try {
      const response = await (POST as any)(request({ action: 'auto-process', intakeId: 'intake-id' }), context, auth);
      expect(response.body).toMatchObject({ newlyCreatedCount: 1 });
      expect(process).toHaveBeenCalledWith('family-id', 'intake-id');
      for (const body of [{ intakeId: 'intake-id' }, { action: 'auto-process', intakeId: 'intake-id', drafts: [] },
        { action: 'auto-process', intakeId: 'intake-id', authenticatedSchoolSender: true }]) {
        expect((await (POST as any)(request(body), context, auth)).status).toBe(400);
      }
      expect(process).toHaveBeenCalledTimes(1);
      process.mockRejectedValue({ code: 'P2034' });
      expect((await (POST as any)(request({ action: 'auto-process', intakeId: 'intake-id' }), context, auth)).status).toBe(409);
    } finally { process.mockRestore(); }
  });
  it('counts all pending messages, including gated content and OCR', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValueOnce([]).mockResolvedValueOnce([
      { ...intake, parsedDrafts: [], status: 'content_required' },
      { ...intake, id: 'ocr', parsedDrafts: [], status: 'needs_ocr' },
      { ...intake, id: 'empty', parsedDrafts: [], status: 'no_events', needsReview: 99 },
    ]);
    const response = await (GET as any)({}, context);
    expect(response.body.pendingReviewCount).toBe(2);
    expect(response.body.pendingReviewEmailCount).toBe(2);
    expect(prisma.calendarEmailIntake.findMany).toHaveBeenLastCalledWith(expect.objectContaining({
      where: { familyId: 'family-id', status: { in: ['processing', 'review_required', 'partial_review', 'needs_ocr', 'content_required', 'auto_created', 'no_events'] } },
    }));
  });
  it('reconciles stale ready labels and stored totals without writing on GET', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    const ready = { ...draft, type: 'education', importStatus: 'ready', warnings: [], confidence: 0.95 };
    const row = { ...intake, parsedDrafts: [ready], attachments: [] };
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([row]);
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'already-imported', familyId: 'family-id',
      sourceId: 'intake-id', title: 'Photographs', personId: 'askia', eventType: 'education',
      eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07') }]);
    const response = await (GET as any)({}, context);
    expect(response.body).toMatchObject({ pendingReviewCount: 0, pendingReviewEmailCount: 0,
      intakes: [expect.objectContaining({ status: 'auto_created', storedStatus: 'review_required',
        importedDraftCount: 1, outstandingDraftCount: 0, actionRequired: false,
        parsedDrafts: [], allParsedDrafts: [expect.objectContaining({ importStatus: 'ready', disposition: 'imported', importedEventId: 'already-imported' })] })] });
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
  });
  it('includes older outstanding decisions beyond the recent reference window without duplicate rows', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    const recent = { ...intake, id: 'recent-reference', parsedDrafts: [], status: 'no_events',
      receivedAt: new Date('2026-10-07'), attachments: [] };
    const older = { ...intake, receivedAt: new Date('2026-09-20'), attachments: [{ id: 'original',
      fileName: 'original.pdf', mimeType: 'application/pdf', sizeBytes: 100 }] };
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValueOnce([recent])
      .mockResolvedValueOnce([recent, older]);
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
    const response = await (GET as any)({}, context);
    expect(response.status).toBe(200);
    expect(response.body.pendingReviewCount).toBe(1);
    expect(response.body.pendingReviewEmailCount).toBe(1);
    expect(response.body.intakes.map((row: any) => row.id)).toEqual(['recent-reference', 'intake-id']);
    expect(response.body.intakes.filter((row: any) => row.actionRequired)).toHaveLength(1);
    expect(response.body.intakes[1].attachments[0].downloadUrl).toContain('/attachments/original');
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
  });
  it('normalizes a legacy Askia photo draft to Amari and excludes generic old date rows from decisions', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    const ready = { ...draft, type: 'education', time: '09:00', timeSpecified: false, importStatus: 'ready', warnings: [], confidence: 0.95 };
    const row = { ...intake, text: 'Stewart Fleming Primary School', attachments: [],
      parsedDrafts: [ready, { ...ready, importId: 'newsletter', title: 'Weekly Update Email' },
        { ...ready, importId: 'junk', title: 'Imported event', date: '2026-04-02', time: '02:10' }] };
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([row]);
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'live-amari-photo', familyId: 'family-id',
      sourceId: 'intake-id', title: 'Photographs', personId: 'amari', eventType: 'education',
      eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07') }]);
    const response = await (GET as any)({}, context);
    expect(response.body).toMatchObject({ pendingReviewCount: 0, pendingReviewEmailCount: 0 });
    expect(response.body.intakes[0]).toMatchObject({ importedDraftCount: 1, outstandingDraftCount: 0, outstandingDrafts: [] });
    expect(response.body.intakes[0].parsedDrafts).toEqual([]);
    expect(response.body.intakes[0].allParsedDrafts[0]).toMatchObject({ person: 'amari', disposition: 'imported', importedEventId: 'live-amari-photo' });
    expect(response.body.intakes[0].allParsedDrafts[1].disposition).toBe('non_event');
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
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
  it('read-only resolves a legacy PTA preview into separate concern and attendee fields', async () => {
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-id' });
    (prisma.calendarEmailIntake.aggregate as jest.Mock).mockResolvedValue({ _sum: { needsReview: 1 }, _count: { id: 1 } });
    (prisma.calendarEmailIntake.findMany as jest.Mock).mockResolvedValue([{ ...intake, text: 'Stewart Fleming Primary School',
      receivedAt: new Date('2026-10-06'), attachments: [], parsedDrafts: [{ ...draft, title: 'PTA AGM', source: 'PTA AGM 7 October 2026', warnings: [] }] }]);
    const response = await (GET as any)({}, context);
    expect(response.status).toBe(200);
    expect(response.body.intakes[0].parsedDrafts[0]).toMatchObject({ person: '', schoolAssignment: {
      concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation',
    } });
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
  });
  it('persists a chosen adult independently of the source child concern', async () => {
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', name: 'Amari', role: 'Child' },
      { id: 'askia', name: 'Askia', role: 'Child' }, { id: 'parent-id', name: 'Ademola', role: 'Parent' }]);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ ...intake, text: 'Stewart Fleming Primary School',
      parsedDrafts: [{ ...draft, title: 'PTA AGM', source: 'PTA AGM 7 October 2026', warnings: [] }] });
    const response = await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'photo', personId: 'parent-id' }] }), context, auth);
    expect(response.status).toBe(200);
    const data = (prisma.calendarEmailIntake.updateMany as jest.Mock).mock.calls[0][0].data;
    expect(data.parsedDrafts[0]).toMatchObject({ person: 'parent-id', schoolAssignment: {
      concernedMemberIds: ['amari'], attendeePersonId: 'parent-id', attendeeStatus: 'confirmed', originalPersonId: 'askia',
    } });
    expect(data.metadata.schoolOriginalParsedDrafts[0].person).toBe('askia');
  });
  it('returns only the pending adult after assignment without bringing imported or non-event rows back', async () => {
    (prisma.familyMember.findMany as jest.Mock).mockResolvedValue([{ id: 'amari', name: 'Amari', role: 'Child' },
      { id: 'askia', name: 'Askia', role: 'Child' }, { id: 'parent-id', name: 'Ademola', role: 'Parent' }]);
    const photo = { ...draft, type: 'education', time: '09:00', timeSpecified: false,
      importStatus: 'ready', warnings: [], confidence: 0.95 };
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ ...intake, text: 'Stewart Fleming Primary School',
      parsedDrafts: [photo, { ...photo, importId: 'pta', sourceEventKey: 'pta-key', title: 'PTA AGM',
        source: 'PTA AGM 7 October 2026' }, { ...photo, importId: 'generic', title: 'Imported event' }] });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{ id: 'already-imported', familyId: 'family-id',
      sourceId: 'intake-id', title: 'Photographs', personId: 'amari', eventType: 'education',
      eventDate: new Date('2026-10-07'), eventTime: new Date('2026-10-07') }]);
    const response = await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'pta', personId: 'parent-id' }] }), context, auth);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'partial_review', importedDraftCount: 1, outstandingDraftCount: 1,
      needsReview: 1, parsedDrafts: [expect.objectContaining({ importId: 'pta', person: 'parent-id', disposition: 'outstanding',
        schoolAssignment: expect.objectContaining({ attendeePersonId: 'parent-id', attendeeStatus: 'confirmed' }) })] });
    expect(response.body.parsedDrafts).toEqual(response.body.outstandingDrafts);
    expect(response.body.allParsedDrafts.map((value: any) => value.disposition)).toEqual(['imported', 'outstanding', 'non_event']);
    expect(prisma.calendarEvent.findMany).toHaveBeenLastCalledWith({ where: { familyId: 'family-id', sourceId: 'intake-id' } });
  });
  it('rejects choosing a child as the adult PTA attendee', async () => {
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ ...intake, text: 'Stewart Fleming Primary School',
      parsedDrafts: [{ ...draft, title: 'PTA AGM', source: 'PTA AGM 7 October 2026', warnings: [] }] });
    expect((await (PATCH as any)(request({ intakeId: 'intake-id', assignments: [{ draftId: 'photo', personId: 'amari' }] }), context, auth)).status).toBe(400);
    expect(prisma.calendarEmailIntake.updateMany).not.toHaveBeenCalled();
  });
});
