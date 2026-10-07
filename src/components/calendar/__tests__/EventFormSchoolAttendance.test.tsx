import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { CalendarEvent } from '@/types/calendar.types';
import EventForm from '../EventForm';

jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: any) => selector({ databaseStatus: { familyId: 'family' } }) }));
jest.mock('../EventSourceDetails', () => ({ __esModule: true, default: () => null }));
jest.mock('@/components/common/AIEnhancedField', () => ({ __esModule: true, default: ({ id, value, onChange }: any) =>
  <input id={id} value={value} onChange={(event) => onChange(event.target.value)} /> }));
const people = [{ id: 'askia', name: 'Askia', role: 'Child', color: '#147c72', icon: 'A' },
  { id: 'amari', name: 'Amari', role: 'Child', color: '#147c72', icon: 'A' },
  { id: 'parent', name: 'Ademola', role: 'Parent', color: '#147c72', icon: 'A' }];
const event: CalendarEvent = { id: 'legacy-pta', title: 'PTA AGM', person: 'askia', sourceId: 'intake',
  source: 'gmail-school-email', date: '2026-10-07', time: '00:00', duration: 1439, type: 'education', recurring: 'none',
  cost: 0, priority: 'medium', status: 'confirmed', isRecurring: false,
  createdAt: new Date('2026-10-06'), updatedAt: new Date('2026-10-06'), metadata: {
    schoolAssignment: { concernedMemberIds: ['amari'], attendeePersonId: null, attendeeStatus: 'needs_confirmation' },
  } };
const props = () => ({ isOpen: true, people, templates: [], onClose: jest.fn(), onSave: jest.fn(), onUpdate: jest.fn().mockResolvedValue(true) });
describe('legacy adult school event form attendance', () => {
  it('clears only local selection and blocks save until an adult is explicitly selected', async () => {
    const actions = props();
    render(<EventForm {...actions} event={event} />);
    const select = screen.getByRole('combobox', { name: 'Adult attendee' });
    await waitFor(() => expect(select).toHaveValue(''));
    expect(select).not.toHaveTextContent('Askia');
    expect(select).not.toHaveTextContent('Amari');
    expect(event.person).toBe('askia');
    expect(actions.onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update Event' }));
    expect(screen.getByText('Choose the adult attending')).toBeVisible();
    expect(actions.onUpdate).not.toHaveBeenCalled();
    fireEvent.change(select, { target: { value: 'parent' } });
    expect(actions.onUpdate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Update Event' }));
    await waitFor(() => expect(actions.onUpdate).toHaveBeenCalledTimes(1));
    expect(actions.onUpdate).toHaveBeenCalledWith('legacy-pta', expect.objectContaining({ person: 'parent',
      date: event.date, time: event.time, metadata: event.metadata }));
    expect(event.person).toBe('askia');
  });
  it('keeps a durable manually selected adult in the form', async () => {
    const actions = props();
    render(<EventForm {...actions} event={{ ...event, person: 'parent', metadata: { ...event.metadata,
      assignmentOverride: { personId: 'parent', changedAt: '2026-10-07', changedBy: 'parent' } } }} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Adult attendee' })).toHaveValue('parent'));
    expect(actions.onUpdate).not.toHaveBeenCalled();
  });
  it('does not clear an ordinary child event assignment', async () => {
    render(<EventForm {...props()} event={{ ...event, title: 'School photo day', metadata: {} }} />);
    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Assigned to' })).toHaveValue('askia'));
  });
});
