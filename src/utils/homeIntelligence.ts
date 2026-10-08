import type { CalendarEvent, CalendarTask } from '@/types/calendar.types';
import type { PropertyTask } from '@/types/property.types';
import { hasUnspecifiedEventTime } from '@/utils/eventSemantics';
import { displayEventTitle } from '@/utils/schoolEventPresentation';

export type HomeIntelligenceArea = 'school' | 'bills' | 'maintenance';
export type HomeIntelligenceKind = 'action' | 'exception';
export type HomeIntelligenceStatus = 'overdue' | 'today' | 'soon' | 'upcoming' | 'needs_detail' | 'changed';

export interface HomeIntelligenceSignal {
  id: string;
  area: HomeIntelligenceArea;
  kind: HomeIntelligenceKind;
  status: HomeIntelligenceStatus;
  title: string;
  summary: string;
  sourceLabel: string;
  ownerLabel: string;
  dueDate?: string;
  destination: 'calendar' | 'budget' | 'property';
  urgency: 1 | 2 | 3;
}

export interface NurseryNoticeInput {
  id: string;
  status?: string;
  actionRequired?: boolean;
  nurseryChildId?: string | null;
  preparationTask?: { completed?: boolean } | null;
  nurserySummary?: {
    kind: 'event' | 'routine' | 'preparation' | 'reference' | 'content_pending';
    title: string;
    purpose: string;
    actions: string[];
    timing?: string | null;
  } | null;
}

export interface BudgetExpenseInput {
  id: string;
  expenseName?: string;
  name?: string;
  amount?: number | string;
  category?: string;
  isRecurring?: boolean;
  recurringFrequency?: string | null;
  recurringEndDate?: string | Date | null;
  paymentDate?: string | Date | null;
  budgetLimit?: number | string | null;
  personId?: string | null;
  person?: string | null;
}

export interface IntelligenceMember {
  id: string;
  name: string;
}

const MS_PER_DAY = 86_400_000;
const SERVICE_PATTERN = /\b(?:virgin|broadband|internet|energy|electric|gas|water|council tax|insurance|mobile|phone|television|tv|subscription|mortgage|rent)\b/i;
const SCHOOL_TASK_PATTERN = /\b(?:school|nursery|grandir|homework|reading|spellings?|uniform|pe kit|book|form|permission|photo|trip)\b/i;

const dateKey = (value: string | Date | null | undefined): string | null => {
  if (!value) return null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.toISOString().slice(0, 10) : null;
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : null;
};

const asUtcDate = (value: string) => new Date(`${value}T12:00:00.000Z`);
const daysFrom = (today: string, value: string) => Math.round((asUtcDate(value).getTime() - asUtcDate(today).getTime()) / MS_PER_DAY);
const addDays = (value: string, days: number) => new Date(asUtcDate(value).getTime() + days * MS_PER_DAY).toISOString().slice(0, 10);
const money = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);

const statusForDate = (today: string, dueDate: string): Pick<HomeIntelligenceSignal, 'status' | 'urgency'> => {
  const days = daysFrom(today, dueDate);
  if (days < 0) return { status: 'overdue', urgency: 1 };
  if (days === 0) return { status: 'today', urgency: 1 };
  if (days <= 2) return { status: 'soon', urgency: 2 };
  return { status: 'upcoming', urgency: 3 };
};

const ownerName = (memberId: string | null | undefined, members: IntelligenceMember[], fallback = 'Family') =>
  members.find((member) => member.id === memberId)?.name || fallback;

const nextRecurringDate = (expense: BudgetExpenseInput, today: string): string | null => {
  const anchor = dateKey(expense.paymentDate);
  if (!anchor) return null;
  if (!expense.isRecurring) return anchor >= today ? anchor : null;
  const frequency = expense.recurringFrequency || 'monthly';
  let candidate = asUtcDate(anchor);
  const target = asUtcDate(today);
  if (frequency === 'weekly') {
    while (candidate < target) candidate = new Date(candidate.getTime() + 7 * MS_PER_DAY);
  } else if (frequency === 'yearly') {
    while (candidate < target) candidate.setUTCFullYear(candidate.getUTCFullYear() + 1);
  } else {
    const anchorDay = candidate.getUTCDate();
    while (candidate < target) {
      const year = candidate.getUTCFullYear();
      const month = candidate.getUTCMonth() + 1;
      const lastDay = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
      candidate = new Date(Date.UTC(year, month, Math.min(anchorDay, lastDay), 12));
    }
  }
  const end = dateKey(expense.recurringEndDate);
  const result = candidate.toISOString().slice(0, 10);
  return end && result > end ? null : result;
};

