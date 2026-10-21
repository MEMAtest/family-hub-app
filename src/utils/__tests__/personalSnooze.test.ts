import { personalSnoozeUntil } from '../personalSnooze';

it('offers bounded ten-minute and one-hour personal snooze', () => {
  const now = new Date('2026-10-09T07:00:00Z');
  expect(personalSnoozeUntil('10min', now).toISOString()).toBe('2026-10-09T07:10:00.000Z');
  expect(personalSnoozeUntil('1h', now).toISOString()).toBe('2026-10-09T08:00:00.000Z');
});

it.each([
  ['2026-10-09T23:30:00Z', '2026-10-11T08:00:00.000Z'],
  ['2026-10-24T07:00:00Z', '2026-10-25T09:00:00.000Z'],
  ['2026-03-28T08:00:00Z', '2026-03-29T08:00:00.000Z'],
])('uses tomorrow at 9am London from %s, including daylight saving boundaries', (now, expected) => {
  expect(personalSnoozeUntil('tomorrow', new Date(now)).toISOString()).toBe(expected);
});
