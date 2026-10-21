import { getScheduleHealthInsights } from '@/utils/scheduleHealth';
import type { CalendarEvent, Person } from '@/types/calendar.types';

const people: Person[] = [{ id: 'angela', name: 'Angela', color: '#147c72', icon: 'A', role: 'Parent' }];
const event = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'event', title: 'Plan', person: 'angela', date: '2026-10-20', time: '09:00', duration: 60,
  recurring: 'none', cost: 0, type: 'other', isRecurring: false, priority: 'medium', status: 'confirmed',
  createdAt: new Date('2026-10-01'), updatedAt: new Date('2026-10-01'), ...overrides,
});
describe('saved-event schedule health', () => {
  it('finds same-person overlaps without treating different people as a conflict', () => {
    const insights = getScheduleHealthInsights([
      event({ id: 'one', title: 'Meeting', time: '09:00', duration: 120 }),
      event({ id: 'two', title: 'Dentist', time: '10:00', duration: 60 }),
      event({ id: 'three', title: 'School', person: 'askia', time: '10:00', duration: 60 }),
    ], [...people, { id: 'askia', name: 'Askia', color: '#333', icon: 'A', role: 'Child' }]);
    expect(insights.filter((insight) => insight.kind === 'conflict')).toHaveLength(1);
    expect(insights[0].detail).toContain('Meeting (09:00-11:00) and Dentist (10:00-11:00)');
    expect(insights[0].detail).toContain('60 min overlap, 10:00-11:00');
  });

  it('surfaces only recorded preparation and coverage requirements', () => {
    const insights = getScheduleHealthInsights([event({ id: 'trip', title: 'Trip', travel: {
      preparation: [{ id: 'passport', title: 'Pack passport', status: 'outstanding' }],
      coverage: [{ id: 'pickup', title: 'Confirm pickup', status: 'unknown' }],
    } })], people);
    expect(insights.map((insight) => insight.title)).toEqual([
      'Cover to confirm for Trip',
      'Preparation for Trip',
    ]);
    expect(insights.map((insight) => insight.detail).join(' ')).toContain('Pack passport');
  });

  it('flags missing owners and explicitly unknown times', () => {
    const insights = getScheduleHealthInsights([event({
      person: '',
      metadata: { calendarTiming: { status: 'unknown' } },
    })], people);
    expect(insights.map((insight) => insight.kind)).toEqual(['owner', 'time']);
  });

  it('separates probable duplicates from genuine overlaps without deleting plans', () => {
    const events = [event({ id: 'one', title: 'Dentist!' }), event({ id: 'two', title: ' dentist ' })];
    const insights = getScheduleHealthInsights(events, people);
    expect(insights.map(item => item.kind)).toEqual(['duplicate']);
    expect(insights[0].relatedEventIds).toEqual(['one', 'two']);
    expect(insights[0].detail).toContain('check before removing either');
    expect(events).toHaveLength(2);
  });

  it('does not classify matching titles and start times with different durations as duplicates', () => {
    const insights = getScheduleHealthInsights([
      event({ id: 'one', title: 'Dentist', duration: 60 }),
      event({ id: 'two', title: 'Dentist', duration: 90 }),
    ], people);
    expect(insights.map(item => item.kind)).toEqual(['conflict']);
    expect(insights[0].detail).toContain('Dentist (09:00-10:00) and Dentist (09:00-10:30)');
  });

  it('keys pair warnings by occurrence date and keeps IDs stable when input order changes', () => {
    const first = event({ id: 'one', title: 'Meeting', duration: 120 });
    const second = event({ id: 'two', title: 'Dentist', time: '09:30' });
    const insight = getScheduleHealthInsights([first, second], people)[0];
    expect(insight).toMatchObject({ eventId: 'one', occurrenceDate: '2026-10-20' });
    expect(insight.relatedEventIds).toEqual(['one', 'two']);
    expect(insight.id).toContain('2026-10-20');
    expect(insight.id).toContain('one:2026-10-20:09:00-11:00');
    expect(insight.id).toContain('two:2026-10-20:09:30-10:30');
    expect(getScheduleHealthInsights([second, first], people)[0].id).toBe(insight.id);
    expect(getScheduleHealthInsights([second, first], people)[0].relatedEventIds).toEqual(insight.relatedEventIds);
    const next = getScheduleHealthInsights([first, second].map(item => ({ ...item, date: '2026-10-27' })), people)[0];
    expect(next.occurrenceDate).toBe('2026-10-27');
    expect(next.id).not.toBe(insight.id);
  });

  it.each([
    [0, { time: '09:15' }],
    [0, { duration: 150 }],
    [1, { time: '09:45' }],
    [1, { duration: 75 }],
  ] as Array<[number, Partial<CalendarEvent>]>)('changes the pair ID when event %i changes its window (%j)', (index, changes) => {
    const events = [event({ id: 'one', title: 'Meeting', duration: 120 }),
      event({ id: 'two', title: 'Dentist', time: '09:30' })];
    const previous = getScheduleHealthInsights(events, people)[0];
    const updated = getScheduleHealthInsights(events.map((item, i) => i === index ? { ...item, ...changes } : item), people)[0];
    expect(updated.kind).toBe('conflict');
    expect(updated.id).not.toBe(previous.id);
  });

  it.each([
    ['owner', { person: '' }],
    ['time', { metadata: { calendarTiming: { status: 'unknown' } } }],
    ['coverage', { travel: {} }],
    ['coverage', { travel: { coverage: [{ id: 'pickup', title: 'Pickup', status: 'unknown' }] } }],
    ['preparation', { travel: { preparation: [{ id: 'packing', title: 'Packing', status: 'outstanding' }] } }],
  ] as Array<[string, Partial<CalendarEvent>]>)('includes occurrence dates in single %s warning IDs', (kind, changes) => {
    const original = event({ ...changes, occurrenceDate: '2026-10-20' });
    const insight = getScheduleHealthInsights([original], people).find(item => item.kind === kind)!;
    const next = getScheduleHealthInsights([{ ...original, date: '2026-10-27', occurrenceDate: '2026-10-27' }], people)
      .find(item => item.kind === kind)!;
    expect(insight.occurrenceDate).toBe('2026-10-20');
    expect(insight.id).toContain('2026-10-20');
    expect(insight.relatedEventIds).toBeUndefined();
    expect(next.occurrenceDate).toBe('2026-10-27');
    expect(next.id).toContain('2026-10-27');
    expect(next.id).not.toBe(insight.id);
  });

  it('treats office presence as availability and remote work as compatible with attendance', () => {
    const appointment = event({ id: 'dentist', title: 'Dentist', time: '10:00' });
    const office = event({ id: 'work', title: 'Work location', duration: 480,
      workStatus: { type: 'office', affectsPickup: false } });
    const insights = getScheduleHealthInsights([office, appointment], people);
    expect(insights.map(item => item.kind)).toEqual(['availability']);
    expect(insights[0].detail).toContain('confirm pickup or attendance');
    expect(insights[0].eventId).toBe('dentist');
    expect(insights[0].relatedEventIds).toEqual(['dentist', 'work']);
    expect(insights[0].occurrenceDate).toBe(appointment.date);
    expect(getScheduleHealthInsights([{ ...office, workStatus: { type: 'remote', affectsPickup: false } }, appointment], people)).toEqual([]);
    expect(getScheduleHealthInsights([office, event({ id: 'admin', title: 'Pay school invoice' })], people)).toEqual([]);
    expect(getScheduleHealthInsights([{ ...office, workStatus: undefined,
      metadata: { workStatus: { type: 'office', affectsPickup: true } } }], people)[0].kind).toBe('coverage');
  });

  it('does not report bins or untimed notices as missing times or all-day clashes', () => {
    expect(getScheduleHealthInsights([
      event({ id: 'bins', person: '', title: 'Bins', duration: 1440,
        metadata: { binCollection: { verified: true }, calendarTiming: { status: 'unknown' } } }),
      event({ id: 'notice', title: 'School notice', duration: 1440,
        metadata: { calendarTiming: { status: 'unknown' } } }),
      event({ id: 'meeting', title: 'Meeting' }),
    ], people)).toEqual([]);
  });

  it('ignores cancelled plans and back-to-back plans', () => {
    expect(getScheduleHealthInsights([
      event({ id: 'one' }), event({ id: 'two', time: '10:00' }),
      event({ id: 'cancelled', status: 'cancelled', person: '' }),
      event({ id: 'metadata-cancelled', metadata: { status: 'cancelled' } }),
    ], people)).toEqual([]);
  });

  it('checks explicit additional attendees without treating different owners as a clash', () => {
    const allPeople = [...people, { ...people[0], id: 'ade', name: 'Ade' }];
    const insights = getScheduleHealthInsights([
      event({ id: 'family', title: 'School meeting', person: 'ade', attendees: ['angela'] }),
      event({ id: 'dentist', title: 'Dentist', time: '09:45' }),
    ], allPeople);
    expect(insights).toHaveLength(1);
    expect(insights[0].title).toBe('Angela has overlapping plans');
    expect(insights[0].detail).toContain('15 min overlap, 09:45-10:00');
  });

  it('uses confirmed attendees, not the child concerned by a school event', () => {
    const school = event({ id: 'school', title: 'PTA meeting', sourceId: 'school',
      metadata: { schoolAssignment: { attendeeStatus: 'needs_confirmation' } } });
    expect(getScheduleHealthInsights([school, event({ id: 'other', title: 'Dentist' })], people)
      .filter(item => item.kind === 'conflict')).toHaveLength(0);
    expect(getScheduleHealthInsights([{ ...school, metadata: { schoolAssignment: { attendeeStatus: 'confirmed' } } },
      event({ id: 'other', title: 'Dentist' })], people).filter(item => item.kind === 'conflict')).toHaveLength(1);
  });
});
