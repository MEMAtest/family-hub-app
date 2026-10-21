import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { HomeIntelligencePanel } from '../HomeIntelligencePanel';
import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';

let mockTasks: CalendarTask[];
let mockEvents: CalendarEvent[];
let mockNotifications: any[];
let durableStates: any[];
let failWrite: boolean;
const mockRefreshTasks = jest.fn();
const mockOpenEditForm = jest.fn();
const mockSetView = jest.fn();
const mockApplyReminderAction = jest.fn();
const mockMembers = [{ id: 'ade', name: 'Ade', role: 'Parent', color: 'green', icon: '' }];
const mockStore = { databaseStatus: { familyId: 'home' }, budgetData: {}, propertyTasks: [] };
jest.mock('@/contexts/familyHub/CalendarContext', () => ({ useCalendarContext: () => ({
  tasks: mockTasks, events: mockEvents, refreshTasks: mockRefreshTasks, openEditForm: mockOpenEditForm,
}) }));
jest.mock('@/contexts/familyHub/FamilyContext', () => ({ useFamilyContext: () => ({ members: mockMembers }) }));
jest.mock('@/contexts/familyHub/AppViewContext', () => ({ useAppView: () => ({ setView: mockSetView }) }));
jest.mock('@/store/familyStore', () => ({ useFamilyStore: (selector: any) => selector(mockStore) }));
jest.mock('@/contexts/NotificationContext', () => ({ useNotifications: () => ({ notifications: mockNotifications, applyReminderAction: mockApplyReminderAction }) }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-09T07:00:00Z'));
  jest.clearAllMocks();
  durableStates = []; failWrite = false; mockEvents = []; mockNotifications = [];
  mockTasks = [{ id: 'kit', title: 'Bring PE kit', assignees: [], assignedDate: '2026-10-08', dueDate: '2026-10-09',
    taskType: 'homework', priority: 'medium', createdAt: new Date(), updatedAt: new Date() }];
  global.fetch = jest.fn(async (_url: any, options?: RequestInit) => {
    if (String(_url).endsWith('/inbox')) return { ok: true, json: async () => ({ intakes: [] }) } as Response;
    if (options?.method === 'POST') {
      if (failWrite) return { ok: false, json: async () => ({ error: 'Write failed' }) } as Response;
      const body = JSON.parse(options.body as string);
      const state = { taskId: body.taskId, resolution: body.action === 'not_needed' ? 'not_needed' : null, snoozedUntil: body.until };
      durableStates = [state];
      return { ok: true, json: async () => state } as Response;
    }
    return { ok: true, json: async () => durableStates } as Response;
  });
});
afterEach(() => jest.useRealTimers());
const ready = async () => { await waitFor(() => {
  expect(screen.queryByText('Checking school and nursery updates...')).not.toBeInTheDocument();
  expect(screen.queryByText('Checking personal task reminders...')).not.toBeInTheDocument();
}); };

it('snoozes a real task for an hour, reloads its personal state and wakes it without completing it', async () => {
  const view = render(<HomeIntelligencePanel />); await ready();
  fireEvent.change(screen.getByLabelText('Personal snooze duration'), { target: { value: '1h' } });
  const actionTime = Date.now();
  fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Bring PE kit' })).not.toBeInTheDocument());
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls.find(call => call[1]?.method === 'POST')[1].body)).toEqual({
    taskId: 'kit', action: 'snooze', until: new Date(actionTime + 60 * 60_000).toISOString(),
  });
  expect(mockRefreshTasks).not.toHaveBeenCalled();
  view.unmount(); render(<HomeIntelligencePanel />); await ready();
  expect(screen.queryByRole('heading', { name: 'Bring PE kit' })).not.toBeInTheDocument();
  act(() => jest.advanceTimersByTime(60 * 60_000));
  expect(screen.getByText('Bring PE kit')).toBeInTheDocument();
});

it('persists Not needed per task and does not disguise it as completion', async () => {
  render(<HomeIntelligencePanel />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Not needed' }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Bring PE kit' })).not.toBeInTheDocument());
  expect(durableStates[0]).toMatchObject({ taskId: 'kit', resolution: 'not_needed' });
  expect(mockRefreshTasks).not.toHaveBeenCalled();
});

