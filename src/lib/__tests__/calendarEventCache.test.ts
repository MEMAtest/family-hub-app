import { mergeDatabaseAndCachedEvents } from '@/lib/calendarEventCache';
import type { CalendarEvent } from '@/types/calendar.types';

const event = (id: string, title: string): CalendarEvent => ({
  id,
  title,
  person: 'member-1',
  date: '2026-10-01',
  time: '09:00',
  duration: 60,
  recurring: 'none',
  cost: 0,
  type: 'other',
  isRecurring: false,
  priority: 'medium',
  status: 'confirmed',
  createdAt: new Date('2026-09-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
});

describe('mergeDatabaseAndCachedEvents', () => {
  it('does not restore cached database records missing from the latest response', () => {
    const result = mergeDatabaseAndCachedEvents(
      [event('db-current', 'Current event')],
      [event('db-deleted', 'Deleted school event')],
    );

    expect(result.map(({ id }) => id)).toEqual(['db-current']);
  });

  it('keeps unsynced local event and school-term records', () => {
    const result = mergeDatabaseAndCachedEvents(
      [event('db-current', 'Current event')],
      [event('event-offline', 'Offline draft'), event('school-term', 'Term date')],
    );

    expect(result.map(({ id }) => id)).toEqual(['db-current', 'event-offline', 'school-term']);
  });

  it('uses the database copy when a local cache has the same id', () => {
    const result = mergeDatabaseAndCachedEvents(
      [event('event-synced', 'Server title')],
      [event('event-synced', 'Stale cached title')],
    );

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Server title');
  });
});
