import { hasUnspecifiedEventTime } from '../eventSemantics';

const notes = 'School email did not specify a time. Wear full uniform.';
it('keeps imported missing-time semantics without inventing a midnight start', () => {
  expect(hasUnspecifiedEventTime({ notes })).toBe(true);
  expect(hasUnspecifiedEventTime({ metadata: { calendarTiming: { status: 'unknown' } } })).toBe(true);
});
it('honours a confirmed editor time while retaining the original source notes', () => {
  const event = { notes, metadata: { calendarTiming: { status: 'known' } } };
  expect(hasUnspecifiedEventTime(event)).toBe(false);
  expect(event.notes).toBe(notes);
});
it('does not reclassify ordinary timed events with unrelated metadata', () => {
  expect(hasUnspecifiedEventTime({ notes: 'Meet at school', metadata: { assignmentOverride: { personId: 'amari' } } })).toBe(false);
});
