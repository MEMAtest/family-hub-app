import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import WorkStatusManager from '../WorkStatusManager';
import type { CalendarEvent } from '@/types/calendar.types';

const people = [{ id: 'angela', name: 'Angela', color: '#147c72', icon: 'A', role: 'Parent', ageGroup: 'Adult' },
  { id: 'ade', name: 'Ade', color: '#147c72', icon: 'A', role: 'Parent', ageGroup: 'Adult' }];
const event: CalendarEvent = { id: 'wedding', title: 'Man lin Wedding', person: 'angela', type: 'personal',
  date: '2026-10-08', time: '06:00', duration: 60, status: 'confirmed', priority: 'medium',
  recurring: 'none', isRecurring: false, cost: 0, notes: 'Original context',
  metadata: { travel: { departureDate: '2026-10-08', destination: 'Dusseldorf' } },
  createdAt: new Date('2026-10-07T07:00:00Z'), updatedAt: new Date('2026-10-07T07:00:00Z'),
};
it('edits travel details without replacing the wedding identity or inventing departure', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  render(<WorkStatusManager event={event} people={people} events={[]} onClose={jest.fn()} onAddWorkEvent={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save travel details' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  const draft = save.mock.calls[0][0];
  expect(draft.title).toBe('Man lin Wedding'); expect(draft.type).toBe('personal');
  expect(draft.time).toBe('06:00'); expect(draft.travel.departureTime).toBeUndefined();
  expect(draft.travel.transportation).toBe('other');
  expect(draft.travel.destination).toBe('Dusseldorf'); expect(draft.notes).toBe('Original context');
});
it('does not close or claim success when save fails', async () => {
  const close = jest.fn();
  render(<WorkStatusManager event={event} people={people} events={[]} onClose={close} onAddWorkEvent={jest.fn().mockRejectedValue(new Error('Save failed'))} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save travel details' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save failed');
  expect(close).not.toHaveBeenCalled();
});
it('preserves known transport, recurrence, cost and disabled reminder preferences on edits', async () => {
  const save = jest.fn().mockResolvedValue(undefined);
  const recurring: CalendarEvent = { ...event, recurring: 'weekly', isRecurring: true, cost: 99, priority: 'high',
    metadata: { travel: { departureDate: '2026-10-08', transportation: 'train' } },
    reminderPreferences: { enabled: false, push: false } };
  render(<WorkStatusManager event={recurring} people={people} events={[]} onClose={jest.fn()} onAddWorkEvent={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Save travel details' }));
  await waitFor(() => expect(save).toHaveBeenCalled());
  expect(save.mock.calls[0][0]).toMatchObject({ title: event.title, type: 'personal', cost: 99,
    isRecurring: true, recurring: 'weekly', priority: 'high', travel: { transportation: 'train' },
    reminderPreferences: { enabled: false, push: false } });
});
