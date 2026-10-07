import { createHash } from 'crypto';
import type { CalendarImportDraft } from '@/utils/calendarImport';
import { importDraftToCalendarEventDraft } from '@/utils/calendarImport';
import { calendarEventDraftToDbData } from '@/lib/calendarEventMapping';
import { schoolDraftKey, schoolImportedEventId } from '@/lib/schoolIntakeServer';
import { schoolMetadata, type SchoolDraft } from '@/utils/schoolSources';
import { schoolDraftHasUnconfirmedOffer, schoolDraftNonEventReason, schoolDraftTimeNeedsReview,
  UNCONFIRMED_SCHOOL_OFFER_WARNING } from '@/lib/schoolIntakeDraftSafety';

export const findImportedDraftEvent = (familyId: string, intakeId: string, draft: CalendarImportDraft,
  draftIndex: number, events: any[]) => {
  const sourceEventKey = (draft as SchoolDraft).sourceEventKey || schoolDraftKey(draft);
  const eventId = schoolImportedEventId(familyId, intakeId, sourceEventKey, draft.person);
  const originalPersonId = (draft as SchoolDraft).schoolAssignment?.originalPersonId;
  const originalEventId = originalPersonId ? schoolImportedEventId(familyId, intakeId,
    (draft as SchoolDraft).sourceEventKey || schoolDraftKey(draft), originalPersonId) : null;
  const legacyId = `mail_event_${createHash('sha256').update(`${intakeId}\0${draftIndex}`).digest('hex')}`;
  const data = calendarEventDraftToDbData(familyId, importDraftToCalendarEventDraft(draft));
  const allDay = /time not provided by source|school email did not specify a time/i.test(data.notes || '');
  return events.find((event) => event.sourceId === intakeId && event.familyId === familyId && (
    event.id === eventId || event.id === originalEventId || event.id === legacyId || (
      schoolMetadata(schoolMetadata(event.metadata).schoolAssignment).sourceEventKey === sourceEventKey &&
      (event.personId === draft.person || event.personId === originalPersonId)
    ) || (
      event.title === data.title && event.personId === data.personId && event.eventType === data.eventType &&
      (allDay ? new Date(event.eventDate).toISOString().slice(0, 10) === data.eventDate.toISOString().slice(0, 10)
        : new Date(event.eventDate).getTime() === data.eventDate.getTime()) &&
      (allDay || new Date(event.eventTime).getTime() === data.eventTime.getTime())
    )
  ));
};

export const calendarIntakeState = (intake: { id: string; familyId: string; status: string; metadata?: unknown },
  drafts: CalendarImportDraft[], events: any[], eligible: (draft: CalendarImportDraft) => boolean = () => false) => {
  const dismissed = Boolean(schoolMetadata(intake.metadata).schoolDismissed) || ['reviewed', 'reviewed_imported'].includes(intake.status);
  const parsedDrafts = drafts.map((draft, index) => {
    const event = findImportedDraftEvent(intake.familyId, intake.id, draft, index, events);
    const nonEventReason = schoolDraftNonEventReason(draft);
    const heldTime = schoolDraftTimeNeedsReview(draft);
    const unconfirmedOffer = schoolDraftHasUnconfirmedOffer(draft);
    const disposition = event ? 'imported' as const : dismissed ? 'dismissed' as const :
      nonEventReason ? 'non_event' as const : draft.importStatus === 'duplicate' ? 'duplicate' as const : 'outstanding' as const;
    const offerNeedsReview = unconfirmedOffer && disposition === 'outstanding';
    const warnings = (draft.warnings || []).filter((warning) => warning !== UNCONFIRMED_SCHOOL_OFFER_WARNING);
    if (offerNeedsReview) warnings.push(UNCONFIRMED_SCHOOL_OFFER_WARNING);
    return { ...draft, warnings, ...((heldTime && !event) || (offerNeedsReview && draft.importStatus === 'ready')
      ? { importStatus: 'needs_review' as const } : {}),
      disposition, importedEventId: event?.id || null,
      importable: disposition === 'outstanding' && !heldTime,
      blockedReason: nonEventReason || (heldTime ? 'time_requires_review' : null),
      autoProcessEligible: disposition === 'outstanding' && !heldTime && !unconfirmedOffer && eligible(draft) };
  });
  const outstandingDrafts = parsedDrafts.filter((draft) => draft.disposition === 'outstanding');
  const importedDrafts = parsedDrafts.filter((draft) => draft.disposition === 'imported');
  const createdEventIds = Array.from(new Set(events.filter((event) =>
    event.familyId === intake.familyId && event.sourceId === intake.id).map((event) => event.id as string)));
  const contentAction = !dismissed && ['content_required', 'needs_ocr'].includes(intake.status);
  const outstandingDraftCount = outstandingDrafts.length;
  const pendingAutoCreate = outstandingDrafts.filter((draft) => draft.autoProcessEligible).length;
  const nurseryKind = schoolMetadata(schoolMetadata(intake.metadata).nurserySummary).kind;
  const unresolvedNurseryDate = nurseryKind === 'event' && !drafts.length && !createdEventIds.length;
  const nurseryAction = !dismissed && (['preparation', 'routine'].includes(String(nurseryKind)) || unresolvedNurseryDate) &&
    !schoolMetadata(intake.metadata).nurseryPreparationSaved;
  const actionRequired = contentAction || nurseryAction || outstandingDraftCount > 0;
  const conflictCount = outstandingDrafts.filter((draft) => draft.importStatus === 'conflict').length;
  const needsReview = contentAction || nurseryAction ? Math.max(1, outstandingDraftCount) : outstandingDraftCount;
  const status = dismissed ? intake.status : contentAction ? intake.status :
    outstandingDraftCount || nurseryAction ? createdEventIds.length ? 'partial_review' : 'review_required' :
      createdEventIds.length ? 'auto_created' : drafts.length ? 'reviewed' : 'no_events';
  return { status, parsedDrafts, allParsedDrafts: parsedDrafts, importedDrafts, outstandingDrafts,
    referenceDrafts: parsedDrafts.filter((draft) => draft.disposition !== 'outstanding'),
    importedDraftCount: importedDrafts.length, outstandingDraftCount, actionRequired,
    autoProcessEligibleCount: pendingAutoCreate, pendingAutoCreate,
    createdEventIds, importedEventCount: createdEventIds.length,
    needsReview, conflictCount, duplicateCount: parsedDrafts.filter((draft) => draft.disposition === 'duplicate').length };
};
