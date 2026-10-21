jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/webPush', () => ({ sendMemberPushNotification: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: any) => ({ body, status: init?.status ?? 200 }) } }));
import { sendMemberPushNotification } from '@/lib/webPush';
import { POST } from './route';

const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'ade' };
const request = (body: unknown) => ({ json: async () => body });
beforeEach(() => jest.clearAllMocks());

it('requires a linked member before attempting private delivery', async () => {
  expect((await (POST as any)(request({ subscriptionId: 'phone' }), context, { familyMemberId: null })).status).toBe(403);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it('requires an explicit device, never falling back to all member phones', async () => {
  expect((await (POST as any)(request({}), context, auth)).status).toBe(400);
  expect(sendMemberPushNotification).not.toHaveBeenCalled();
});

it.each([
  [{ sent: 1, failed: 0, inactive: 0, configured: true }, 'provider_accepted'],
  [{ sent: 0, failed: 0, inactive: 0, configured: false }, 'not_configured'],
  [{ sent: 0, failed: 0, inactive: 1, configured: true }, 'subscription_expired'],
  [{ sent: 0, failed: 1, inactive: 0, configured: true }, 'provider_failed'],
  [{ sent: 0, failed: 0, inactive: 0, configured: true }, 'device_not_registered'],
])('reports %p without claiming receipt', async (result, status) => {
  (sendMemberPushNotification as jest.Mock).mockResolvedValue(result);
  const response = await (POST as any)(request({ subscriptionId: 'phone', personId: 'other' }), context, auth);
  expect(sendMemberPushNotification).toHaveBeenCalledWith('family', 'ade', expect.any(Object), 'phone');
  expect(response.body).toEqual(expect.objectContaining({ status, deviceReceipt: 'unverified', success: result.sent > 0 }));
});
