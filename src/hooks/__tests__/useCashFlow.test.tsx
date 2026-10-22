import { act, renderHook, waitFor } from '@testing-library/react';
import { useCashFlow } from '../useCashFlow';
const payload = (month: string, actualIncome: number) => ({
  month, summary: { actualIncome, actualSpend: 0, actualNet: actualIncome },
  coverage: { status: 'complete', transactionCount: 1 },
  categorySpend: [], transactions: [], reconciliations: [], connections: { accounts: [], planned: { incomeItems: 0, expenseItems: 0 }, property: { projects: [] } },
});
const response = (body: unknown) => ({ ok: true, json: async () => body });
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('a late response cannot overwrite a different month or family', async () => {
  let finish!: (value: unknown) => void;
  global.fetch = jest.fn().mockImplementationOnce(() => new Promise(resolve => { finish = resolve; })).mockResolvedValueOnce(response(payload('2026-09', 90)));
  const { result, rerender } = renderHook(({ family, month }) => useCashFlow(family, month), { initialProps: { family: 'one', month: '2026-10' } });
  rerender({ family: 'two', month: '2026-09' });
  await waitFor(() => expect(result.current.data?.summary.actualIncome).toBe(90));
  await act(async () => { finish(response(payload('2026-10', 999))); });
  expect(result.current.data?.month).toBe('2026-09');
  expect(result.current.data?.summary.actualIncome).toBe(90);
});
test('refresh failures clear previously loaded totals and malformed responses never become zero', async () => {
  global.fetch = jest.fn().mockResolvedValueOnce(response(payload('2026-10', 100))).mockResolvedValueOnce({ ok: false, json: async () => ({ error: 'Bank source failed' }) }).mockResolvedValueOnce(response([]));
  const { result } = renderHook(() => useCashFlow('home', '2026-10'));
  await waitFor(() => expect(result.current.data?.summary.actualIncome).toBe(100));
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.error).toBe('Bank source failed'));
  expect(result.current.data).toBeNull();
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.error).toMatch(/incomplete/));
  expect(result.current.data).toBeNull();
});
