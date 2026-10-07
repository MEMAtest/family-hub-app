import { act, renderHook, waitFor } from '@testing-library/react';
import { REMINDER_LINK_FETCH_TIMEOUT_MS, useCalendarReminderLink } from '../useCalendarReminderLink';
import type { CalendarEvent } from '@/types/calendar.types';
const event: CalendarEvent = { id: 'wedding', title: 'Man lin Wedding', type: 'personal',
  person: 'angela', date: '2026-10-08', time: '06:00', duration: 60, recurring: 'none',
  isRecurring: false, cost: 0, status: 'confirmed', priority: 'medium',
  createdAt: new Date('2026-10-07T07:00:00Z'), updatedAt: new Date('2026-10-07T07:00:00Z'),
  metadata: { travel: { departureDate: '2026-10-08' } } };
const stale: CalendarEvent = { ...event, metadata: {} };
const dbEvent = { id: event.id, title: event.title, eventType: event.type, personId: event.person,
  eventDate: '2026-10-08T06:00:00Z', eventTime: '2026-10-08T06:00:00Z', durationMinutes: 60,
  recurringPattern: 'none', isRecurring: false, cost: 0, metadata: event.metadata,
  createdAt: event.createdAt.toISOString(), updatedAt: event.updatedAt.toISOString() };
const originalFetch = global.fetch;
const respond = (rows: unknown = [dbEvent]) => ({ ok: true, json: async () => rows });
beforeEach(() => {
  window.history.replaceState({}, '', '/?view=calendar&event=wedding');
  global.fetch = jest.fn().mockResolvedValue(respond());
});
afterEach(() => { global.fetch = originalFetch; jest.useRealTimers(); });

it('waits for authoritative travel metadata instead of consuming a stale cache link', async () => {
  let resolve!: (response: ReturnType<typeof respond>) => void;
  (global.fetch as jest.Mock).mockReturnValue(new Promise((done) => { resolve = done; }));
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { result, rerender } = renderHook(({ events }) => useCalendarReminderLink(events, openTravel, openEvent, 'family'),
    { initialProps: { events: [stale] } });
  expect(result.current.loading).toBe(true);
  expect(openTravel).not.toHaveBeenCalled(); expect(openEvent).not.toHaveBeenCalled();
  expect(window.location.search).toBe('?view=calendar&event=wedding');
  rerender({ events: [event] });
  expect(global.fetch).toHaveBeenCalledTimes(1);
  await act(async () => resolve(respond()));
  expect(openTravel).toHaveBeenCalledTimes(1); expect(openEvent).not.toHaveBeenCalled();
  expect(openTravel.mock.calls[0][0]).toMatchObject({ title: event.title, type: 'personal', time: '06:00',
    travel: { departureDate: '2026-10-08' } });
  expect(openTravel.mock.calls[0][0].travel.departureTime).toBeUndefined();
  expect(window.location.search).toBe('?view=calendar');
  rerender({ events: [event] });
  expect(openTravel).toHaveBeenCalledTimes(1);
  expect(global.fetch).toHaveBeenCalledWith('/api/families/family/events', expect.objectContaining({ cache: 'no-store' }));
});
it('can open an authoritative event absent from the local cache', async () => {
  const openTravel = jest.fn();
  renderHook(() => useCalendarReminderLink([], openTravel, jest.fn(), 'family'));
  await waitFor(() => expect(openTravel).toHaveBeenCalledTimes(1));
});
it('opens an ordinary event only when the authoritative response has no travel context', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(respond([{ ...dbEvent, metadata: {} }]));
  const openTravel = jest.fn(), openEvent = jest.fn();
  renderHook(() => useCalendarReminderLink([event], openTravel, openEvent, 'family'));
  await waitFor(() => expect(openEvent).toHaveBeenCalledTimes(1));
  expect(openTravel).not.toHaveBeenCalled();
});
it('waits for the authenticated family scope rather than using local-storage identity', async () => {
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { rerender } = renderHook(({ familyId }) => useCalendarReminderLink([stale], openTravel, openEvent, familyId),
    { initialProps: { familyId: null as string | null } });
  expect(global.fetch).not.toHaveBeenCalled(); expect(openEvent).not.toHaveBeenCalled();
  rerender({ familyId: 'family' });
  await waitFor(() => expect(openTravel).toHaveBeenCalledTimes(1));
});
it('retains the link on failed fetch and supports an explicit retry without cached fallback', async () => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce(respond());
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { result } = renderHook(() => useCalendarReminderLink([stale], openTravel, openEvent, 'family'));
  await waitFor(() => expect(result.current.error).toBe('Could not load current event details.'));
  expect(openEvent).not.toHaveBeenCalled(); expect(window.location.search).toContain('event=wedding');
  act(() => result.current.retry());
  await waitFor(() => expect(openTravel).toHaveBeenCalledTimes(1));
});
it('bounds a hung request and retains the link for retry', async () => {
  jest.useFakeTimers();
  (global.fetch as jest.Mock).mockImplementation((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }));
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { result } = renderHook(() => useCalendarReminderLink([stale], openTravel, openEvent, 'family'));
  await act(async () => jest.advanceTimersByTime(REMINDER_LINK_FETCH_TIMEOUT_MS));
  expect(result.current.error).toContain('timed out'); expect(result.current.loading).toBe(false);
  expect(openTravel).not.toHaveBeenCalled(); expect(openEvent).not.toHaveBeenCalled();
  expect(window.location.search).toContain('event=wedding');
});
it('does not fall back to cache when the event has been removed', async () => {
  (global.fetch as jest.Mock).mockResolvedValue(respond([]));
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { result } = renderHook(() => useCalendarReminderLink([stale], openTravel, openEvent, 'family'));
  await waitFor(() => expect(result.current.error).toBe('This event is no longer available.'));
  expect(openTravel).not.toHaveBeenCalled(); expect(openEvent).not.toHaveBeenCalled();
  expect(window.location.search).toContain('event=wedding');
});
it('ignores an obsolete household response after family scope changes', async () => {
  let resolve!: (response: ReturnType<typeof respond>) => void;
  (global.fetch as jest.Mock).mockReturnValueOnce(new Promise((done) => { resolve = done; })).mockResolvedValueOnce(respond([]));
  const openTravel = jest.fn(), openEvent = jest.fn();
  const { result, rerender } = renderHook(({ familyId }) => useCalendarReminderLink([stale], openTravel, openEvent, familyId),
    { initialProps: { familyId: 'old-family' } });
  rerender({ familyId: 'new-family' });
  await act(async () => resolve(respond()));
  await waitFor(() => expect(result.current.error).toBe('This event is no longer available.'));
  expect(openTravel).not.toHaveBeenCalled(); expect(openEvent).not.toHaveBeenCalled();
});
