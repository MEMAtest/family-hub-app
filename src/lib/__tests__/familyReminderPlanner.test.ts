import { planFamilyReminders, wallTimeInstant, type ReminderEvent } from '@/lib/familyReminderPlanner';

const members = [
  { id: 'angela', name: 'Angela', role: 'Parent', ageGroup: 'Adult' },
  { id: 'ade', name: 'Ade', role: 'Parent', ageGroup: 'Adult' },
];
const trip = (metadata: ReminderEvent['metadata'] = {}): ReminderEvent => ({
  id: 'trip', person: 'angela', title: 'Business travel', date: '2026-10-08', time: '09:00',
  duration: 480, recurring: 'none', isRecurring: false, cost: 0, type: 'work', priority: 'medium', status: 'confirmed',
  createdAt: new Date(), updatedAt: new Date(), metadata: { travel: {}, ...metadata },
});
const plan = (event = trip(), now = '2026-10-07T07:00:00Z') => planFamilyReminders('family', [event], members, new Date(now));

describe('family reminder planning', () => {
  it('targets Angela preparation and Ade coverage independently at 08 London', () => {
    const result = plan();
    expect(result.map((intent) => [intent.recipientPersonId, intent.purpose])).toEqual([
      ['angela', 'preparation'], ['ade', 'coverage'],
    ]);
    expect(result[0].message).toContain('departure time, return date, return time');
    expect(result[1].message).toContain('Nothing has been assigned');
    expect(result[0].id).not.toBe(result[1].id);
    expect(plan()[0].id).toBe(result[0].id);
  });
  it('gates routine reminders to London 08 and 20, not server UTC hours', () => {
    expect(plan(trip(), '2026-10-07T19:10:00Z')).toHaveLength(2);
    expect(plan(trip(), '2026-10-07T08:00:00Z')).toHaveLength(0);
    expect(plan(trip({ travel: { departureDate: '2026-12-08' } }), '2026-12-07T08:00:00Z')).toHaveLength(2);
    expect(plan(trip({ travel: { departureDate: '2026-12-08' } }), '2026-12-07T07:00:00Z')).toHaveLength(0);
  });
  it('gives the same routine phase an identical ID across overlapping invocations', () => {
    expect(plan()[0].id).toBe(plan(trip(), '2026-10-07T07:45:00Z')[0].id);
    expect(plan()[0].id).not.toBe(plan(trip(), '2026-10-07T19:00:00Z')[0].id);
  });
  it('adds departure stage only when a departure time is known and still in the future', () => {
    const event = trip({ travel: { departureTime: '06:30' } });
    const result = plan(event, '2026-10-08T05:00:00Z');
    expect(result).toHaveLength(2);
    expect(result[0].phase).toBe('departure-60');
    expect(result[0].dueAt.toISOString()).toBe('2026-10-08T04:30:00.000Z');
    expect(plan(event, '2026-10-08T05:30:00Z')).toHaveLength(0);
    expect(plan(trip(), '2026-10-08T05:00:00Z')).toHaveLength(0);
  });
  it('does not invent midnight departure for unknown times', () => {
    expect(plan()[0].expiresAt.toISOString()).toBe('2026-10-08T23:00:00.000Z');
  });
  it('suppresses completed checklists once details and cover are known', () => {
    expect(plan(trip({ travel: { departureTime: '10:00', returnDate: '2026-10-10', returnTime: '18:00',
      preparation: [{ id: 'packing', title: 'Packing', status: 'done' }],
      coverage: [{ id: 'pickup', title: 'Pickup', status: 'not_needed' }],
    } }))).toHaveLength(0);
  });
  it('treats unknown checklist status as unresolved and avoids false completion', () => {
    expect(plan(trip({ travel: { preparation: [{ id: 'packing', title: 'Packing', status: 'unknown' }] } }))[0].message).toContain('Packing');
  });
  it('suppresses cancelled, disabled and expired trips', () => {
    expect(plan(trip({ status: 'cancelled' }))).toHaveLength(0);
    expect(plan(trip({ reminderPreferences: { enabled: false } }))).toHaveLength(0);
    expect(plan(trip(), '2026-10-09T07:00:00Z')).toHaveLength(0);
  });
  it('uses explicit coordinator IDs and never assigns every adult', () => {
    expect(plan(trip({ travel: { coordinatorPersonIds: [] } }))).toHaveLength(1);
    expect(planFamilyReminders('family', [trip()], [...members, { id: 'third', name: 'Third', role: 'Parent' }], new Date('2026-10-07T07:00:00Z'))).toHaveLength(1);
  });
  it('changes intent identity on a material trip edit, not unrelated event timestamps', () => {
    const first = plan()[0];
    expect(plan(trip({ travel: { departureTime: '10:00' } }))[0].id).not.toBe(first.id);
    const updated = trip(); updated.updatedAt = new Date('2030-01-01');
    expect(plan(updated)[0].id).toBe(first.id);
  });
  it('uses explicit departure date even when the calendar anchor is older', () => {
    const event = trip({ travel: { departureDate: '2026-10-08' } }); event.date = '2026-10-01';
    expect(plan(event)).toHaveLength(2);
  });
  it('materializes recurring travel occurrences with independent IDs', () => {
    const event = trip(); event.date = '2026-10-01'; event.recurring = 'weekly'; event.isRecurring = true;
    const first = plan(event)[0];
    const later = plan(event, '2026-10-14T07:00:00Z')[0];
    expect(first.occurrence).toBe('2026-10-08');
    expect(later.occurrence).toBe('2026-10-15');
    expect(first.stateId).not.toBe(later.stateId);
  });
  it('respects skip and cancelled override exceptions', () => {
    const event = trip(); event.date = '2026-10-01'; event.recurring = 'weekly'; event.isRecurring = true;
    const now = new Date('2026-10-07T07:00:00Z');
    expect(planFamilyReminders('family', [event], members, now, [{ id: 'skip', eventId: 'trip', seriesDate: '2026-10-08', type: 'skip' }])).toHaveLength(0);
    expect(planFamilyReminders('family', [event], members, now, [{ id: 'cancel', eventId: 'trip', seriesDate: '2026-10-08', type: 'override', overrides: { status: 'cancelled' } }])).toHaveLength(0);
  });
  it('keys moved occurrences by actual date rather than series anchor', () => {
    const event = trip(); event.date = '2026-10-01'; event.recurring = 'weekly'; event.isRecurring = true;
    const moved = planFamilyReminders('family', [event], members, new Date('2026-10-08T07:00:00Z'), [
      { id: 'move', eventId: 'trip', seriesDate: '2026-10-08', type: 'override', overrides: { date: '2026-10-09' } },
    ]);
    expect(moved[0].occurrence).toBe('2026-10-09');
    expect(moved[0].stateId).not.toBe(plan(event)[0].stateId);
  });
  it('does not mistake a wedding start for a known departure', () => {
    const event = trip({ travel: { destination: 'Düsseldorf', departureDate: '2026-10-08' } });
    event.title = 'Man lin Wedding'; event.type = 'personal'; event.time = '06:00';
    expect(plan(event, '2026-10-08T04:30:00Z')).toHaveLength(0);
    expect(plan(event)[0].message).toContain('departure time');
  });
  it('makes a half-hour departure due exactly at T-60 on minute scheduler ticks', () => {
    const event = trip({ travel: { departureTime: '07:30' } });
    expect(plan(event, '2026-10-08T05:29:00Z')).toHaveLength(0);
    const due = plan(event, '2026-10-08T05:30:00Z');
    expect(due[0].dueAt.toISOString()).toBe('2026-10-08T05:30:00.000Z');
    expect(due[0].id).toBe(plan(event, '2026-10-08T05:31:00Z')[0].id);
  });
});

