import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { PropertyIssuesTab } from '../PropertyIssuesTab';
import { useFamilyStore } from '@/store/familyStore';
import type { PropertyIssue } from '@/types/property.types';

const createEvent = jest.fn();
const updateEvent = jest.fn();
const deleteEvent = jest.fn();

jest.mock('@/contexts/familyHub/CalendarContext', () => ({
  useCalendarContext: () => ({ createEvent, updateEvent, deleteEvent }),
}));

jest.mock('react-hot-toast', () => {
  const toast = Object.assign(jest.fn(), { success: jest.fn(), error: jest.fn() });
  return { __esModule: true, default: toast };
});

const PARENT = {
  id: 'person-dad',
  familyId: 'family-1',
  name: 'Ade',
  role: 'Parent' as const,
  ageGroup: 'Adult' as const,
  color: '#3366ff',
  icon: '👨',
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
};

const mockFetch = (impl: () => Promise<unknown>) => {
  (global as any).fetch = jest.fn(impl);
};

const logIssue = async (text: string) => {
  fireEvent.change(screen.getByLabelText('Describe the issue'), { target: { value: text } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /log it/i }));
  });
};

const saveDrafts = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /^save/i }));
  });
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  createEvent.mockImplementation(async (draft) => ({
    status: 'created',
    event: { ...draft, id: `event-${createEvent.mock.calls.length}` },
  }));
  useFamilyStore.setState({
    propertyIssues: [],
    propertyTasks: [],
    people: [PARENT] as any,
    events: [],
  });
  window.confirm = jest.fn(() => true);
  // Default: the AI endpoint is unavailable (e.g. signed out) so the built-in rules are used
  mockFetch(async () => ({ ok: false, status: 401, json: async () => ({}) }));
});

