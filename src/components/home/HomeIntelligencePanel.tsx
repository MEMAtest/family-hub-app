'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, CalendarCheck, CircleDollarSign, Home, RefreshCw, School } from 'lucide-react';
import { useCalendarContext } from '@/contexts/familyHub/CalendarContext';
import { useFamilyContext } from '@/contexts/familyHub/FamilyContext';
import { useAppView } from '@/contexts/familyHub/AppViewContext';
import { useFamilyStore } from '@/store/familyStore';
import { formatDateForInput } from '@/utils/formatDate';
import { buildHomeIntelligenceSignals, type HomeIntelligenceArea, type NurseryNoticeInput } from '@/utils/homeIntelligence';

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
  const { events, tasks } = useCalendarContext();
  const { members } = useFamilyContext();
  const { setView } = useAppView();
  const familyId = useFamilyStore((state) => state.databaseStatus.familyId);
  const budgetData = useFamilyStore((state) => state.budgetData);
  const propertyTasks = useFamilyStore((state) => state.propertyTasks);
  const [filter, setFilter] = useState<Filter>(defaultFilter);
  const [nurseryNotices, setNurseryNotices] = useState<NurseryNoticeInput[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [inboxUnavailable, setInboxUnavailable] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  const expenses = useMemo(() => [
    ...Object.values(budgetData?.expenses?.recurringMonthly || {}),
    ...(budgetData?.expenses?.oneTimeSpends || []),
  ], [budgetData]);
  const today = formatDateForInput(new Date());
  const signals = useMemo(() => buildHomeIntelligenceSignals({ today, tasks, events, expenses, propertyTasks, nurseryNotices,
    members: members.map(({ id, name }) => ({ id, name })) }), [events, expenses, members, nurseryNotices, propertyTasks, tasks, today]);
  const filtered = signals.filter((signal) => {
    if (filter === 'all') return true;
    if (filter === 'exceptions') return signal.kind === 'exception';
    return signal.area === filter;
  });
  const visible = compact || !expanded ? filtered.slice(0, compact ? 4 : 6) : filtered;
  const counts = useMemo(() => ({
    school: signals.filter((signal) => signal.area === 'school').length,
    bills: signals.filter((signal) => signal.area === 'bills').length,
    maintenance: signals.filter((signal) => signal.area === 'maintenance').length,
    exceptions: signals.filter((signal) => signal.kind === 'exception').length,
  }), [signals]);

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

    {loadingInbox && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-[#5f6a64]"><RefreshCw className="h-4 w-4 animate-spin" />Checking school and nursery updates...</p>}
    {inboxUnavailable && <div role="alert" className="mt-3 flex items-center justify-between gap-3 border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"><span>School inbox could not be checked. Existing tasks are still shown.</span><button type="button" onClick={() => void loadNursery()} className="min-h-10 font-semibold underline">Retry</button></div>}

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
        <button type="button" onClick={() => openSignal(signal.destination, signal.area)} className="mt-3 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#147c72] dark:text-teal-300">{signal.area === 'school' ? 'Review school & nursery' : signal.area === 'bills' ? 'Review bills' : 'Open maintenance'}<ArrowRight className="h-4 w-4" /></button>
      </article>;
    })}</div> : !loadingInbox && <div className="mt-4 border-l-2 border-emerald-500 bg-emerald-50 px-3 py-3 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">Nothing in this area needs action right now.</div>}

    {!compact && filtered.length > visible.length && <button type="button" onClick={() => setExpanded(true)} className="mt-3 min-h-10 text-sm font-semibold text-[#147c72] dark:text-teal-300">Show all {filtered.length}</button>}
  </section>;
};
