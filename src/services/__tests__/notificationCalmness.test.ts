jest.mock('../conflictDetectionService', () => ({ __esModule: true, default: {} }));
jest.mock('../emailService', () => ({ emailService: {} }));

import { FamilyHubNotificationService } from '../notificationService';
import type { InAppNotification } from '@/types/notification.types';

const notice = (id: string, extra: Partial<InAppNotification> = {}): InAppNotification => ({
  id, title: id, message: id, type: 'reminder', category: 'event', priority: 'medium',
  read: false, actionRequired: true, timestamp: new Date(), ...extra,
});
let remote: InAppNotification[];
let service: FamilyHubNotificationService;
const flush = async () => { for (let i = 0; i < 10; i++) await Promise.resolve(); };

beforeEach(async () => {
  localStorage.clear();
  jest.useFakeTimers().setSystemTime(new Date('2026-10-21T12:00:00Z'));
  remote = [];
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistrations: async () => [] } });
  global.fetch = jest.fn(async (url, options) => ({ ok: true, json: async () =>
    url === '/api/auth/me' ? { family: { id: 'family' }, familyMember: { id: 'ade' } } :
      options?.method === 'POST' ? JSON.parse(String(options.body)) : remote,
  })) as jest.Mock;
  service = new FamilyHubNotificationService();
  await service.setFamilyId('family');
});

afterEach(async () => { await service.setFamilyId(null); jest.useRealTimers(); });

it('filters expiry, snooze and other claimed recipients; unclaimed watches never increase unread', async () => {
  remote = [notice('active'), notice('read', { read: true }),
    notice('expired', { expiresAt: new Date(Date.now() - 1) }),
    notice('snoozed', { snoozedUntil: new Date(Date.now() + 60_000) }),
    notice('private', { recipientPersonId: 'angela' }),
    notice('unclaimed', { recipientPersonId: 'child', metadata: { recipientClaimed: false, canAct: false } })];
  await service.syncFromDatabase();
  expect((await service.getNotifications()).map(n => n.id)).toEqual(['active', 'read', 'unclaimed']);
  expect(service.getUnreadCount()).toBe(1);
  await expect(service.snoozeNotification('unclaimed', new Date(Date.now() + 10_000))).rejects.toThrow('named recipient');
});

it('keeps dedupe receipts after dismissal and a fresh service reload', async () => {
  const data = notice('ignored', { metadata: { dedupeKey: 'brain-overdue-task-1' } });
  const first = await service.showNotification(data);
  await flush();
  await service.clearNotification(first.id);
  await flush();
  await service.setFamilyId(null);
  service = new FamilyHubNotificationService();
  await service.setFamilyId('family');
  (fetch as jest.Mock).mockClear();
  await service.showNotification(data);
  expect(await service.getNotifications()).toEqual([]);
  expect(fetch).not.toHaveBeenCalled();
});

it('does not recreate a snoozed notice or reset its read state', async () => {
  const data = notice('ignored', { read: true, metadata: { dedupeKey: 'once' } });
  const first = await service.showNotification(data);
  await flush();
  await service.snoozeNotification(first.id, new Date(Date.now() + 60_000));
  (fetch as jest.Mock).mockClear();
  await service.showNotification(data);
  expect(fetch).not.toHaveBeenCalled();
  expect(service.getUnreadCount()).toBe(0);
});

it('removes server-backed cache entries omitted from a later authoritative sync', async () => {
  remote = [notice('dismissed-elsewhere')];
  await service.syncFromDatabase();
  remote = [];
  await service.syncFromDatabase();
  expect(await service.getNotifications()).toEqual([]);
});

it('updates subscribers at expiry and snooze boundaries without a reload or network request', async () => {
  remote = [notice('expires', { expiresAt: new Date(Date.now() + 10_000) }),
    notice('wakes', { snoozedUntil: new Date(Date.now() + 20_000) })];
  await service.syncFromDatabase();
  const updates = jest.fn();
  const unsubscribe = service.subscribe(updates);
  (fetch as jest.Mock).mockClear();
  jest.advanceTimersByTime(10_000);
  expect(updates).toHaveBeenLastCalledWith([]);
  jest.advanceTimersByTime(10_000);
  expect(updates.mock.calls[updates.mock.calls.length - 1][0].map((n: InAppNotification) => n.id)).toEqual(['wakes']);
  expect(fetch).not.toHaveBeenCalled();
  unsubscribe();
});

it('does not replay overdue browser timers or previously delivered occurrence timers', async () => {
  const browser = jest.fn();
  Object.defineProperty(window, 'Notification', { configurable: true, value: browser });
  Object.defineProperty(browser, 'permission', { configurable: true, value: 'granted' });
  const overdue = { id: 'late', eventId: 'event', type: 'notification' as const, status: 'pending' as const,
    retryCount: 0, scheduledFor: new Date(Date.now() - 6 * 60_000), metadata: { title: 'Late', body: 'Old' } };
  await (service as any).deliverBrowserReminder(overdue);
  expect(browser).not.toHaveBeenCalled();
  const due = { ...overdue, id: 'due', status: 'pending', scheduledFor: new Date() };
  await (service as any).deliverBrowserReminder(due);
  expect(browser).toHaveBeenCalledTimes(1);
  await service.setFamilyId(null);
  await service.setFamilyId('family');
  await (service as any).deliverBrowserReminder({ ...due, id: 'new-id', status: 'pending' });
  expect(browser).toHaveBeenCalledTimes(1);
});

it.each([true, false])('dedupes timers in two already-bound tabs (Web Locks: %s)', async locks => {
  const browser = jest.fn();
  Object.defineProperty(window, 'Notification', { configurable: true, value: browser });
  Object.defineProperty(browser, 'permission', { configurable: true, value: 'granted' });
  const lock = jest.fn(async (_key, deliver) => deliver());
  Object.defineProperty(navigator, 'locks', { configurable: true, value: locks ? { request: lock } : undefined });
  const otherTab = new FamilyHubNotificationService();
  await otherTab.setFamilyId('family');
  const reminder = { id: 'timer', eventId: 'occurrence', type: 'notification', status: 'pending',
    retryCount: 0, scheduledFor: new Date(), metadata: { title: 'Due', body: 'Due' } };
  await (service as any).deliverBrowserReminder({ ...reminder });
  await (otherTab as any).deliverBrowserReminder({ ...reminder });
  expect(browser).toHaveBeenCalledTimes(1);
  if (locks) {
    expect(lock).toHaveBeenCalledTimes(2);
    expect(lock.mock.calls[0][0]).toBe(lock.mock.calls[1][0]);
  }
  await otherTab.setFamilyId(null);
  Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined });
});
