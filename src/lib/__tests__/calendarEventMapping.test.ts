import {
  decodeStoredRecurringPattern,
  encodeStoredRecurringPattern,
  toCalendarEventResponse,
} from '@/lib/calendarEventMapping';

describe('calendar recurrence persistence mapping', () => {
  it('round-trips a multi-day weekly rule through the existing string column', () => {
    const pattern = { frequency: 'weekly' as const, interval: 1, daysOfWeek: [2, 5] };
    const stored = encodeStoredRecurringPattern('weekly', pattern);

    expect(stored).toBe(`kinboard:v1:${JSON.stringify(pattern)}`);
    expect(decodeStoredRecurringPattern(stored)).toEqual({ recurring: 'weekly', recurringPattern: pattern });
  });

  it('keeps legacy recurrence values unchanged', () => {
    expect(encodeStoredRecurringPattern('weekly')).toBe('weekly');
    expect(decodeStoredRecurringPattern('weekly')).toEqual({ recurring: 'weekly' });
    expect(decodeStoredRecurringPattern('none')).toEqual({ recurring: 'none' });
  });

  it('returns parsed rich recurrence data from a database event', () => {
    const pattern = { frequency: 'weekly' as const, interval: 2, daysOfWeek: [1, 4] };
    const response = toCalendarEventResponse({
      id: 'event-id',
      personId: 'child-id',
      eventDate: new Date('2026-09-01T00:00:00.000Z'),
      eventTime: new Date('2026-09-01T15:30:00.000Z'),
      durationMinutes: 60,
      eventType: 'education',
      recurringPattern: encodeStoredRecurringPattern('weekly', pattern),
      isRecurring: true,
    });

    expect(response.recurring).toBe('weekly');
    expect(response.recurringPattern).toEqual(pattern);
    expect(response.date).toBe('2026-09-01');
    expect(response.time).toBe('15:30');
  });
});
