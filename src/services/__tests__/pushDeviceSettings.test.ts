jest.mock('../conflictDetectionService', () => ({ __esModule: true, default: {} }));
jest.mock('../emailService', () => ({ emailService: {} }));
import { FamilyHubNotificationService } from '../notificationService';

let service: FamilyHubNotificationService;
let current: any;
let registration: any;
const oldEnvironment = process.env.NODE_ENV;
const makeSubscription = (endpoint: string): any => ({ endpoint,
  toJSON: () => ({ endpoint, keys: { p256dh: 'test-key', auth: 'test-auth' } }),
  unsubscribe: jest.fn(async () => { current = null; return true; }),
});
const settingsKey = 'family-hub:family:ade:notification-settings';
beforeEach(async () => {
  (process.env as any).NODE_ENV = 'test';
  localStorage.clear();
  current = makeSubscription('https://push.example/old-device');
  registration = { pushManager: {
    getSubscription: jest.fn(async () => current),
    subscribe: jest.fn(async () => { current = makeSubscription('https://push.example/fresh-device'); return current; }),
  } };
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: {
    getRegistrations: async () => [], getRegistration: jest.fn(async () => registration),
  } });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: function () {} });
  Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted', requestPermission: jest.fn() } });
  global.fetch = jest.fn(async url => ({ ok: true, json: async () =>
    url === '/api/auth/me' ? { family: { id: 'family' }, familyMember: { id: 'ade' } } :
      url === '/api/push/vapid-public-key' ? { configured: true, publicKey: 'dGVzdA' } : [],
  })) as jest.Mock;
  service = new FamilyHubNotificationService();
  await service.setFamilyId('family');
  (service as any).serviceWorkerRegistration = registration;
  (fetch as jest.Mock).mockClear();
});
afterEach(async () => { await service.setFamilyId(null); (process.env as any).NODE_ENV = oldEnvironment; });

it.each(['push', 'all'])('awaits server deactivation before saving %s off, without revoking permission or unsubscribing', async mode => {
  let resolve!: (value: unknown) => void;
  (fetch as jest.Mock).mockImplementation(() => new Promise(done => { resolve = done; }));
  const previous = await service.getSettings();
  const pending = service.updateSettings(mode === 'push' ? { channels: { ...previous.channels, push: false } } : { enabled: false });
  for (let i = 0; i < 15; i++) await Promise.resolve();
  expect((await service.getSettings()).enabled).toBe(true);
  expect((await service.getSettings()).channels.push).toBe(true);
  expect(localStorage.getItem(settingsKey)).toBeNull();
  expect(fetch).toHaveBeenCalledWith('/api/families/family/push-subscriptions', {
    method: 'DELETE', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint: current.endpoint }),
  });
  resolve({ ok: true });
  const saved = await pending;
  expect(mode === 'push' ? saved.channels.push : saved.enabled).toBe(false);
  expect(JSON.parse(localStorage.getItem(settingsKey)!)).toEqual(saved);
  expect(current.unsubscribe).not.toHaveBeenCalled();
  expect(Notification.requestPermission).not.toHaveBeenCalled();
});

it.each([false, 'offline'])('does not save off after server failure: %p', async failure => {
  if (failure === 'offline') (fetch as jest.Mock).mockRejectedValue(new Error('Offline'));
  else (fetch as jest.Mock).mockResolvedValue({ ok: false, status: 503 });
  await expect(service.updateSettings({ enabled: false })).rejects.toThrow();
  expect((await service.getSettings()).enabled).toBe(true);
  expect(localStorage.getItem(settingsKey)).toBeNull();
  expect(current.unsubscribe).not.toHaveBeenCalled();
});

it('waits for an existing registration attempt before deactivating, preventing late reactivation', async () => {
  let finish!: () => void;
  (service as any).pushSubscriptionInFlight = new Promise<void>(done => { finish = done; });
  const pending = service.updateSettings({ enabled: false });
  for (let i = 0; i < 10; i++) await Promise.resolve();
  expect(fetch).not.toHaveBeenCalled();
  finish();
  await pending;
  expect((fetch as jest.Mock).mock.calls.map(([, options]) => options.method)).toEqual(['DELETE']);
});

