import { isActionableNotification, isInboxOnlyNotificationSource, londonNotificationDay } from '../notificationDelivery';

it.each([
  ['2026-10-21T23:30:00Z', '2026-10-22', '2026-10-22T23:00:00.000Z'],
  ['2026-10-25T00:30:00Z', '2026-10-25', '2026-10-26T00:00:00.000Z'],
  ['2026-03-28T23:30:00Z', '2026-03-28', '2026-03-29T00:00:00.000Z'],
  ['2026-03-29T01:30:00Z', '2026-03-29', '2026-03-29T23:00:00.000Z'],
  ['2026-12-31T23:30:00Z', '2026-12-31', '2027-01-01T00:00:00.000Z'],
])('uses London day boundaries at %s', (iso, key, end) => {
  const day = londonNotificationDay(new Date(iso));
  expect(day.key).toBe(key);
  expect(day.endsAt.toISOString()).toBe(end);
});

it.each(['gmail-nursery-email', 'gmail-school-email', 'grandir-parent-portal', 'calendar-email', 'notification-sweep'])(
  'makes %s discoveries inbox-only', source => expect(isInboxOnlyNotificationSource(source)).toBe(true));

it('keeps deliberate member reminders and catch-up summaries eligible for push', () => {
  expect(isInboxOnlyNotificationSource('family-reminder-planner')).toBe(false);
  expect(isInboxOnlyNotificationSource('notification-catchup')).toBe(false);
  expect(isInboxOnlyNotificationSource('home-intelligence')).toBe(false);
});

it('does not count non-actionable or old no-expiry history as active work', () => {
  const now = Date.parse('2026-10-21T12:00Z');
  const notice = { read: false, actionRequired: true, timestamp: '2026-10-21T10:00Z' };
  expect(isActionableNotification(notice, now)).toBe(true);
  expect(isActionableNotification({ ...notice, actionRequired: false }, now)).toBe(false);
  expect(isActionableNotification({ ...notice, timestamp: '2026-10-08T10:00Z' }, now)).toBe(false);
  expect(isActionableNotification({ ...notice, metadata: { eventDate: '2026-10-20', eventTime: '12:00' } }, now)).toBe(false);
  expect(isActionableNotification({ ...notice, metadata: { canAct: false } }, now)).toBe(false);
});

it('bounds intake review to seven days and home scans to their London day without hiding history', () => {
  const now = Date.parse('2026-10-21T12:00Z');
  const notice = { read: false, actionRequired: true, timestamp: '2026-10-20T10:00Z' };
  expect(isActionableNotification({ ...notice, metadata: { source: 'gmail-nursery-email' } }, now)).toBe(true);
  expect(isActionableNotification({ ...notice, metadata: { source: 'home-intelligence' } }, now)).toBe(false);
  expect(isActionableNotification({ ...notice, timestamp: '2026-10-13T10:00Z', metadata: { source: 'gmail-nursery-email' } }, now)).toBe(false);
  expect(isActionableNotification({ ...notice, expiresAt: '2026-10-22T10:00Z' }, now)).toBe(true);
});
