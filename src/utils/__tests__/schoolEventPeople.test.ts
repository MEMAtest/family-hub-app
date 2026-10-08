import { eventPeopleLabel } from '../schoolEventPeople';
const members = [{ id: 'amari', name: 'Amari', role: 'child' }, { id: 'askia', name: 'Askia', role: 'child' }, { id: 'ade', name: 'Ade', role: 'parent' }];
test('council collections belong to the household rather than their storage owner', () => {
  expect(eventPeopleLabel({ title: 'Bins: Food waste', person: 'ade', sourceId: 'council-bin-calendar', metadata: { binCollection: { verified: true } } }, members)).toBe('Household');
});
test('legacy child ownership is not PTA attendance or evidence of the concerned child', () => {
  expect(eventPeopleLabel({ title: 'PTA AGM', person: 'askia', sourceId: 'school-mail', metadata: {} }, members)).toBe('Attendee to confirm');
  expect(eventPeopleLabel({ title: 'PTA AGM', person: 'askia', sourceId: 'school-mail', metadata: { schoolAssignment: { concernedMemberIds: ['amari'], attendeeStatus: 'needs_confirmation' } } }, members)).toBe('Concerns Amari; Attendee to confirm');
});
test('explicit adult override and ordinary child events keep their selected person', () => {
  expect(eventPeopleLabel({ title: 'PTA AGM', person: 'ade', sourceId: 'school-mail', metadata: { assignmentOverride: { personId: 'ade' } } }, members)).toBe('Ade');
  expect(eventPeopleLabel({ title: 'Photo day', person: 'amari', sourceId: 'school-mail', metadata: {} }, members)).toBe('Amari');
});
