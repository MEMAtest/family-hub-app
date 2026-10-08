jest.mock('@/lib/cronAuth', () => ({ isAuthorisedCronRequest: jest.fn() }));
jest.mock('@/lib/familyReminders', () => ({ runFamilyReminderSweep: jest.fn() }));
jest.mock('@/lib/binCollections', () => ({ syncBinCollections: jest.fn().mockResolvedValue({ status: 'connected' }) }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ body, status: init?.status ?? 200 }) } }));
import { GET } from './route';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { runFamilyReminderSweep } from '@/lib/familyReminders';
import { syncBinCollections } from '@/lib/binCollections';
const original = process.env.CALENDAR_INBOUND_FAMILY_ID;
beforeEach(() => { jest.resetAllMocks(); process.env.CALENDAR_INBOUND_FAMILY_ID = 'family'; (isAuthorisedCronRequest as jest.Mock).mockReturnValue(true); (syncBinCollections as jest.Mock).mockResolvedValue({ status: 'connected' }); });
afterAll(() => { if (original === undefined) delete process.env.CALENDAR_INBOUND_FAMILY_ID; else process.env.CALENDAR_INBOUND_FAMILY_ID = original; });
it('rejects unauthorized requests without planning or dispatch', async () => {
  (isAuthorisedCronRequest as jest.Mock).mockReturnValue(false);
  expect((await GET({} as any) as any).status).toBe(401); expect(runFamilyReminderSweep).not.toHaveBeenCalled();
});
it('fails closed when no household is configured', async () => {
  delete process.env.CALENDAR_INBOUND_FAMILY_ID;
  expect((await GET({} as any) as any).status).toBe(503); expect(runFamilyReminderSweep).not.toHaveBeenCalled();
});
it('dispatches only the configured household and reports failures honestly', async () => {
  (runFamilyReminderSweep as jest.Mock).mockResolvedValue({ created: 2, pushAccepted: 0, deliveryConfirmed: false });
  expect((await GET({} as any) as any).body.reminders.deliveryConfirmed).toBe(false);
  expect(runFamilyReminderSweep).toHaveBeenCalledWith('family');
  expect(syncBinCollections).toHaveBeenCalledWith('family');
  (runFamilyReminderSweep as jest.Mock).mockRejectedValue(new Error('database unavailable'));
  expect((await GET({} as any) as any).status).toBe(503);
});
it('does not block other household reminders when the council is unavailable', async () => {
  (syncBinCollections as jest.Mock).mockRejectedValue(new Error('Council unavailable'));
  (runFamilyReminderSweep as jest.Mock).mockResolvedValue({ created: 0 });
  expect((await GET({} as any) as any).body.bins.status).toBe('unavailable');
  expect(runFamilyReminderSweep).toHaveBeenCalledWith('family');
});
