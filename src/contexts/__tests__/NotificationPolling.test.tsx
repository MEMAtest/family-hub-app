import { act, render } from '@testing-library/react';
import { NotificationProvider } from '../NotificationContext';
import notificationService from '@/services/notificationService';

jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: (state: unknown) => unknown) => selector({ databaseStatus: { familyId: 'home', connected: true } }) }));
jest.mock('@/services/notificationService', () => ({ __esModule: true, default: {
  checkPermission: jest.fn(() => ({ granted: false, denied: false, prompt: true })),
  getSettings: jest.fn(async () => ({})), getNotifications: jest.fn(async () => []),
  subscribe: jest.fn(() => jest.fn()), setFamilyId: jest.fn(async () => undefined),
  refreshActiveNotifications: jest.fn(), syncFromDatabase: jest.fn(async () => undefined),
} }));

let visibility: jest.SpyInstance, online: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('visible');
  online = jest.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
});
afterEach(() => { visibility.mockRestore(); online.mockRestore(); jest.useRealTimers(); });

test('hidden/offline tabs stop database polling, visible/online tabs catch up once, and unmount removes listeners', async () => {
  const screen = render(<NotificationProvider>App</NotificationProvider>);
  await act(async () => {});
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue('hidden');
  await act(async () => { jest.advanceTimersByTime(120_000); window.dispatchEvent(new Event('focus')); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(1);
  visibility.mockReturnValue('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(2);
  online.mockReturnValue(false);
  await act(async () => { jest.advanceTimersByTime(120_000); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(2);
  online.mockReturnValue(true);
  await act(async () => { window.dispatchEvent(new Event('online')); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(3);
  screen.unmount();
  await act(async () => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('online')); document.dispatchEvent(new Event('visibilitychange')); jest.advanceTimersByTime(60_000); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(3);
});

test('an app initially hidden loads cached state without a remote notification fetch, then catches up when visible', async () => {
  visibility.mockReturnValue('hidden');
  const screen = render(<NotificationProvider>App</NotificationProvider>);
  await act(async () => {});
  expect(notificationService.getNotifications).toHaveBeenCalled();
  expect(notificationService.syncFromDatabase).not.toHaveBeenCalled();
  visibility.mockReturnValue('visible');
  await act(async () => { document.dispatchEvent(new Event('visibilitychange')); });
  expect(notificationService.syncFromDatabase).toHaveBeenCalledTimes(1);
  screen.unmount();
});
