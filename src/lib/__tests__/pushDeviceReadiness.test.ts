import { pushDeviceReadiness } from '../pushDeviceReadiness';
const ready = { secure: true, supported: true, permission: 'granted' as NotificationPermission,
  enabled: true, subscribed: true, server: { configured: true, activeDevices: 2,
    currentDevice: { id: 'this-phone', isActive: true, lastSeenAt: '2026-10-21' } } };

it('identifies only this browser and keeps closed-app receipt unverified', () => {
  expect(pushDeviceReadiness(ready)).toEqual({ subscriptionId: 'this-phone', connection: expect.stringContaining('still needs a phone check') });
});
it.each([
  [{ secure: false }, 'HTTPS'], [{ supported: false }, 'Home Screen'],
  [{ permission: 'denied' }, 'blocked'], [{ permission: 'default' }, 'allow'],
  [{ enabled: false }, 'Enable'], [{ subscribed: false }, 'no push subscription'],
  [{ server: null }, 'unavailable'],
  [{ server: { ...ready.server, configured: false } }, 'not configured'],
  [{ server: { ...ready.server, currentDevice: null } }, 'not registered'],
  [{ server: { ...ready.server, currentDevice: { ...ready.server.currentDevice, isActive: false } } }, 'expired'],
])('does not allow a targeted test when readiness has a gap: %p', (change, message) => {
  const state = pushDeviceReadiness({ ...ready, ...change } as typeof ready);
  expect(state.subscriptionId).toBeUndefined();
  expect(state.connection).toContain(message);
});
