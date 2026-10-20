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
      event({ id: 'one', title: 'Office', time: '09:00', duration: 120 }),
      event({ id: 'two', title: 'Dentist', time: '10:00', duration: 60 }),
      event({ id: 'three', title: 'School', person: 'askia', time: '10:00', duration: 60 }),
    ], [...people, { id: 'askia', name: 'Askia', color: '#333', icon: 'A', role: 'Child' }]);
    expect(insights.filter((insight) => insight.kind === 'conflict')).toHaveLength(1);
    expect(insights[0].detail).toContain('Office and Dentist');
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
});
