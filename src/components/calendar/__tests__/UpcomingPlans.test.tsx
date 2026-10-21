import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UpcomingPlans } from '../UpcomingPlans';
import type { CalendarEvent } from '@/types/calendar.types';
const event = { id: 'club', title: 'Club', person: 'p', date: '2026-10-21', time: '15:30', duration: 60, recurring: 'weekly', isRecurring: true, type: 'sport', priority: 'medium', status: 'confirmed', cost: 0, createdAt: new Date(), updatedAt: new Date() } as CalendarEvent;
const props = { events: [event], tasks: [], date: '2026-10-21', people: [{ id: 'p', name: 'Ade' }] as any, hidden: [], ready: true, onPreference: jest.fn().mockResolvedValue(undefined), onOpen: jest.fn(), onComplete: jest.fn() };
beforeEach(() => jest.clearAllMocks());
test('hides only the occurrence without cancelling or completing the plan', async () => {
  render(<UpcomingPlans {...props} />);
  fireEvent.click(screen.getByRole('button', { name: 'Hide Club from Coming up' }));
  await waitFor(() => expect(props.onPreference).toHaveBeenCalledWith({ action: 'hide', occurrenceId: 'club:2026-10-21' }));
  expect(props.onOpen).not.toHaveBeenCalled();
  expect(props.onComplete).not.toHaveBeenCalled();
});
test('can show and restore a hidden occurrence', async () => {
  render(<UpcomingPlans {...props} hidden={['club:2026-10-21']} />);
  expect(screen.queryByRole('button', { name: 'Restore Club' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show hidden (1)' }));
  fireEvent.click(screen.getByRole('button', { name: 'Restore Club' }));
  await waitFor(() => expect(props.onPreference).toHaveBeenCalledWith({ action: 'restore', occurrenceId: 'club:2026-10-21' }));
});

test('hidden plans beyond eight visible entries remain restorable', () => {
  const events = Array.from({ length: 10 }, (_, index) => ({ ...event, id: `plan-${index}`, title: `Plan ${index}`, time: `${String(index + 8).padStart(2, '0')}:00` }));
  render(<UpcomingPlans {...props} events={events} hidden={['plan-9:2026-10-21']} />);
  fireEvent.click(screen.getByRole('button', { name: 'Show hidden (1)' }));
  expect(screen.getByRole('button', { name: 'Restore Plan 9' })).toBeVisible();
});

test('retains attendee confirmation for an imported school meeting', () => {
  render(<UpcomingPlans {...props} events={[{ ...event, title: 'PTA meeting', source: 'gmail-school-email', sourceId: 'school-message', metadata: { schoolAssignment: { attendeeStatus: 'needs_confirmation' } } }]} />);
  expect(screen.getByText(/Attendee to confirm/i)).toBeVisible();
});
