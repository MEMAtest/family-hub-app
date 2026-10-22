import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AddIncomeModal from './AddIncomeModal';

jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: (state: unknown) => unknown) => selector({ familyMembers: [], people: [] }) }));
test('validates expected dates and leaves a failed save open with the entered details', async () => {
  const save = jest.fn().mockRejectedValue(new Error('Connection unavailable'));
  const close = jest.fn();
  render(<AddIncomeModal isOpen onClose={close} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Income Name *'), { target: { value: 'Consulting' } });
  fireEvent.change(screen.getByLabelText('Amount (£) *'), { target: { value: '1500' } });
  fireEvent.click(screen.getByLabelText('Recurring income'));
  fireEvent.click(screen.getByRole('button', { name: 'Save income plan' }));
  expect(screen.getByText('Choose the expected payment date')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
  fireEvent.change(screen.getByLabelText('Expected payment date *'), { target: { value: '2026-11-15' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save income plan' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Connection unavailable');
  expect(screen.getByLabelText('Income Name *')).toHaveValue('Consulting');
  expect(close).not.toHaveBeenCalled();
});
test('prevents repeated saves while the persisted request is pending', async () => {
  let finish!: () => void;
  const save = jest.fn(() => new Promise<void>(resolve => { finish = resolve; }));
  render(<AddIncomeModal isOpen onClose={jest.fn()} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Income Name *'), { target: { value: 'Monthly pay' } });
  fireEvent.change(screen.getByLabelText('Amount (£) *'), { target: { value: '3000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save income plan' }));
  expect(screen.getByRole('button', { name: 'Saving...' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Close income plan' })).toBeDisabled();
  expect(save).toHaveBeenCalledTimes(1);
  finish();
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save income plan' })).toBeEnabled());
});
