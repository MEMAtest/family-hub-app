import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QuickPresenceDialog } from '@/components/calendar/QuickPresenceDialog';

const people = [
  { id: 'angela', name: 'Angela', color: '#147c72', icon: 'A', role: 'Parent' },
  { id: 'ade', name: 'Ade', color: '#3855c8', icon: 'A', role: 'Parent' },
];

describe('QuickPresenceDialog', () => {
  it('adds Angela going to the office with a one-tap morning duration', async () => {
    const save = jest.fn().mockResolvedValue('created');
    render(<QuickPresenceDialog people={people} date="2026-10-20" onClose={jest.fn()} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Morning' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to today' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).toMatchObject({
      title: 'Going to the office',
      person: 'angela',
      date: '2026-10-20',
      time: '09:00',
      duration: 240,
      location: 'Office',
      workStatus: { type: 'office' },
    });
  });

  it('requires a name for another place and saves the custom location', async () => {
    const save = jest.fn().mockResolvedValue('created');
    render(<QuickPresenceDialog people={people} date="2026-10-20" onClose={jest.fn()} onSave={save} />);
    fireEvent.click(screen.getByRole('button', { name: 'Other place' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to today' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add the place name.');
    fireEvent.change(screen.getByRole('textbox', { name: 'Custom place' }), { target: { value: 'Bromley office' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add to today' }));
    await waitFor(() => expect(save).toHaveBeenCalled());
    expect(save.mock.calls[0][0]).toMatchObject({ title: 'At Bromley office', location: 'Bromley office' });
  });

  it('uses accessible mobile time controls for a custom range', () => {
    render(<QuickPresenceDialog people={people} date="2026-10-20" onClose={jest.fn()} onSave={jest.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Custom time' }));
    expect(screen.getByLabelText('Presence start time')).toHaveAttribute('step', '900');
    expect(screen.getByLabelText('Presence end time')).toHaveAttribute('step', '900');
  });

  it('defaults to an adult when children are listed first and updates the date action label', () => {
    render(<QuickPresenceDialog people={[
      { id: 'amari', name: 'Amari', color: '#333', icon: 'A', role: 'Child', ageGroup: 'Child' },
      ...people,
    ]} date="2026-10-20" onClose={jest.fn()} onSave={jest.fn()} />);
    expect(screen.getByRole('combobox', { name: 'Presence person' })).toHaveValue('angela');
    fireEvent.change(screen.getByLabelText('Presence date'), { target: { value: '2026-10-21' } });
    expect(screen.getByRole('button', { name: 'Add location' })).toBeVisible();
  });
});