const isServiceExpense = (expense: BudgetExpenseInput) =>
  Boolean(expense.isRecurring) && (SERVICE_PATTERN.test(expense.expenseName || expense.name || '') ||
    /^(Utilities|Insurance|Housing)$/i.test(expense.category || ''));

const isSchoolTask = (task: CalendarTask) => task.taskType === 'homework' || task.taskType === 'reading' ||
  task.taskType === 'practice' || SCHOOL_TASK_PATTERN.test(`${task.subject || ''} ${task.title}`);

const schoolEventNeedsTime = (event: CalendarEvent) => {
  if (!hasUnspecifiedEventTime(event)) return false;
  const title = displayEventTitle(event);
  if (/\b(?:deadline|booking(?:s)? close|closes?|all day|holiday|break|non-uniform day|dress-up day)\b/i.test(title)) return false;
  return /\b(?:meeting|appointment|lesson|club|practice|training|performance|concert|workshop|parents? evening)\b/i.test(title);
};

const buildSchoolSignals = ({ today, tasks, events, nurseryNotices, members }: {
  today: string;
  tasks: CalendarTask[];
  events: CalendarEvent[];
  nurseryNotices: NurseryNoticeInput[];
  members: IntelligenceMember[];
}) => {
  const signals: HomeIntelligenceSignal[] = [];
  tasks.filter((task) => !task.completedAt && isSchoolTask(task)).forEach((task) => {
    const due = dateKey(task.dueDate);
    if (!due || daysFrom(today, due) > 7) return;
    const timing = statusForDate(today, due);
    signals.push({ id: `school-task:${task.id}`, area: 'school', kind: 'action', ...timing,
      title: task.title, summary: task.notes || 'Complete this school or nursery preparation before it is due.',
      sourceLabel: task.subject || 'School preparation', ownerLabel: task.assignees.map((id) => ownerName(id, members, '')).filter(Boolean).join(', ') || 'Child to confirm',
      dueDate: due, destination: 'calendar' });
  });

  nurseryNotices.forEach((notice) => {
    const summary = notice.nurserySummary;
    if (!summary || summary.title === 'Parent account security notice' || notice.preparationTask?.completed) return;
    if (summary.kind === 'content_pending' || notice.status === 'content_required') {
      signals.push({ id: `nursery-content:${notice.id}`, area: 'school', kind: 'exception', status: 'needs_detail',
        title: summary.title, summary: summary.actions[0] || 'Open the original nursery post so dates and required items can be confirmed.',
        sourceLabel: 'Grandir nursery', ownerLabel: ownerName(notice.nurseryChildId, members, 'Askia'),
        destination: 'calendar', urgency: 1 });
    } else if (summary.kind === 'preparation' && !notice.preparationTask) {
      signals.push({ id: `nursery-preparation:${notice.id}`, area: 'school', kind: 'action', status: 'needs_detail',
        title: summary.title, summary: summary.actions.join(' ') || summary.purpose,
        sourceLabel: 'Grandir nursery', ownerLabel: ownerName(notice.nurseryChildId, members, 'Child to confirm'),
        destination: 'calendar', urgency: 2 });
    }
  });

  const eventEnd = addDays(today, 7);
  events.filter((event) => event.date >= today && event.date <= eventEnd).forEach((event) => {
    const schoolEvent = event.type === 'education' || event.source === 'gmail-school-email';
    if (!schoolEvent) return;
    const title = displayEventTitle(event);
    if (event.status === 'cancelled') {
      signals.push({ id: `school-change:${event.id}`, area: 'school', kind: 'exception', status: 'changed',
        title: `${title} was cancelled`, summary: 'Review transport, childcare and any preparation linked to this event.',
        sourceLabel: 'Calendar change', ownerLabel: ownerName(event.person, members), dueDate: event.date,
        destination: 'calendar', urgency: 1 });
    } else if (schoolEventNeedsTime(event)) {
      signals.push({ id: `school-time:${event.id}`, area: 'school', kind: 'exception', status: 'needs_detail',
        title: `${title}: time needed`, summary: 'The date is saved but the source did not confirm a time.',
        sourceLabel: event.source === 'gmail-school-email' ? 'School email' : 'Calendar', ownerLabel: ownerName(event.person, members),
        dueDate: event.date, destination: 'calendar', urgency: daysFrom(today, event.date) <= 2 ? 1 : 2 });
    }
  });
  return signals;
};

