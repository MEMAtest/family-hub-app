import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from '../useMediaQuery';

describe('useMediaQuery', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('returns initial value when matchMedia is unavailable', () => {
    delete (window as any).matchMedia;
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)', true));
    expect(result.current).toBe(true);
  });

  it('subscribes to updates when matchMedia exists', () => {
    const listeners: Array<(event: MediaQueryListEvent) => void> = [];
    const mockMediaQueryList = {
      matches: false,
      media: '(max-width: 768px)',
      addEventListener: (_: 'change', cb: (event: MediaQueryListEvent) => void) => listeners.push(cb),
      removeEventListener: (_: 'change', cb: (event: MediaQueryListEvent) => void) => {
        const index = listeners.indexOf(cb);
        if (index >= 0) listeners.splice(index, 1);
      },
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList;

    window.matchMedia = jest.fn().mockReturnValue(mockMediaQueryList);

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);

    act(() => {
      mockMediaQueryList.matches = true;
      listeners.forEach((listener) =>
        listener({ matches: true } as MediaQueryListEvent));
    });

    expect(result.current).toBe(true);
  });
});

