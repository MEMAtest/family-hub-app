jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/budget/recentSpendingService', () => ({ loadRecentSpending: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({ body, status: init?.status ?? 200, headers: init?.headers }) } }));
import { GET } from './route';
import { loadRecentSpending } from '@/lib/budget/recentSpendingService';
const context = { params: Promise.resolve({ familyId: 'household' }) };
const get = (query: string) => (GET as any)({ url: `http://localhost/?${query}` }, context);
beforeEach(() => { jest.clearAllMocks(); (loadRecentSpending as jest.Mock).mockResolvedValue({ report: { days: 30 } }); });
test('defaults to 30 days and uses the authenticated household scope with private no-store', async () => {
  const result = await get('');
  expect(result.status).toBe(200);
  expect(loadRecentSpending).toHaveBeenCalledWith('household', 30);
  expect(result.headers['Cache-Control']).toBe('private, no-store');
});
test.each(['0', '-7', '366', '1.5', '7days', 'Infinity', '', '999999'])('rejects unsupported days %s before reading bank data', async value => {
  expect((await get(`days=${value}`)).status).toBe(400);
  expect(loadRecentSpending).not.toHaveBeenCalled();
});
test.each([1, 7, 14, 30, 90, 365])('accepts whole-day range %s', async value => {
  expect((await get(`days=${value}`)).status).toBe(200);
  expect(loadRecentSpending).toHaveBeenCalledWith('household', value);
});
test('failure remains unavailable rather than falling back to a monthly plan or earlier result', async () => {
  (loadRecentSpending as jest.Mock).mockRejectedValue(new Error('unavailable'));
  const result = await get('days=7');
  expect(result.status).toBe(503);
  expect(result.body.error).toContain('unavailable');
});