const buildBillSignals = (today: string, expenses: BudgetExpenseInput[], members: IntelligenceMember[]) => {
  const signals: HomeIntelligenceSignal[] = [];
  expenses.filter(isServiceExpense).forEach((expense) => {
    const name = expense.expenseName || expense.name || 'Household service';
    const owner = ownerName(expense.personId || expense.person, members);
    const amount = Number(expense.amount || 0);
    const due = nextRecurringDate(expense, today);
    if (!dateKey(expense.paymentDate)) {
      signals.push({ id: `bill-date:${expense.id}`, area: 'bills', kind: 'exception', status: 'needs_detail',
        title: `${name}: payment date needed`, summary: `${amount > 0 ? `${money(amount)} recurring bill. ` : ''}Add the normal payment date so the app can warn you before it is due.`,
        sourceLabel: 'Budget plan', ownerLabel: owner, destination: 'budget', urgency: 2 });
    } else if (due && daysFrom(today, due) <= 7) {
      const timing = statusForDate(today, due);
      signals.push({ id: `bill-due:${expense.id}:${due}`, area: 'bills', kind: 'action', ...timing,
        title: `${name}${amount > 0 ? ` · ${money(amount)}` : ''}`, summary: 'Upcoming household service payment. Check the latest bill if the amount has changed.',
        sourceLabel: expense.category || 'Household bill', ownerLabel: owner, dueDate: due, destination: 'budget' });
    }
    const limit = Number(expense.budgetLimit || 0);
    if (limit > 0 && amount > limit) {
      signals.push({ id: `bill-limit:${expense.id}`, area: 'bills', kind: 'exception', status: 'changed',
        title: `${name} is above plan`, summary: `${money(amount)} is ${money(amount - limit)} above the saved ${money(limit)} limit.`,
        sourceLabel: 'Budget comparison', ownerLabel: owner, destination: 'budget', urgency: 1 });
    }
    const end = dateKey(expense.recurringEndDate);
    if (end && daysFrom(today, end) >= 0 && daysFrom(today, end) <= 45) {
      signals.push({ id: `bill-end:${expense.id}:${end}`, area: 'bills', kind: 'exception', status: 'soon',
        title: `${name}: scheduled end approaching`, summary: 'Review renewal, cancellation or replacement before the saved recurring period ends.',
        sourceLabel: 'Budget plan', ownerLabel: owner, dueDate: end, destination: 'budget', urgency: 2 });
    }
  });
  return signals;
};

const buildMaintenanceSignals = (today: string, tasks: PropertyTask[]) => {
  const signals: HomeIntelligenceSignal[] = [];
  const open = tasks.filter((task) => task.status !== 'completed');
  open.forEach((task) => {
    const due = dateKey(task.nextDueDate);
    if (!due || daysFrom(today, due) > 30) return;
    const timing = statusForDate(today, due);
    signals.push({ id: `maintenance-due:${task.id}:${due}`, area: 'maintenance', kind: 'action', ...timing,
      title: task.title, summary: task.impact || `Scheduled ${task.category.toLowerCase()} maintenance.`,
      sourceLabel: task.source === 'survey' ? 'Building survey' : 'Home maintenance', ownerLabel: task.recommendedContractor || 'Household',
      dueDate: due, destination: 'property' });
  });
  const missingDates = open.filter((task) => !dateKey(task.nextDueDate) && (task.recurrence || task.priority === 'urgent'));
  if (missingDates.length) {
    signals.push({ id: 'maintenance:missing-dates', area: 'maintenance', kind: 'exception', status: 'needs_detail',
      title: `${missingDates.length} home job${missingDates.length === 1 ? '' : 's'} need a date`,
      summary: `${missingDates.slice(0, 2).map((task) => task.title).join(' · ')}${missingDates.length > 2 ? ` · +${missingDates.length - 2} more` : ''}`,
      sourceLabel: 'Property tasks', ownerLabel: 'Household', destination: 'property', urgency: missingDates.some((task) => task.priority === 'urgent') ? 1 : 2 });
  }
  return signals;
};

export const buildHomeIntelligenceSignals = ({ today, tasks = [], events = [], expenses = [], propertyTasks = [], nurseryNotices = [], members = [] }: {
  today: string;
  tasks?: CalendarTask[];
  events?: CalendarEvent[];
  expenses?: BudgetExpenseInput[];
  propertyTasks?: PropertyTask[];
  nurseryNotices?: NurseryNoticeInput[];
  members?: IntelligenceMember[];
}): HomeIntelligenceSignal[] => {
  const unique = new Map<string, HomeIntelligenceSignal>();
  [...buildSchoolSignals({ today, tasks, events, nurseryNotices, members }),
    ...buildBillSignals(today, expenses, members),
    ...buildMaintenanceSignals(today, propertyTasks)].forEach((signal) => unique.set(signal.id, signal));
  return Array.from(unique.values()).sort((a, b) => a.urgency - b.urgency ||
    (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || a.title.localeCompare(b.title));
};
