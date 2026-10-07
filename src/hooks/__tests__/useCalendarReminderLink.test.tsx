import { renderHook } from '@testing-library/react';
import { useCalendarReminderLink } from '../useCalendarReminderLink';
import type { CalendarEvent } from '@/types/calendar.types';
const event: CalendarEvent = { id: 'wedding', title: 'Man lin Wedding', type: 'personal',
  person: 'angela', date: '2026-10-08', time: '06:00', duration: 60, recurring: 'none',
  isRecurring: false, cost: 0, status: 'confirmed', priority: 'medium',
  createdAt: new Date('2026-10-07T07:00:00Z'), updatedAt: new Date('2026-10-07T07:00:00Z'),
  metadata: { travel: { departureDate: '2026-10-08' } } };
beforeEach(() => window.history.replaceState({}, '', '/?view=calendar&event=wedding'));
it('opens the travel editor once after event hydration and consumes the targeted URL', () => {
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { rerender } = renderHook(({ events }) => useCalendarReminderLink(events, openTravel, openEvent), { initialProps: { events: [] as CalendarEvent[] } });
  expect(openTravel).not.toHaveBeenCalled();
  rerender({ events: [event] }); rerender({ events: [event] });
  expect(openTravel).toHaveBeenCalledTimes(1); expect(openTravel).toHaveBeenCalledWith(event);
  expect(openEvent).not.toHaveBeenCalled(); expect(window.location.search).toBe('?view=calendar');
});
it('opens an ordinary event using the existing calendar action', () => {
  const openEvent = jest.fn();
  renderHook(() => useCalendarReminderLink([{ ...event, metadata: {} }], jest.fn(), openEvent));
  expect(openEvent).toHaveBeenCalledTimes(1);
});
