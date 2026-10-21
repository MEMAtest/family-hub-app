import type { CalendarEvent, Person } from '@/types/calendar.types';
import type { InAppNotification } from '@/types/notification.types';
import { explicitCoverReminder, homePickupWarnings } from '../homePickupWarnings';

const now = new Date('2026-10-09T07:00:00Z');
const people: Person[] = [{ id: 'ade', name: 'Ade', role: 'Parent', color: 'green', icon: '' }];
const event = (patch: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'office', title: 'Office', person: 'ade', date: '2026-10-09', time: '09:00', duration: 540,
  type: 'work', recurring: 'none', isRecurring: false, cost: 0, priority: 'medium', status: 'confirmed', createdAt: now, updatedAt: now, ...patch,
});
const trip = event({ id: 'trip', person: 'angela', title: 'Work travel', travel: { coordinatorPersonIds: ['ade'],
  coverage: [{ id: 'pickup', title: 'School pickup', status: 'outstanding' }] } });
const notification = { id: 'cover', relatedEventId: 'trip', recipientPersonId: 'ade', actionRequired: true,
  expiresAt: new Date('2026-10-09T15:00:00Z'), metadata: { source: 'family-reminder-planner', purpose: 'coverage', canAct: true, occurrence: '2026-10-09' } } as InAppNotification;

it('links the real office and pickup events without treating office presence as attendance or assigning cover', () => {
  const events = [event({ workStatus: { type: 'office', affectsPickup: false } }),
    event({ id: 'pickup', title: 'School pickup', time: '15:00', duration: 15, type: 'education' })];
  const warnings = homePickupWarnings(events, people);
  expect(warnings).toHaveLength(1);
  expect(warnings[0]).toMatchObject({ kind: 'availability', relatedEventIds: ['office', 'pickup'] });
  expect(explicitCoverReminder(events[0], [notification], now)).toBeUndefined();
  expect(explicitCoverReminder(events[1], [notification], now)).toBeUndefined();
});

it('allows confirmation only for an explicit, active coordinator coverage reminder', () => {
  expect(homePickupWarnings([trip], [...people, { ...people[0], id: 'angela', name: 'Angela' }]).some(warning => warning.kind === 'coverage')).toBe(true);
  expect(explicitCoverReminder(trip, [notification], now)?.id).toBe('cover');
  expect(explicitCoverReminder(event({ ...trip, travel: { coverage: trip.travel!.coverage } }), [notification], now)).toBeUndefined();
  expect(explicitCoverReminder(trip, [{ ...notification, metadata: { ...notification.metadata, canAct: false } }], now)).toBeUndefined();
  expect(explicitCoverReminder(trip, [{ ...notification, recipientPersonId: 'angela' }], now)).toBeUndefined();
  expect(explicitCoverReminder(trip, [{ ...notification, expiresAt: now }], now)).toBeUndefined();
  expect(explicitCoverReminder(trip, [{ ...notification, metadata: { ...notification.metadata, occurrence: '2026-10-16' } }], now)).toBeUndefined();
});

it('excludes held school import plans from pickup conflicts and cover actions', () => {
  const heldPickup = event({ id: 'pickup', title: 'School pickup', time: '15:00', duration: 15,
    type: 'education', metadata: { schoolImportReview: { reason: 'Attendance not confirmed.' } } });
  expect(homePickupWarnings([event({ workStatus: { type: 'office', affectsPickup: false } }), heldPickup], people)).toEqual([]);
  expect(homePickupWarnings([{ ...trip, metadata: { schoolImportReview: { reason: 'Unconfirmed offer.' } } }], people)).toEqual([]);
  expect(explicitCoverReminder({ ...trip, metadata: { schoolImportReview: { reason: 'Unconfirmed offer.' } } }, [notification], now)).toBeUndefined();
});
