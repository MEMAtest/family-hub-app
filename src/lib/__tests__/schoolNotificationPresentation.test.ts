import { presentSchoolNotification } from '../schoolNotificationPresentation';

const members = [
  { id: 'amari', name: 'Amari', role: 'Child', ageGroup: 'Child' },
  { id: 'askia', name: 'Askia', role: 'Child', ageGroup: 'Child' },
  { id: 'ade', name: 'Ade', role: 'Parent', ageGroup: 'Adult' },
];
const notification = { id: 'old-reminder', title: 'Upcoming: old title', message: 'Photo day for Askia',
  relatedEventId: 'photo', relatedPersonId: 'askia', recipientPersonId: 'ade', read: false,
  metadata: { source: 'notification-sweep' } };
const event = { id: 'photo', title: 'Individual And Sibling Photographs. All Children Should Wear Their Full School Uniform Tod',
  source: 'gmail-school-email', sourceId: 'school-email', personId: 'amari', eventDate: new Date('2026-10-07T00:00:00Z'),
  metadata: { schoolAssignment: { attendeePersonId: 'amari', attendeeStatus: 'confirmed',
    concernedMemberIds: ['amari'], basis: 'institution' } } };

it('uses the corrected source child and short title without mutating old records', () => {
  const result = presentSchoolNotification(notification, event, members);
  expect(result.title).toBe('Upcoming: Individual and sibling photographs');
  expect(result.message).toBe('Individual and sibling photographs · 7 Oct 2026 · Amari');
  expect(result.relatedPersonId).toBe('amari');
  expect(result.recipientPersonId).toBe('ade');
  expect(result.read).toBe(false);
  expect(notification.relatedPersonId).toBe('askia');
});

it('keeps adult attendance unconfirmed instead of using the legacy child', () => {
  const result = presentSchoolNotification(notification, { ...event, title: 'PTA AGM',
    metadata: { schoolAssignment: { attendeePersonId: null, attendeeStatus: 'needs_confirmation',
      concernedMemberIds: ['amari'], basis: 'institution' } } }, members);
  expect(result.message).toContain('Concerns Amari; Attendee to confirm');
  expect(result.relatedPersonId).toBeNull();
});

it('preserves explicit manual assignment supplied by the shared event resolver', () => {
  const result = presentSchoolNotification(notification, { ...event, personId: 'askia', metadata: {
    schoolAssignment: { attendeePersonId: 'askia', attendeeStatus: 'confirmed', basis: 'manual',
      concernedMemberIds: ['askia'], manualOverride: { personId: 'askia' } },
    manualAssignmentOverride: { personId: 'askia' },
  } }, members);
  expect(result.relatedPersonId).toBe('askia');
});

it('does not reinterpret parent travel reminders or unrelated events', () => {
  expect(presentSchoolNotification({ ...notification, metadata: { source: 'family-reminder-planner' } }, event, members).message)
    .toBe(notification.message);
  expect(presentSchoolNotification(notification, { ...event, source: 'manual', sourceId: null, metadata: {} }, members))
    .toBe(notification);
});

it('keeps a reminder unchanged when its event has been removed', () => {
  expect(presentSchoolNotification(notification, undefined, members)).toBe(notification);
});
