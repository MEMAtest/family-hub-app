import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import NotificationBell from '../NotificationBell';

const requestPermission = jest.fn(() => new Promise(() => {}));
jest.mock('@/contexts/NotificationContext', () => ({
  useNotifications: () => ({ unreadCount: 64, permission: { prompt: true }, requestPermission }),
}));
jest.mock('../NotificationCenter', () => ({
  __esModule: true,
  default: ({ isOpen }: { isOpen: boolean }) => isOpen ? <div role="dialog">Notifications</div> : null,
}));

it('opens saved reminders without requesting or waiting for phone notification permission', () => {
  render(<NotificationBell />);
  fireEvent.click(screen.getByRole('button', { name: 'Open notifications' }));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(requestPermission).not.toHaveBeenCalled();
});
