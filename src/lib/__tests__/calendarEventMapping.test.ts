import {
  decodeStoredRecurringPattern,
  encodeStoredRecurringPattern,
  toCalendarEventResponse,
  calendarEventDraftToDbData,
  mergeCalendarEventMetadata,
  readCalendarEventMetadata,
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

describe('durable event context', () => {
  it('round-trips travel and reminders across save and reload', () => {
    const metadata = mergeCalendarEventMetadata({
      status: 'tentative', priority: 'high', attendees: ['ade'],
      workStatus: { type: 'travel', affectsPickup: true },
      travel: { departureDate: '2026-10-08', coordinatorPersonIds: ['ade'] },
      reminders: [{ id: 'hour', type: 'notification', time: 60, enabled: true }],
    });
    expect(readCalendarEventMetadata(JSON.parse(JSON.stringify(metadata)))).toMatchObject(metadata);
  });

  it('preserves server provenance and manual assignment audit while ignoring client spoofing', () => {
    const previous = { assignmentOverride: { personId: 'amari' }, institution: 'Stewart Fleming', travel: { destination: 'London' } };
    const next = mergeCalendarEventMetadata({ metadata: { institution: 'Fake', assignmentOverride: null }, status: 'cancelled' }, previous);
    expect(next).toEqual({ ...previous, status: 'cancelled' });
  });

  it('includes rich context when ingestion writes a calendar draft', () => {
    const data = calendarEventDraftToDbData('family', {
      title: 'Trip', person: 'angela', date: '2026-10-08', time: '08:00', duration: 60,
      recurring: 'none', cost: 0, type: 'work', isRecurring: false, priority: 'high', status: 'confirmed',
      workStatus: { type: 'travel', affectsPickup: true },
    });
    expect(data.metadata.workStatus).toEqual({ type: 'travel', affectsPickup: true });
  });
});
