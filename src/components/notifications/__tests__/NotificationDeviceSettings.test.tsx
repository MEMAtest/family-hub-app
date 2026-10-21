jest.mock('@/contexts/NotificationContext', () => ({ useNotifications: jest.fn() }));
jest.mock('@/contexts/familyHub/AppViewContext', () => ({ useAppView: () => ({ setView: jest.fn() }) }));
jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: any) => selector({
  databaseStatus: { familyId: 'family' }, people: [], setActiveBrainProject: jest.fn(),
}) }));
jest.mock('@/components/calendar/WorkStatusManager', () => ({ __esModule: true, default: () => null }));
jest.mock('../BinReminderDetails', () => ({ __esModule: true, default: () => null }));
jest.mock('@/services/notificationService', () => ({ __esModule: true, default: {
  updateSettings: jest.fn(), requestPermission: jest.fn(), reconnectPushDevice: jest.fn(), getDeviceDeliveryState: jest.fn(),
} }));
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useNotifications } from '@/contexts/NotificationContext';
import notificationService from '@/services/notificationService';
import NotificationCenter from '../NotificationCenter';

const mirrorSettings = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  (useNotifications as jest.Mock).mockReturnValue({ notifications: [], unreadCount: 0,
    settings: { enabled: true, channels: { push: true, browser: true }, quietHours: { enabled: false } },
    updateSettings: mirrorSettings,
  });
  (notificationService.getDeviceDeliveryState as jest.Mock).mockResolvedValue({ connection: 'Check device', acceptance: 'Unverified' });
});

const openSettings = () => {
  render(<NotificationCenter isOpen onClose={() => {}} />);
  fireEvent.click(screen.getByTitle('Settings'));
};

it('shows disable failure without claiming off or updating the context setting', async () => {
  (notificationService.updateSettings as jest.Mock).mockRejectedValue(new Error('Could not disable this device on the server. Nothing was saved; reconnect and retry.'));
  openSettings();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Push notifications to this device' }));
  await screen.findByText(/Could not disable this device on the server/);
  expect(screen.getByRole('checkbox', { name: 'Push notifications to this device' })).toBeChecked();
  expect(mirrorSettings).not.toHaveBeenCalled();
  expect(screen.queryByText(/Push is off for your member/)).not.toBeInTheDocument();
});

it('does not report off until the service has confirmed the server change', async () => {
  let finish!: () => void;
  (notificationService.updateSettings as jest.Mock).mockReturnValue(new Promise<void>(done => { finish = done; }));
  openSettings();
  fireEvent.click(screen.getByRole('checkbox', { name: 'Push notifications to this device' }));
  expect(screen.getByRole('checkbox', { name: 'Push notifications to this device' })).toBeDisabled();
  expect(mirrorSettings).not.toHaveBeenCalled();
  finish();
  await screen.findByText(/Push is off for your member/);
  expect(mirrorSettings).toHaveBeenCalledWith({});
});

it('offers an explicit reconnect, surfacing failure without any success claim', async () => {
  (notificationService.reconnectPushDevice as jest.Mock).mockRejectedValue(new Error('Could not replace this browser push subscription.'));
  openSettings();
  expect(notificationService.reconnectPushDevice).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Reconnect this device' }));
  await screen.findByText('Could not replace this browser push subscription.');
  await waitFor(() => expect(screen.getByRole('button', { name: 'Reconnect this device' })).not.toBeDisabled());
  expect(mirrorSettings).not.toHaveBeenCalled();
});
