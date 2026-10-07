jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({
  status: init?.status || 200, json: async () => body }) } }));
jest.mock('@/lib/grandirIntake', () => ({ syncGrandirIntake: jest.fn() }));
import { GET } from './route';
import { syncGrandirIntake } from '@/lib/grandirIntake';
import { GrandirConnectionError } from '@/lib/grandirClient';
const request = (secret = 'test-cron') => ({ headers: { get: () => `Bearer ${secret}` } }) as any;
describe('scheduled Grandir intake', () => {
  const env = { ...process.env };
  beforeEach(() => { jest.clearAllMocks(); process.env.CRON_SECRET = 'test-cron'; process.env.CALENDAR_INBOUND_FAMILY_ID = 'family';
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T07:00:00Z')); jest.spyOn(console, 'error').mockImplementation(() => {}); });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); process.env = { ...env }; });
  it('requires cron authentication before any read', async () => {
    expect((await GET(request('wrong'))).status).toBe(401); expect(syncGrandirIntake).not.toHaveBeenCalled();
  });
  it('rejects missing family configuration', async () => {
    delete process.env.CALENDAR_INBOUND_FAMILY_ID;
    expect((await GET(request())).status).toBe(503); expect(syncGrandirIntake).not.toHaveBeenCalled();
  });
  it.each(['2026-07-01T07:00:00Z', '2026-07-01T19:00:00Z', '2026-12-01T08:00:00Z', '2026-12-01T20:00:00Z'])('runs at the London slot: %s', async date => {
    jest.setSystemTime(new Date(date)); (syncGrandirIntake as jest.Mock).mockResolvedValue({ processed: 1, autoCreated: 0 });
    expect((await GET(request())).status).toBe(200); expect(syncGrandirIntake).toHaveBeenCalledWith('family');
  });
  it('skips other hours before accessing the nursery account', async () => {
    jest.setSystemTime(new Date('2026-10-07T08:00:00Z'));
    expect(await (await GET(request())).json()).toMatchObject({ skipped: expect.stringContaining('Outside') });
    expect(syncGrandirIntake).not.toHaveBeenCalled();
  });
  it('reports revoked access without a token, notice body or private exception', async () => {
    (syncGrandirIntake as jest.Mock).mockRejectedValue(new GrandirConnectionError('RECONNECT_REQUIRED', 'private provider message'));
    expect(await (await GET(request())).json()).toEqual({ ok: false, reason: 'RECONNECT_REQUIRED' });
    expect(console.error).toHaveBeenCalledWith('Grandir intake failed', { reason: 'RECONNECT_REQUIRED' });
  });
});
