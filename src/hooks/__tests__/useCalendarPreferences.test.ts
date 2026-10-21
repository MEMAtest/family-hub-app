import { renderHook, waitFor } from '@testing-library/react';
import { useCalendarPreferences } from '../useCalendarPreferences';

test('recovers an initial auth hydration response before enabling parent shortcuts', async () => {
  const original = global.fetch;
  global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 401 })
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ hiddenUpcoming: ['event:2026-10-21'], acceptedOverlaps: [], lastPlace: null, memberId: 'ade' }) });
  try {
    const { result, unmount } = renderHook(() => useCalendarPreferences('family'));
    expect(result.current.status).toBe('loading');
    expect(result.current.preferences.memberId).toBeUndefined();
    await waitFor(() => expect(result.current.status).toBe('saved'));
    expect(result.current.preferences.memberId).toBe('ade');
    expect(result.current.preferences.hiddenUpcoming).toEqual(['event:2026-10-21']);
    unmount();
  } finally { global.fetch = original; }
});