describe('PropertyIssuesTab', () => {
  test('splits a quick note into separate jobs and adds them to property tasks', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);

    await logIssue('gutters need clearing and clean windows');

    expect(screen.getByDisplayValue('Clear and check gutters')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Window clean')).toBeInTheDocument();
    expect(screen.getByText(/built-in rules/i)).toBeInTheDocument();

    await saveDrafts();

    const { propertyIssues, propertyTasks } = useFamilyStore.getState();
    expect(propertyIssues).toHaveLength(2);
    expect(propertyTasks).toHaveLength(2);
    expect(propertyIssues.every((issue) => issue.linkedTaskId)).toBe(true);
    expect(propertyTasks.map((task) => task.recommendedContractor).sort()).toEqual(['Gutter cleaner', 'Window cleaner']);
    // Routine jobs are not pushed into the calendar automatically
    expect(createEvent).not.toHaveBeenCalled();
    expect(screen.getAllByRole('article')).toHaveLength(2);
  });

  test('puts urgent jobs straight into the calendar', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);

    await logIssue('burst pipe under the kitchen sink');
    await saveDrafts();

    expect(createEvent).toHaveBeenCalledTimes(1);
    const draft = createEvent.mock.calls[0][0];
    expect(draft.person).toBe(PARENT.id);
    expect(draft.type).toBe('appointment');
    expect(draft.priority).toBe('high');
    expect(draft.title).toMatch(/^Home: /);
    expect(draft.notes).toContain('burst pipe');

    const [issue] = useFamilyStore.getState().propertyIssues;
    expect(issue.status).toBe('scheduled');
    expect(issue.calendarEventId).toBe('event-1');
    expect(issue.urgency).toBe('urgent');
  });

  test('uses the AI result when the endpoint responds', async () => {
    mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        source: 'ai',
        issues: [{
          title: 'Clear back gutters and check downpipe',
          area: 'roof_gutters',
          urgency: 'soon',
          trade: 'Gutter cleaner',
          diy: false,
          costRange: { min: 90, max: 140, currency: 'GBP' },
          suggestedDate: '2099-01-05',
          steps: ['Book a gutter clean'],
          sourceText: 'gutters at the back overflowing',
        }],
      }),
    }));
    render(<PropertyIssuesTab isReadOnly={false} />);

    await logIssue('gutters at the back overflowing');
    expect(screen.getByText(/structured by ai/i)).toBeInTheDocument();

    await saveDrafts();

    const [issue] = useFamilyStore.getState().propertyIssues;
    expect(issue.enhancedBy).toBe('ai');
    expect(issue.title).toBe('Clear back gutters and check downpipe');
    expect(issue.costRange).toEqual({ min: 90, max: 140, currency: 'GBP' });
    // "soon" jobs default into the calendar on the AI-suggested date
    expect(createEvent.mock.calls[0][0].date).toBe('2099-01-05');
  });

  test('marking a recurring job done completes the task and logs the next one', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);
    await logIssue('gutters need clearing');
    await saveDrafts();

    const [original] = useFamilyStore.getState().propertyIssues;
    await act(async () => {
      fireEvent.click(within(screen.getByRole('article')).getByRole('button', { name: /done/i }));
    });

    const { propertyIssues, propertyTasks } = useFamilyStore.getState();
    const done = propertyIssues.find((issue) => issue.id === original.id) as PropertyIssue;
    const next = propertyIssues.find((issue) => issue.id !== original.id) as PropertyIssue;
    expect(done.status).toBe('done');
    expect(propertyTasks.find((task) => task.id === original.linkedTaskId)?.status).toBe('completed');
    expect(next.status).toBe('open');
    expect(next.linkedTaskId).toBeUndefined();
    expect(Number(next.suggestedDate!.slice(0, 4))).toBe(new Date().getFullYear() + 1);
  });

  test('scheduling an issue later adds it to the calendar and updates the task date', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);
    await logIssue('mow the lawn');
    await saveDrafts();

    const card = screen.getByRole('article');
    fireEvent.click(within(card).getByRole('button', { name: /^schedule$/i }));
    fireEvent.change(within(card).getByLabelText('Date'), { target: { value: '2099-06-06' } });
    fireEvent.change(within(card).getByLabelText('Time'), { target: { value: '11:30' } });
    await act(async () => {
      fireEvent.click(within(card).getByRole('button', { name: /add to calendar/i }));
    });

    expect(createEvent).toHaveBeenCalledWith(expect.objectContaining({ date: '2099-06-06', time: '11:30', type: 'personal' }));
    const [issue] = useFamilyStore.getState().propertyIssues;
    expect(issue.status).toBe('scheduled');
    expect(useFamilyStore.getState().propertyTasks[0].nextDueDate).toBe('2099-06-06');
  });

  test('deleting a scheduled issue also removes its calendar event', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);
    await logIssue('burst pipe in the loft');
    await saveDrafts();
    const [issue] = useFamilyStore.getState().propertyIssues;
    useFamilyStore.setState({ events: [{ id: issue.calendarEventId } as any] });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    });

    await waitFor(() => expect(deleteEvent).toHaveBeenCalledWith(issue.calendarEventId));
    expect(useFamilyStore.getState().propertyIssues).toHaveLength(0);
  });

  test('warns when the same job is already open and does not sync it twice', async () => {
    render(<PropertyIssuesTab isReadOnly={false} />);
    await logIssue('burst pipe in the loft');
    await saveDrafts();
    expect(createEvent).toHaveBeenCalledTimes(1);

    await logIssue('burst pipe in the loft');
    expect(screen.getByText(/already logged/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /add to calendar/i })).not.toBeChecked();
    expect(screen.getByRole('checkbox', { name: /add to tasks/i })).not.toBeChecked();
  });

  test('viewers can see issues but not log or change them', () => {
    useFamilyStore.setState({
      propertyIssues: [{
        id: 'issue-1',
        title: 'Window clean',
        area: 'cleaning',
        urgency: 'routine',
        trade: 'Window cleaner',
        diy: false,
        steps: [],
        sourceText: 'windows',
        status: 'open',
        enhancedBy: 'rules',
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
      }],
    });
    render(<PropertyIssuesTab isReadOnly />);

    expect(screen.queryByLabelText('Describe the issue')).not.toBeInTheDocument();
    expect(screen.getByText('Window clean')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /done/i })).not.toBeInTheDocument();
  });
});