it('completes through the durable action endpoint and refreshes actual tasks only after success', async () => {
  render(<HomeIntelligencePanel />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
  await waitFor(() => expect(mockRefreshTasks).toHaveBeenCalledTimes(1));
  expect(JSON.parse((global.fetch as jest.Mock).mock.calls.find(call => call[1]?.method === 'POST')[1].body)).toEqual({ taskId: 'kit', action: 'complete' });
});

it('leaves failed actions visible and actionable with an error', async () => {
  failWrite = true;
  render(<HomeIntelligencePanel />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Snooze' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Write failed');
  expect(screen.getByText('Bring PE kit')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Complete' })).toBeEnabled();
});

it('links both recorded pickup-conflict events but offers no implicit cover confirmation', async () => {
  const base = { person: 'ade', date: '2026-10-09', time: '09:00', duration: 540, type: 'work', recurring: 'none',
    isRecurring: false, cost: 0, priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date() } as const;
  mockEvents = [{ ...base, id: 'office', title: 'Office', workStatus: { type: 'office', affectsPickup: false } },
    { ...base, id: 'pickup', title: 'School pickup', time: '15:00', duration: 15, type: 'education' }];
  render(<HomeIntelligencePanel />); await ready();
  const warning = screen.getByText("Check Ade's availability").closest('article')!;
  fireEvent.click(within(warning).getByRole('button', { name: 'Office' }));
  expect(mockOpenEditForm).toHaveBeenLastCalledWith(mockEvents[0]);
  fireEvent.click(within(warning).getByRole('button', { name: 'School pickup' }));
  expect(mockOpenEditForm).toHaveBeenLastCalledWith(mockEvents[1]);
  expect(screen.queryByRole('button', { name: 'Confirm cover' })).not.toBeInTheDocument();
});

it('confirms explicitly recorded pickup cover through the existing recipient-checked reminder API', async () => {
  mockEvents = [{ id: 'trip', person: 'angela', title: 'Work travel', date: '2026-10-09', time: '09:00', duration: 60,
    type: 'work', recurring: 'none', isRecurring: false, cost: 0, priority: 'medium', status: 'confirmed', createdAt: new Date(), updatedAt: new Date(),
    travel: { coordinatorPersonIds: ['ade'], coverage: [{ id: 'cover', title: 'School pickup', status: 'outstanding' }] } }];
  mockNotifications = [{ id: 'cover-reminder', relatedEventId: 'trip', recipientPersonId: 'ade', actionRequired: true,
    expiresAt: new Date('2026-10-09T15:00:00Z'), metadata: { source: 'family-reminder-planner', purpose: 'coverage', canAct: true, occurrence: '2026-10-09' } }];
  render(<HomeIntelligencePanel />); await ready();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cover' }));
  await waitFor(() => expect(mockApplyReminderAction).toHaveBeenCalledWith('cover-reminder', 'cover', undefined));
  expect((global.fetch as jest.Mock).mock.calls.some(call => call[1]?.method === 'POST')).toBe(false);
  mockApplyReminderAction.mockRejectedValueOnce(new Error('Choose a snooze time before departure or reminder expiry.'));
  fireEvent.change(screen.getByLabelText('Personal snooze duration'), { target: { value: 'tomorrow' } });
  fireEvent.click(screen.getByRole('button', { name: 'Snooze cover reminder' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Choose a snooze time before departure or reminder expiry.');
  expect(mockApplyReminderAction).toHaveBeenLastCalledWith('cover-reminder', 'snooze', new Date('2026-10-10T08:00:00Z'));
  expect(screen.getByRole('button', { name: 'Confirm cover' })).toBeEnabled();
});

it('disables task actions until durable personal state has loaded', async () => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockImplementation((_url: string) => String(_url).endsWith('/inbox')
    ? Promise.resolve({ ok: true, json: async () => ({ intakes: [] }) }) : new Promise(() => {}));
  render(<HomeIntelligencePanel />);
  await waitFor(() => expect(screen.queryByText('Checking school and nursery updates...')).not.toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Snooze' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Not needed' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
  expect(fetchMock.mock.calls.some(call => call[1]?.method === 'POST')).toBe(false);
});

it.each([{ value: null }, { value: {} }, { value: { states: [] } }, { value: [{ taskId: 'kit', snoozedUntil: 'invalid' }] }])('gates actions on malformed task-state GET response $value and recovers on retry', async ({ value }) => {
  const fetchMock = global.fetch as jest.Mock;
  fetchMock.mockImplementation(async (_url: string) => ({ ok: true,
    json: async () => String(_url).endsWith('/inbox') ? { intakes: [] } : value }));
  render(<HomeIntelligencePanel />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Task actions are paused.');
  expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Complete' }));
  expect(fetchMock.mock.calls.some(call => call[1]?.method === 'POST')).toBe(false);
  fetchMock.mockImplementation(async (_url: string) => ({ ok: true,
    json: async () => String(_url).endsWith('/inbox') ? { intakes: [] } : [] }));
  fireEvent.click(screen.getByRole('button', { name: 'Retry task reminders' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Complete' })).toBeEnabled());
});

it('gates actions after an unsuccessful state GET without pretending it is an empty preference list', async () => {
  (global.fetch as jest.Mock).mockImplementation(async (_url: string) => ({
    ok: String(_url).endsWith('/inbox'), json: async () => ({ intakes: [] }),
  }));
  render(<HomeIntelligencePanel />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Personal task reminders could not be checked.');
  expect(screen.getByRole('button', { name: 'Complete' })).toBeDisabled();
});

it.each(['Snooze', 'Not needed'])('reloads a personal %s and restores it from the normal hidden-reminders list without completing the task', async label => {
  const view = render(<HomeIntelligencePanel />); await ready();
  fireEvent.click(screen.getByRole('button', { name: label }));
  await waitFor(() => expect(screen.queryByRole('heading', { name: 'Bring PE kit' })).not.toBeInTheDocument());
  view.unmount(); render(<HomeIntelligencePanel />); await ready();
  expect(screen.queryByRole('heading', { name: 'Bring PE kit' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByText('Snoozed and hidden reminders (1)'));
  fireEvent.click(screen.getByRole('button', { name: 'Restore' }));
  expect(await screen.findByRole('heading', { name: 'Bring PE kit' })).toBeInTheDocument();
  const writes = (global.fetch as jest.Mock).mock.calls.filter(call => call[1]?.method === 'POST').map(call => JSON.parse(call[1].body));
  expect(writes[1]).toEqual({ taskId: 'kit', action: 'restore' });
  expect(writes.some(body => body.action === 'complete')).toBe(false);
  expect(mockRefreshTasks).not.toHaveBeenCalled();
  expect(screen.queryByText('Snoozed and hidden reminders (1)')).not.toBeInTheDocument();
});
