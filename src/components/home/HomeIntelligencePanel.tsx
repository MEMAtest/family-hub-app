'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck, Check, CircleDollarSign, Clock, Home, RefreshCw, RotateCcw, School, X } from 'lucide-react';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { useFamilyStore } from '@/store/familyStore';
import { formatDateForInput } from '@/utils/formatDate';
import { buildHomeIntelligenceSignals, type HomeIntelligenceArea, type NurseryNoticeInput } from '@/utils/homeIntelligence';
import { PERSONAL_SNOOZE_PRESETS, parseTaskReminderStates, personalSnoozeUntil, taskReminderVisible, type PersonalSnoozePreset, type PersonalTaskReminderState } from '@/utils/personalSnooze';
import { explicitCoverReminder, homePickupWarnings } from '@/utils/homePickupWarnings';
import { useNotifications } from '@/contexts/NotificationContext';

type Filter = 'all' | HomeIntelligenceArea | 'exceptions';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'school', label: 'School & nursery' },
  { id: 'bills', label: 'Bills' },
  { id: 'maintenance', label: 'Home' },
  { id: 'exceptions', label: 'Changes' },
];

const areaMeta = {
  school: { label: 'School & nursery', icon: School, accent: 'border-sky-500', iconClass: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  bills: { label: 'Bills & services', icon: CircleDollarSign, accent: 'border-violet-500', iconClass: 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  maintenance: { label: 'Home maintenance', icon: Home, accent: 'border-amber-500', iconClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
} as const;

const statusLabel = {
  overdue: 'Overdue', today: 'Today', soon: 'Due soon', upcoming: 'Upcoming', needs_detail: 'Needs detail', changed: 'Changed',
};

export const HomeIntelligencePanel = ({ defaultFilter = 'all', compact = false }: { defaultFilter?: Filter; compact?: boolean }) => {
  const { events, tasks, refreshTasks, openEditForm } = useCalendarContext();
  const { notifications, applyReminderAction } = useNotifications();
  const { members } = useFamilyContext();
  const { setView } = useAppView();
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const budgetData = useFamilyStore((state) => state.budgetData);
  const propertyTasks = useFamilyStore((state) => state.propertyTasks);
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [includeSavedBills, setIncludeSavedBills] = useState(false);
  const [nurseryNotices, setNurseryNotices] = useState<NurseryNoticeInput[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxUnavailable, setInboxUnavailable] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [taskStates, setTaskStates] = useState<PersonalTaskReminderState[]>([]);
  const [taskStateStatus, setTaskStateStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [taskStateError, setTaskStateError] = useState<string | null>(null);
  const [taskStateRetry, setTaskStateRetry] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [snoozePreset, setSnoozePreset] = useState<PersonalSnoozePreset>('10min');
  const [clock, setClock] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let active = true;
    setTaskStates([]);
    setTaskStateStatus('loading');
    setTaskStateError(null);
    if (!familyId) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    void fetch(`/api/families/${familyId}/task-reminders`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Personal task reminders could not be checked.');
      const states = parseTaskReminderStates(await response.json());
      if (active) { setTaskStates(states); setTaskStateStatus('ready'); }
    }).catch(error => { if (active) { setTaskStateError(error.message); setTaskStateStatus('error'); } })
      .finally(() => window.clearTimeout(timeout));
    return () => { active = false; window.clearTimeout(timeout); controller.abort(); };
  }, [familyId, taskStateRetry]);

  const actOnTask = async (taskId: string, action: 'complete' | 'snooze' | 'not_needed' | 'restore') => {
    if (!familyId || busyAction || taskStateStatus !== 'ready') return;
    setBusyAction(taskId);
    setActionError(null);
    try {
      const response = await fetch(`/api/families/${familyId}/task-reminders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId, action,
          ...(action === 'snooze' ? { until: personalSnoozeUntil(snoozePreset).toISOString() } : {}) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not update this task.');
      if (action === 'complete') await refreshTasks();
      else setTaskStates(states => [...states.filter(state => state.taskId !== taskId), result]);
    } catch (error) { setActionError(error instanceof Error ? error.message : 'Could not update this task.'); }
    finally { setBusyAction(null); }
  };

  const loadNursery = useCallback(async () => {
    if (!familyId) return;
    setLoadingInbox(true);
    setInboxUnavailable(false);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(`/api/families/${familyId}/calendar-intake/inbox`, { signal: controller.signal });
      if (!response.ok) throw new Error('School inbox unavailable');
      const payload = await response.json();
      setNurseryNotices(Array.isArray(payload.intakes) ? payload.intakes.filter((item: NurseryNoticeInput) => item.nurserySummary) : []);
    } catch {
      setInboxUnavailable(true);
    } finally {
      window.clearTimeout(timeout);
      setLoadingInbox(false);
    }
  }, [familyId]);

  useEffect(() => { void loadNursery(); }, [loadNursery]);

  const expenses = useMemo(() => includeSavedBills ? [
    ...Object.values(budgetData?.expenses?.recurringMonthly || {}),
    ...(budgetData?.expenses?.oneTimeSpends || []),
  ] : [], [budgetData, includeSavedBills]);
  const today = formatDateForInput(new Date());
  const signals = useMemo(() => buildHomeIntelligenceSignals({ today, tasks, events, expenses, propertyTasks, nurseryNotices,
    members: members.map(({ id, name }) => ({ id, name })) }), [events, expenses, members, nurseryNotices, propertyTasks, tasks, today]);
  const activeSignals = useMemo(() => signals.filter(signal => !signal.taskId ||
    taskReminderVisible(taskStates.find(state => state.taskId === signal.taskId), clock)), [signals, taskStates, clock]);
  const hiddenTasks = tasks.filter(task => !task.completedAt &&
    !taskReminderVisible(taskStates.find(state => state.taskId === task.id), clock));
  const filtered = activeSignals.filter((signal) => {
    if (filter === 'all') return true;
    if (filter === 'exceptions') return signal.kind === 'exception';
    return signal.area === filter;
  });
  const visible = compact || !expanded ? filtered.slice(0, compact ? 4 : 6) : filtered;
  const counts = useMemo(() => ({
    school: activeSignals.filter((signal) => signal.area === 'school').length,
    bills: activeSignals.filter((signal) => signal.area === 'bills').length,
    maintenance: activeSignals.filter((signal) => signal.area === 'maintenance').length,
    exceptions: activeSignals.filter((signal) => signal.kind === 'exception').length,
  }), [activeSignals]);
  const pickupWarnings = useMemo(() => homePickupWarnings(events,
    members.map(member => ({ ...member, role: String(member.role ?? '') })), today), [events, members, today]);

  const openEvent = (id: string, occurrenceDate?: string) => {
    const event = events.find(item => item.id === id);
    if (event) { setView('calendar'); openEditForm(occurrenceDate && event.isRecurring ? { ...event, date: occurrenceDate,
      occurrenceDate, seriesStartDate: event.isRecurring ? event.date : undefined } : event); }
  };

  const actOnCover = async (notificationId: string, action: 'cover' | 'snooze') => {
    if (busyAction) return;
    setBusyAction(notificationId);
    setActionError(null);
    try { await applyReminderAction(notificationId, action,
      action === 'snooze' ? personalSnoozeUntil(snoozePreset) : undefined); }
    catch (error) { setActionError(error instanceof Error ? error.message : 'Could not update the cover reminder.'); }
    finally { setBusyAction(null); }
  };

  const openSignal = (destination: 'calendar' | 'budget' | 'property', area: HomeIntelligenceArea) => {
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('homeFocus', area);
      window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setView(destination);
  };

  return <section aria-label="Home intelligence" className="border-y border-[#dfe7e2] bg-white px-3 py-4 dark:border-slate-800 dark:bg-slate-900 sm:px-5 sm:py-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="kinboard-label">Household assistant</p>
        <h2 className="mt-1 flex items-center gap-2 text-xl font-semibold text-[#18221f] dark:text-slate-100"><CalendarCheck className="h-5 w-5 text-[#147c72]" />Needs attention</h2>
        <p className="mt-1 text-sm text-[#5f6a64] dark:text-slate-400">Preparation, bills, maintenance and changes, checked together.</p>
      </div>
      <div className="grid grid-cols-4 divide-x divide-[#dfe7e2] text-center text-xs dark:divide-slate-700">
        <div className="px-2"><strong className="block text-base text-sky-700 dark:text-sky-300">{counts.school}</strong>School</div>
        <div className="px-2"><strong className="block text-base text-violet-700 dark:text-violet-300">{counts.bills}</strong>Bills</div>
        <div className="px-2"><strong className="block text-base text-amber-700 dark:text-amber-300">{counts.maintenance}</strong>Home</div>
        <div className="px-2"><strong className="block text-base text-rose-700 dark:text-rose-300">{counts.exceptions}</strong>Changes</div>
      </div>
    </div>

    <div className="mt-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter household attention">
      {FILTERS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={filter === item.id} onClick={() => { setFilter(item.id); setExpanded(false); }}
        className={`min-h-10 shrink-0 rounded-md px-3 text-sm font-semibold ${filter === item.id ? 'bg-[#147c72] text-white' : 'border border-[#dfe7e2] bg-white text-[#40504a] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>{item.label}</button>)}
    </div>

    {(filter === 'all' || filter === 'bills') && <label className="mt-3 flex items-start gap-2 text-xs text-slate-500"><input type="checkbox" checked={includeSavedBills} onChange={event => setIncludeSavedBills(event.target.checked)} className="mt-0.5 rounded border-slate-300 text-teal-700" />Include unverified saved bill plans</label>}
    {loadingInbox && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[#5f6a64]"><RefreshCw className="h-4 w-4 animate-spin" />Checking school and nursery updates...</p>}
    {inboxUnavailable && <div role="alert" className="mt-3 flex items-center justify-between gap-3 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><span>School inbox could not be checked. Existing tasks are still shown.</span><button type="button" onClick={() => void loadNursery()} className="min-h-10 font-semibold underline">Retry</button></div>}
    {actionError && <p role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{actionError}</p>}
    {taskStateStatus === 'loading' && <p role="status" className="mt-3 text-sm">Checking personal task reminders...</p>}
    {taskStateStatus === 'error' && <div role="alert" className="mt-3 text-sm text-red-700 dark:text-red-300">{taskStateError} Task actions are paused.
      <button type="button" onClick={() => setTaskStateRetry(value => value + 1)} className="ml-2 min-h-10 font-semibold underline">Retry task reminders</button>
    </div>}
    {(filter === 'all' || filter === 'school') && <label className="mt-3 flex items-center gap-2 text-sm">Personal snooze
      <select aria-label="Personal snooze duration" value={snoozePreset} onChange={event => setSnoozePreset(event.target.value as PersonalSnoozePreset)} className="min-h-10 rounded border bg-white px-2 dark:bg-slate-900">
        {PERSONAL_SNOOZE_PRESETS.map(preset => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
      </select>
    </label>}

    {(filter === 'all' || filter === 'school' || filter === 'exceptions') && pickupWarnings.map(warning => {
      const linked = (warning.relatedEventIds ?? [warning.eventId]).flatMap(id => events.filter(event => event.id === id));
      return <article key={warning.id} className="mt-3 border-l-4 border-amber-500 bg-amber-50 p-3 dark:bg-amber-950/30">
        <h3 className="text-sm font-semibold">{warning.title}</h3><p className="mt-1 text-sm">{warning.detail}</p>
        <div className="mt-2 flex flex-wrap gap-3">{linked.map(event => <button key={event.id} type="button" onClick={() => openEvent(event.id, warning.occurrenceDate)} className="min-h-10 text-sm font-semibold text-teal-700 dark:text-teal-300">{event.title}<ArrowRight className="ml-1 inline h-4 w-4" /></button>)}</div>
        {linked.map(event => {
          const reminder = explicitCoverReminder({ ...event, occurrenceDate: warning.occurrenceDate }, notifications, clock);
          return reminder ? <div key={reminder.id} className="flex flex-wrap gap-3">
            <button type="button" disabled={!!busyAction} onClick={() => void actOnCover(reminder.id, 'cover')} className="min-h-10 text-sm font-semibold text-teal-700 dark:text-teal-300"><Check className="mr-1 inline h-4 w-4" />Confirm cover</button>
            <button type="button" disabled={!!busyAction} onClick={() => void actOnCover(reminder.id, 'snooze')} className="min-h-10 text-sm font-semibold text-teal-700 dark:text-teal-300"><Clock className="mr-1 inline h-4 w-4" />Snooze cover reminder</button>
          </div> : null;
        })}
      </article>;
    })}

    {visible.length > 0 ? <div className="mt-4 grid gap-3 lg:grid-cols-2">{visible.map((signal) => {
      const meta = areaMeta[signal.area];
      const Icon = signal.kind === 'exception' ? AlertTriangle : meta.icon;
      return <article key={signal.id} className={`min-w-0 border-l-4 ${signal.kind === 'exception' ? 'border-rose-500' : meta.accent} bg-[#f8faf8] p-3 dark:bg-slate-950/60`}>
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${signal.kind === 'exception' ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' : meta.iconClass}`}><Icon className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-xs"><span className="font-semibold text-[#5f6a64] dark:text-slate-400">{meta.label}</span><span className={`rounded px-1.5 py-0.5 font-semibold ${signal.urgency === 1 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200' : 'bg-white text-[#40504a] dark:bg-slate-800 dark:text-slate-300'}`}>{statusLabel[signal.status]}</span></div>
            <h3 className="mt-1 break-words text-sm font-semibold text-[#18221f] dark:text-slate-100">{signal.title}</h3>
            <p className="mt-1 break-words text-sm text-[#5f6a64] dark:text-slate-300">{signal.summary}</p>
            <p className="mt-2 text-xs text-[#6f7b75] dark:text-slate-400">{signal.ownerLabel}{signal.dueDate ? ` · ${new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' }).format(new Date(`${signal.dueDate}T12:00:00Z`))}` : ''} · {signal.sourceLabel}</p>
          </div>
        </div>
        {signal.taskId && !tasks.find(task => task.id === signal.taskId)?.recurringPattern && <fieldset disabled={!!busyAction || !familyId || taskStateStatus !== 'ready'} className="mt-3 flex flex-wrap gap-3">
          <button type="button" disabled={!!busyAction} onClick={() => void actOnTask(signal.taskId!, 'complete')} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300"><Check className="h-4 w-4" />Complete</button>
          <button type="button" disabled={!!busyAction} onClick={() => void actOnTask(signal.taskId!, 'snooze')} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300"><Clock className="h-4 w-4" />Snooze</button>
          <button type="button" disabled={!!busyAction} onClick={() => void actOnTask(signal.taskId!, 'not_needed')} className="inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-teal-700 dark:text-teal-300"><X className="h-4 w-4" />Not needed</button>
        </fieldset>}
        {signal.eventIds?.map(id => <button key={id} type="button" onClick={() => openEvent(id)} className="mr-3 mt-3 min-h-10 text-sm font-semibold text-teal-700 dark:text-teal-300">{events.find(event => event.id === id)?.title ?? 'View linked event'}<ArrowRight className="ml-1 inline h-4 w-4" /></button>)}
        <button type="button" onClick={() => openSignal(signal.destination, signal.area)} className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#147c72] dark:text-teal-300">{signal.area === 'school' ? 'Review school & nursery' : signal.area === 'bills' ? 'Review bills' : 'Open maintenance'}<ArrowRight className="h-4 w-4" /></button>
      </article>;
    })}</div> : !loadingInbox && !(['all', 'school', 'exceptions'].includes(filter) && pickupWarnings.length) && <div className="mt-4 border-l-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Nothing in this area needs action right now.</div>}

    {!compact && filtered.length > visible.length && <button type="button" onClick={() => setExpanded(true)} className="mt-3 min-h-10 text-sm font-semibold text-[#147c72] dark:text-teal-300">Show all {filtered.length}</button>}
    {hiddenTasks.length > 0 && (filter === 'all' || filter === 'school') && <details className="mt-4 border-t border-gray-200 pt-3 dark:border-slate-700">
      <summary className="min-h-10 cursor-pointer text-sm font-semibold">Snoozed and hidden reminders ({hiddenTasks.length})</summary>
      <ul className="divide-y divide-gray-200 dark:divide-slate-700">{hiddenTasks.map(task => {
        const state = taskStates.find(item => item.taskId === task.id)!;
        return <li key={task.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
          <span className="min-w-0 break-words">{task.title}<span className="mt-1 block text-xs text-gray-600 dark:text-slate-300">{state.resolution === 'not_needed' ? 'Not needed for me' : `Snoozed until ${new Date(state.snoozedUntil!).toLocaleString('en-GB', { timeZone: 'Europe/London', dateStyle: 'short', timeStyle: 'short' })}`}</span></span>
          <button type="button" disabled={!!busyAction || taskStateStatus !== 'ready'} onClick={() => void actOnTask(task.id, 'restore')} className="inline-flex min-h-10 items-center gap-1 font-semibold text-teal-700 dark:text-teal-300"><RotateCcw className="h-4 w-4" />Restore</button>
        </li>;
      })}</ul>
    </details>}
  </section>;
};
