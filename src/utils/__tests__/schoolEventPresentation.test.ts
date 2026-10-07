import { displayEventTitle, hasSchoolSource, isAdultSchoolEvent, recurringSourceDateWarning, schoolEventAction, schoolEventContext, schoolEventLocation, schoolEventTitle } from '../schoolEventPresentation';

test('repaired legacy school events display concise titles and event-specific actions without rewriting evidence', () => {
  const event = { title: 'Individual And Sibling Photographs. All Children Should Wear Their Full School Uniform',
    source: 'calendar-intake', metadata: { schoolProvenance: { institutionKey: 'stewart-fleming' } },
    notes: 'Weekly update. Bring harvest donations. • Individual and sibling photographs. All children should wear their full school uniform today. • Christmas dinner information.' };
  expect(hasSchoolSource(event)).toBe(true);
  expect(displayEventTitle(event)).toBe('Individual and sibling photographs');
  expect(schoolEventContext(event)).not.toContain('harvest');
  expect(schoolEventAction(schoolEventContext(event))).toMatch(/wear their full school uniform/);
  expect(event.title).toContain('All Children');
  expect(displayEventTitle({ ...event, metadata: {} })).toBe(event.title);
});

test('school headings stay short without removing source instructions', () => {
  expect(schoolEventTitle("African Storytelling Assembly The Children Will Enjoy A Special Assembly Titled 'Come An")).toBe('African storytelling assembly');
  expect(schoolEventTitle('Individual And Sibling Photographs. All Children Should Wear Their Full School Uniform')).toBe('Individual and sibling photographs');
  expect(schoolEventTitle('Everyone Is Welcome To Join Our PTA AGM')).toBe('PTA AGM');
  expect(schoolEventTitle('Football club')).toBe('Football club');
  expect(schoolEventLocation('school. Come along to have your say on fundraising')).toBe('School');
  expect(schoolEventLocation("St Michael's Church")).toBe("St Michael's Church");
});

test('adult meetings are distinct from a pupil assembly', () => {
  expect(isAdultSchoolEvent('PTA AGM')).toBe(true);
  expect(isAdultSchoolEvent('Parents Evening')).toBe(true);
  expect(isAdultSchoolEvent('Parent workshop')).toBe(true);
  expect(isAdultSchoolEvent('African storytelling assembly')).toBe(false);
});

test('conflicting Phonics source month is flagged without guessing a year or changing data', () => {
  const event = { title: 'Phonics', date: '2026-09-18', isRecurring: true, notes: 'Screening check June –Friday 18' };
  expect(recurringSourceDateWarning(event)).toContain('Source says June');
  expect(event.date).toBe('2026-09-18');
  expect(recurringSourceDateWarning({ ...event, notes: 'Weekly practice every Friday' })).toBeNull();
  expect(recurringSourceDateWarning({ ...event, date: '2027-06-18' })).toBeNull();
  expect(recurringSourceDateWarning({ ...event, isRecurring: false })).toBeNull();
});