describe('wall time conversion', () => {
  it('handles BST, GMT and autumn repeated time deterministically', () => {
    expect(wallTimeInstant('2026-10-08', '09:00')?.toISOString()).toBe('2026-10-08T08:00:00.000Z');
    expect(wallTimeInstant('2026-12-08', '09:00')?.toISOString()).toBe('2026-12-08T09:00:00.000Z');
    expect(wallTimeInstant('2026-10-25', '01:30')?.toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });
  it('rejects nonexistent spring time, invalid zones and malformed dates/times', () => {
    expect(wallTimeInstant('2026-03-29', '01:30')).toBeNull();
    expect(wallTimeInstant('2026-10-08', '09:00', 'wrong')).toBeNull();
    expect(wallTimeInstant('2026-02-31', '09:00')).toBeNull();
    expect(wallTimeInstant('2026-10-08', '24:00')).toBeNull();
  });
  it('converts a quarter-hour destination zone correctly', () => {
    expect(wallTimeInstant('2026-10-08', '09:00', 'Asia/Kathmandu')?.toISOString()).toBe('2026-10-08T03:15:00.000Z');
  });
});

describe('bin collection reminders', () => {
  const bins = (): ReminderEvent => ({ ...trip(), id: 'bins', date: '2026-10-09', title: 'Council bins',
    metadata: { binCollection: { date: '2026-10-09', services: ['Food waste', 'Mixed recycling'], sourceUrl: 'https://recyclingservices.bromley.gov.uk/waste/3670007', verified: true } } });
  it('targets parents independently at 20 London, with no made-up collection time', () => {
    const result = plan(bins(), '2026-10-08T19:00:00Z');
    expect(result.map(item => [item.recipientPersonId, item.purpose])).toEqual([['angela', 'bins'], ['ade', 'bins']]);
    expect(result[0].title).toBe('Bins tonight: food waste + mixed recycling');
    expect(result[0].message).toContain('Put out Food waste and Mixed recycling');
    expect(result[0].expiresAt.toISOString()).toBe('2026-10-09T11:00:00.000Z');
    expect(result[0].id).toBe(plan(bins(), '2026-10-08T21:30:00Z')[0].id);
    expect(plan(bins(), '2026-10-08T18:59:00Z')).toHaveLength(0);
    expect(plan(bins(), '2026-10-08T23:00:00Z')).toHaveLength(0);
  });
  it('never reminds children, cancelled events or unverified schedules', () => {
    expect(planFamilyReminders('family', [bins()], [...members, { id: 'askia', name: 'Askia', role: 'Child' }], new Date('2026-10-08T19:00:00Z'))).toHaveLength(2);
    const unverified = bins(); unverified.metadata!.binCollection!.verified = false;
    expect(plan(unverified, '2026-10-08T19:00:00Z')).toHaveLength(0);
    const cancelled = bins(); cancelled.status = 'cancelled';
    expect(plan(cancelled, '2026-10-08T19:00:00Z')).toHaveLength(0);
  });
  it('keeps the 20 London slot across the autumn clock change', () => {
    const event = bins(); event.date = '2026-10-26'; event.metadata!.binCollection!.date = event.date;
    const result = plan(event, '2026-10-25T20:00:00Z');
    expect(result[0].dueAt.toISOString()).toBe('2026-10-25T20:00:00.000Z');
  });
});
