import { formatConflictGroupTimeRange, getSameDayConflictGroups } from '@/utils/calendarConflicts';
import type { CalendarEvent } from '@/types/calendar.types';

const event = (overrides: Partial<CalendarEvent>): CalendarEvent => ({
  id: 'event',
  title: 'Event',
  person: 'person-1',
  date: '2026-08-08',
  time: '09:00',
  duration: 60,
  recurring: 'none',
  cost: 0,
  type: 'family',
  isRecurring: false,
  priority: 'medium',
  status: 'confirmed',
  createdAt: new Date('2026-07-16T09:00:00Z'),
  updatedAt: new Date('2026-07-16T09:00:00Z'),
  ...overrides,
});

describe('calendar same-day conflict grouping', () => {
  it('groups events whose time windows overlap on the selected day', () => {
    const groups = getSameDayConflictGroups([
      event({ id: 'a', title: 'Birthday party', time: '14:00', duration: 120 }),
      event({ id: 'b', title: 'Cinema', time: '15:00', duration: 90 }),
      event({ id: 'c', title: 'Dinner', time: '18:30', duration: 60 }),
    ], '2026-08-08');

    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((item) => item.id)).toEqual(['a', 'b']);
    expect(formatConflictGroupTimeRange(groups[0])).toBe('14:00-16:30');
  });

  it('does not group back-to-back events as clashes', () => {
    const groups = getSameDayConflictGroups([
      event({ id: 'a', title: 'Football', time: '10:00', duration: 60 }),
      event({ id: 'b', title: 'Lunch', time: '11:00', duration: 60 }),
    ], '2026-08-08');

    expect(groups).toEqual([]);
  });

  it('connects chained overlaps into one competing group', () => {
    const groups = getSameDayConflictGroups([
      event({ id: 'a', title: 'A', time: '09:00', duration: 60 }),
      event({ id: 'b', title: 'B', time: '09:30', duration: 60 }),
      event({ id: 'c', title: 'C', time: '10:15', duration: 30 }),
    ], '2026-08-08');

    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(formatConflictGroupTimeRange(groups[0])).toBe('09:00-10:45');
  });

  it('handles multi-day events as all-day blockers on middle dates', () => {
    const groups = getSameDayConflictGroups([
      event({
        id: 'holiday',
        title: 'Summer holiday',
        date: '2026-08-01',
        endDate: '2026-08-10',
        time: '09:00',
        duration: 60,
      }),
      event({ id: 'party', title: 'Party', date: '2026-08-08', time: '14:00', duration: 120 }),
    ], '2026-08-08');

    expect(groups).toHaveLength(1);
    expect(groups[0].events.map((item) => item.id)).toEqual(['holiday', 'party']);
    expect(formatConflictGroupTimeRange(groups[0])).toBe('00:00-24:00');
  });
});
