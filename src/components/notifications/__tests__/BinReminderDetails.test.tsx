import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BinReminderDetails from '../BinReminderDetails';

it('shows a collection read-only without any travel editor or invented collection time', () => {
  const onClose = jest.fn();
  render(<BinReminderDetails collection={{ date: '2026-10-09', services: ['Food waste', 'Mixed recycling'], verified: true }} onClose={onClose} />);
  expect(screen.getByRole('dialog', { name: 'Bin collection' })).toBeInTheDocument();
  expect(screen.getByText('Friday 9 October')).toBeInTheDocument();
  expect(screen.getByText('Food waste')).toBeInTheDocument();
  expect(screen.getByText('Mixed recycling')).toBeInTheDocument();
  expect(screen.getByText('The council calendar does not publish a collection time.')).toBeInTheDocument();
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close collection details' }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it('does not claim pending council data is verified', () => {
  render(<BinReminderDetails collection={{ date: '2026-10-09', services: ['Food waste'], verified: false }} onClose={jest.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('Council verification is pending.');
});
