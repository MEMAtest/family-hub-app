import type { CalendarImportDraft } from '@/utils/calendarImport';

export const UNCONFIRMED_SCHOOL_OFFER_WARNING = 'Confirm your booking/invitation before adding this event.';

export const schoolDraftHasUnconfirmedOffer = (draft: CalendarImportDraft) => {
  const content = `${draft.title}\n${draft.source}`;
  const offerCue = /\b(?:limited (?:places?|spaces?)|(?:places?|spaces?) (?:are|is) limited|first[- ]come,? first[- ]served|book now|register now|how to book|booking required|places? available|invite[- ]only|invitation[- ]only)\b/i.test(content);
  const bookingConfirmed = /\b(?:your booking is confirmed|booking confirmed|your place is confirmed|place confirmed|registration confirmed|you are booked|your place is reserved)\b/i.test(content);
  return offerCue && !bookingConfirmed;
};

export const schoolDraftNonEventReason = (draft: CalendarImportDraft) =>
  /^(?:imported event|weekly update(?: email)?|(?:school |weekly )?newsletter|school update(?: email)?|attachment|attached document|(?:please )?(?:see|find) (?:the )?attached(?: (?:file|document|newsletter|letter))?)$/i.test(draft.title.trim())
    ? 'generic_non_event' as const : null;

export const schoolDraftTimeNeedsReview = (draft: CalendarImportDraft) => {
  const sourceWithoutDates = draft.source.replace(/\b(?:20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]20\d{2})\b/g, ' ');
  const clockInSource = /\b(?:[01]?\d|2[0-3])(?::|\.)(?:[0-5]\d)\s*(?:am|pm)?\b|\b(?:1[0-2]|[1-9])\s*(?:am|pm)\b/i.test(sourceWithoutDates);
  const dateAsClock = Array.from(draft.source.matchAll(/\b(\d{1,2})[-/.](\d{1,2})[-/.]20\d{2}\b/g))
    .some((match) => `${match[1].padStart(2, '0')}:${match[2].padStart(2, '0')}` === draft.time);
  // Old parsers could turn a numeric attachment/publication date into a clock time.
  return !clockInSource && (dateAsClock || draft.timeSpecified === true ||
    (draft.timeSpecified !== false && !['00:00', '09:00'].includes(draft.time)));
};
