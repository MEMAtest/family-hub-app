import { extractRoutineWeekdays, nextDateForWeekday } from '@/utils/schoolRoutineSchedule';

describe('school routine scheduling', () => {
  it('finds all weekdays in a routine without duplicating them', () => {
    expect(extractRoutineWeekdays('Chaplin - Monday & Friday; Scott - Wednesday')).toEqual([1, 3, 5]);
  });

  it('uses the next matching date, including today', () => {
    expect(nextDateForWeekday(new Date('2026-09-07T12:00:00Z'), 1)).toBe('2026-09-07');
    expect(nextDateForWeekday(new Date('2026-09-07T12:00:00Z'), 5)).toBe('2026-09-11');
  });
});
