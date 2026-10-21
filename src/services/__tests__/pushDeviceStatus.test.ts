jest.mock('../conflictDetectionService', () => ({ __esModule: true, default: {} }));
jest.mock('../emailService', () => ({ emailService: {} }));
import { webcrypto } from 'crypto';
import { TextEncoder } from 'util';
import { FamilyHubNotificationService } from '../notificationService';

let service: FamilyHubNotificationService;
let server: any;
let endpoint: string;
beforeEach(async () => {
  localStorage.clear();
  endpoint = 'https://push.example/private-endpoint';
  server = { configured: true, activeDevices: 2, currentDevice: { id: 'this-phone', isActive: true, lastSeenAt: '2026-10-21' } };
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
  Object.defineProperty(window.crypto, 'subtle', { configurable: true, value: webcrypto.subtle });
  Object.defineProperty(global, 'TextEncoder', { configurable: true, value: TextEncoder });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted' } });
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    getRegistrations: async () => [],
    getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint }) } }),
  } });
  global.fetch = jest.fn(async url => ({ ok: true, json: async () =>
    url === '/api/auth/me' ? { family: { id: 'family' }, familyMember: { id: 'ade' } } :
      String(url).includes('push-subscriptions') ? server : [],
  })) as jest.Mock;
  service = new FamilyHubNotificationService();
  await service.setFamilyId('family');
  (service as any).settings.enabled = true;
  (service as any).settings.channels.push = true;
});
afterEach(async () => { await service.setFamilyId(null); });

it('checks a fingerprint, never putting the endpoint in the diagnostics request', async () => {
  const state = await service.getDeviceDeliveryState();
  expect(state.subscriptionId).toBe('this-phone');
  const requests = (fetch as jest.Mock).mock.calls.filter(([url]) => String(url).includes('push-subscriptions'));
  expect(requests).toHaveLength(1);
  expect(requests[0][0]).toMatch(/^\/api\/families\/family\/push-subscriptions\?endpointHash=[a-f0-9]{64}$/);
  expect(requests[0][0]).not.toContain(endpoint);
  expect(requests[0][1]).toEqual({ cache: 'no-store' });
});

it('does not treat another active phone as this browser registration', async () => {
  server.currentDevice = null;
  const state = await service.getDeviceDeliveryState();
  expect(state.subscriptionId).toBeUndefined();
  expect(state.connection).toContain('not registered');
});

it('never treats old member-wide acceptance or a new provider acceptance as physical receipt', async () => {
  localStorage.setItem((service as any).storageKey('last-push-acceptance'), new Date().toISOString());
  expect((await service.getDeviceDeliveryState()).acceptance).toBe('No acceptance recorded on this device');
  service.recordPushAcceptance();
  expect((await service.getDeviceDeliveryState()).acceptance).toContain('device receipt unverified');
});

it('fails closed when the registration check is offline', async () => {
  (fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
  const state = await service.getDeviceDeliveryState();
  expect(state.subscriptionId).toBeUndefined();
  expect(state.connection).toContain('unavailable');
});