it('does not claim a persisted off setting when local settings storage fails', async () => {
  const store = jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage full'); });
  try {
    await expect(service.updateSettings({ enabled: false })).rejects.toThrow('Storage full');
    expect((await service.getSettings()).enabled).toBe(true);
    expect(localStorage.getItem(settingsKey)).toBeNull();
  } finally { store.mockRestore(); }
});

it('refuses server device changes without an authenticated member, preserving other ownership', async () => {
  (service as any).personId = null;
  await expect(service.updateSettings({ enabled: false })).rejects.toThrow('Sign in as the intended member');
  expect(fetch).not.toHaveBeenCalled();
  expect(current.unsubscribe).not.toHaveBeenCalled();
  expect((await service.getSettings()).enabled).toBe(true);
});

it('does not re-register during or after a pending disable', async () => {
  (process.env as any).NODE_ENV = 'production';
  let resolve!: (value: unknown) => void;
  (fetch as jest.Mock).mockImplementation(() => new Promise(done => { resolve = done; }));
  const pending = service.updateSettings({ enabled: false });
  for (let i = 0; i < 15; i++) await Promise.resolve();
  const sync = service.syncPushSubscription();
  resolve({ ok: true });
  await pending;
  await sync;
  expect((fetch as jest.Mock).mock.calls.map(([, options]) => options.method)).toEqual(['DELETE']);
});

it('reconnects only the browser subscription under the current member, preserving all unrelated site data', async () => {
  (process.env as any).NODE_ENV = 'production';
  localStorage.setItem('calendarEvents', 'preserve-calendar');
  localStorage.setItem('family-hub:family:other:notification-settings', 'preserve-other-member');
  const previous = current;
  await service.reconnectPushDevice();
  expect(previous.unsubscribe).toHaveBeenCalledTimes(1);
  expect(registration.pushManager.subscribe).toHaveBeenCalledTimes(1);
  const calls = (fetch as jest.Mock).mock.calls;
  expect(calls[0]).toEqual(['/api/families/family/push-subscriptions', expect.objectContaining({ method: 'DELETE', body: JSON.stringify({ endpoint: previous.endpoint }) })]);
  const post = calls.find(([, options]) => options?.method === 'POST');
  expect(JSON.parse(post![1].body)).toMatchObject({ subscription: { endpoint: 'https://push.example/fresh-device' }, enabled: true });
  expect(JSON.parse(post![1].body)).not.toHaveProperty('personId');
  expect(localStorage.getItem('calendarEvents')).toBe('preserve-calendar');
  expect(localStorage.getItem('family-hub:family:other:notification-settings')).toBe('preserve-other-member');
  expect(Notification.requestPermission).not.toHaveBeenCalled();
});

it('does not subscribe or save when browser unsubscribe fails', async () => {
  (process.env as any).NODE_ENV = 'production';
  current.unsubscribe.mockResolvedValue(false);
  await expect(service.reconnectPushDevice()).rejects.toThrow('Could not replace');
  expect(registration.pushManager.subscribe).not.toHaveBeenCalled();
  expect(localStorage.getItem(settingsKey)).toBeNull();
});

it('reports reconnect rather than a destructive site reset on ownership conflict, with no saved changes', async () => {
  (process.env as any).NODE_ENV = 'production';
  (fetch as jest.Mock).mockImplementation(async (url, options) => ({
    ok: options?.method !== 'POST', status: options?.method === 'POST' ? 409 : 200,
    json: async () => ({ configured: true, publicKey: 'dGVzdA' }),
  }));
  await expect(service.reconnectPushDevice()).rejects.toThrow('Use Reconnect this device');
  expect(localStorage.getItem(settingsKey)).toBeNull();
});
