import { calendarIntakeState } from '@/lib/calendarIntakeState';
import { schoolDraftKey, schoolImportedEventId } from '@/lib/schoolIntakeServer';
import type { CalendarImportDraft } from '@/utils/calendarImport';
import type { SchoolDraft } from '@/utils/schoolSources';
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {} }));

const intake = { id: 'mail', familyId: 'family', status: 'partial_review' };
const draft = (importId: string, importStatus: CalendarImportDraft['importStatus'] = 'ready'): CalendarImportDraft => ({
  importId, importStatus, title: importId, person: 'child', date: '2026-11-10', time: '09:00', duration: 60,
  recurring: 'none', cost: 0, type: 'education', isRecurring: false, priority: 'medium', status: 'confirmed',
  confidence: 0.95, source: `${importId} on 10 November`, sourceLine: 1, warnings: [],
});
const event = (value: CalendarImportDraft) => ({ id: schoolImportedEventId('family', 'mail', schoolDraftKey(value), 'child'),
  familyId: 'family', sourceId: 'mail', title: value.title, personId: 'child', eventType: 'education',
  eventDate: new Date('2026-11-10'), eventTime: new Date('2026-11-10') });

describe('calendar intake action contract', () => {
  it('matches each draft, not event totals, including imported needs-review and duplicate labels', () => {
    const drafts = [draft('saved', 'needs_review'), draft('ready'), draft('review', 'needs_review'),
      draft('conflict', 'conflict'), draft('duplicate', 'duplicate')];
    const state = calendarIntakeState(intake, drafts, [event(drafts[0])], (value) => value.importStatus === 'ready');
    expect(state).toMatchObject({ status: 'partial_review', importedDraftCount: 1, outstandingDraftCount: 3,
      needsReview: 3, conflictCount: 1, duplicateCount: 1, autoProcessEligibleCount: 1, actionRequired: true });
    expect(state.importedDrafts[0].disposition).toBe('imported');
    expect(state.outstandingDrafts.map((value) => value.importId)).toEqual(['ready', 'review', 'conflict']);
  });
  it('has no actions for empty or duplicate-only intake, but retains gated-content actions', () => {
    expect(calendarIntakeState({ ...intake, status: 'no_events' }, [], [])).toMatchObject({ status: 'no_events', needsReview: 0, actionRequired: false });
    expect(calendarIntakeState(intake, [draft('duplicate', 'duplicate')], [])).toMatchObject({ needsReview: 0, actionRequired: false });
    expect(calendarIntakeState({ ...intake, status: 'needs_ocr' }, [], [])).toMatchObject({ needsReview: 1, actionRequired: true });
    expect(calendarIntakeState({ ...intake, status: 'content_required' }, [], [])).toMatchObject({ needsReview: 1, actionRequired: true });
  });
  it('never treats a foreign-family or foreign-intake event as imported', () => {
    const value = draft('saved');
    expect(calendarIntakeState(intake, [value], [{ ...event(value), familyId: 'foreign' },
      { ...event(value), sourceId: 'foreign' }])).toMatchObject({ importedDraftCount: 0, outstandingDraftCount: 1 });
  });
  it('keeps source-event identity imported after current rules resolve a different attendee', () => {
    const original = draft('saved');
    const resolved: SchoolDraft = { ...original, person: 'other-child', schoolAssignment: {
      basis: 'institution', originalPersonId: 'child', sourceKey: 'stewart-fleming',
      concernedMemberIds: ['other-child'], attendeePersonId: 'other-child', attendeeStatus: 'confirmed',
    } };
    expect(calendarIntakeState(intake, [resolved], [event(original)], () => true)).toMatchObject({
      importedDraftCount: 1, outstandingDraftCount: 0, autoProcessEligibleCount: 0, actionRequired: false,
    });
  });
  it('uses persisted source-event provenance for manually imported events after title edits', () => {
    const value = draft('saved');
    const saved = { ...event(value), id: 'manual', title: 'Edited title',
      metadata: { schoolAssignment: { sourceEventKey: schoolDraftKey(value) } } };
    expect(calendarIntakeState(intake, [value], [saved])).toMatchObject({ importedDraftCount: 1,
      outstandingDraftCount: 0, createdEventIds: ['manual'] });
  });
  it('retains family-scoped linked event IDs even if legacy drafts are no longer present', () => {
    expect(calendarIntakeState(intake, [], [event(draft('legacy'))])).toMatchObject({ status: 'auto_created',
      importedEventCount: 1, importedDraftCount: 0, outstandingDraftCount: 0, actionRequired: false });
  });
  it('excludes generic legacy date extractions from actions and holds unsupported clock artefacts', () => {
    const state = calendarIntakeState(intake, [draft('Weekly Update Email'), draft('Imported event'),
      { ...draft('School photographs'), time: '02:10', timeSpecified: true, source: 'Photographs 02.10.2026' }], [], () => true);
    expect(state).toMatchObject({ outstandingDraftCount: 1, needsReview: 1, autoProcessEligibleCount: 0 });
    expect(state.parsedDrafts[0]).toMatchObject({ disposition: 'non_event', importable: false, blockedReason: 'generic_non_event' });
    expect(state.outstandingDrafts[0]).toMatchObject({ importStatus: 'needs_review', importable: false, blockedReason: 'time_requires_review' });
    expect(calendarIntakeState(intake, [draft('Weekly Update Email'), draft('Imported event')], [])).toMatchObject({
      outstandingDraftCount: 0, actionRequired: false, needsReview: 0,
    });
    expect(calendarIntakeState(intake, [draft('Please see attached document')], [])).toMatchObject({ needsReview: 0, actionRequired: false });
    expect(calendarIntakeState(intake, [{ ...draft('School photographs'), time: '02:10', timeSpecified: false,
      source: 'Photographs attachment 02/10/2026' }], [], () => true).outstandingDrafts[0]).toMatchObject({
      importable: false, autoProcessEligible: false, blockedReason: 'time_requires_review',
    });
  });
  it('does not reopen an explicitly dismissed or reviewed item', () => {
    expect(calendarIntakeState({ ...intake, metadata: { schoolDismissed: { actorId: 'parent' } } }, [draft('ready')], [], () => true))
      .toMatchObject({ needsReview: 0, actionRequired: false, autoProcessEligibleCount: 0 });
  });
  it.each([
    { title: 'Reading Morning (By Invite Only)', source: 'Reading morning on 10 November at 9am' },
    { title: 'Holiday Camp', source: 'Booking required for 10 November at 9am' },
  ])('marks unconfirmed offers needs-review without preventing manual confirmation: $title', ({ title, source }) => {
    const value = { ...draft(title), source };
    const state = calendarIntakeState(intake, [value], [], () => true);
    expect(state).toMatchObject({ pendingAutoCreate: 0, outstandingDraftCount: 1, needsReview: 1 });
    expect(state.outstandingDrafts[0]).toMatchObject({ importStatus: 'needs_review', importable: true,
      warnings: ['Confirm your booking/invitation before adding this event.'] });
    expect(value.importStatus).toBe('ready');
    expect(value.warnings).toEqual([]);
    expect(calendarIntakeState(intake, state.parsedDrafts, [], () => true).parsedDrafts[0].warnings)
      .toEqual(['Confirm your booking/invitation before adding this event.']);
  });
  it('keeps confirmed bookings ready and preserves conflict/duplicate classifications', () => {
    const confirmed = { ...draft('Holiday Camp (By Invite Only)'),
      source: 'Your booking is confirmed for 10 November at 9am' };
    expect(calendarIntakeState(intake, [confirmed], [], () => true).parsedDrafts[0])
      .toMatchObject({ importStatus: 'ready', importable: true, autoProcessEligible: true, warnings: [] });
    const source = 'Booking required for 10 November at 9am';
    expect(calendarIntakeState(intake, [{ ...draft('Camp', 'conflict'), source }], []).parsedDrafts[0].importStatus).toBe('conflict');
    expect(calendarIntakeState(intake, [{ ...draft('Camp', 'duplicate'), source }], []).parsedDrafts[0].importStatus).toBe('duplicate');
  });
});
