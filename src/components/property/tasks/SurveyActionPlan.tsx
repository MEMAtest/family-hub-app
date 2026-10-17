'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  FileSearch,
  PoundSterling,
  Search,
  ShieldAlert,
  Wrench,
} from 'lucide-react';
import {
  contractorSpecialtyForTask,
  orderedSurveyTasks,
  surveyActionLane,
  surveyPlanSummary,
  surveyWorkPackages,
  type SurveyActionLane,
} from '@/lib/property/surveyActionPlan';
import { CONTRACTOR_SPECIALTIES } from '@/types/contractor.types';
import type { PropertyTask, PropertyTaskStatus } from '@/types/property.types';

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const laneContent: Record<SurveyActionLane, { label: string; className: string }> = {
  act_now: { label: 'Action now', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200' },
  verify_work: { label: 'Check proof', className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200' },
  plan_next: { label: 'Plan next', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' },
  complete: { label: 'Complete', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' },
};

type LaneFilter = 'all' | SurveyActionLane;

const postcodeFrom = (address?: string) => address?.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i)?.[1] ?? 'SE20 7UA';

const tradeLabel = (value: string) => CONTRACTOR_SPECIALTIES.find((item) => item.value === value)?.label ?? 'Specialist';

const contractorHref = ({ task, address }: { task: PropertyTask; address?: string }) => ({
  pathname: '/',
  query: {
    view: 'contractors',
    taskId: task.id,
    trade: contractorSpecialtyForTask(task),
    query: task.recommendedContractor || task.category,
    location: postcodeFrom(address),
    auto: '1',
  },
});

interface SurveyActionPlanProps {
  tasks: PropertyTask[];
  propertyAddress?: string;
  isReadOnly?: boolean;
  onStatusChange: (taskId: string, status: PropertyTaskStatus) => void;
}

export const SurveyActionPlan = ({
  tasks,
  propertyAddress,
  isReadOnly = false,
  onStatusChange,
}: SurveyActionPlanProps) => {
  const [showAll, setShowAll] = useState(false);
  const [query, setQuery] = useState('');
  const [laneFilter, setLaneFilter] = useState<LaneFilter>('all');
  const summary = useMemo(() => surveyPlanSummary(tasks), [tasks]);
  const ordered = useMemo(() => orderedSurveyTasks(tasks), [tasks]);
  const packages = useMemo(() => surveyWorkPackages(tasks), [tasks]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return ordered.filter((task) => {
      const laneMatches = laneFilter === 'all' || surveyActionLane(task) === laneFilter;
      const textMatches = !needle || [task.title, task.category, task.surveyEvidence, task.recommendedContractor]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(needle));
      return laneMatches && textMatches;
    });
  }, [laneFilter, ordered, query]);
  const visible = showAll || query.trim() || laneFilter !== 'all' ? filtered : filtered.slice(0, 8);

  if (summary.total === 0) return null;

  const filters: Array<{ id: LaneFilter; label: string; count: number }> = [
    { id: 'all', label: 'All actions', count: summary.total },
    { id: 'act_now', label: 'Action now', count: summary.actNow },
    { id: 'verify_work', label: 'Check proof', count: summary.verifyWork },
    { id: 'plan_next', label: 'Plan next', count: summary.planNext },
    { id: 'complete', label: 'Complete', count: summary.complete },
  ];

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-4 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <ClipboardCheck className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950 dark:text-white">Building survey actions</h2>
                <p className="text-xs text-slate-500">RICS Level 3 survey · issued 16 January 2024</p>
              </div>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-5 text-slate-600 dark:text-slate-300">
              Survey findings are shown separately from app estimates and your completion records, so it is clear what the surveyor said and what still needs proof.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            {summary.foldedExtracts > 0 ? `${summary.foldedExtracts} raw text extracts remain in the full register` : 'All survey records shown'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {filters.slice(1).map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setLaneFilter((current) => current === filter.id ? 'all' : filter.id)}
              className={`min-h-20 rounded-md border p-3 text-left transition ${laneFilter === filter.id ? 'border-blue-500 bg-blue-50 shadow-[inset_0_0_0_1px_#3b82f6] dark:bg-blue-500/10' : 'border-slate-200 bg-white hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900'}`}
            >
              <p className="text-xs font-medium text-slate-500">{filter.label}</p>
              <p className="mt-1 text-2xl font-semibold text-slate-950 dark:text-white">{filter.count}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search survey actions, trades or evidence"
              className="min-h-11 w-full rounded-md border border-slate-200 bg-white pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div className="scrollbar-hide flex gap-2 overflow-x-auto pb-1 lg:pb-0" aria-label="Survey action filters">
            {filters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => setLaneFilter(filter.id)}
                className={`min-h-9 shrink-0 rounded-md border px-3 text-xs font-semibold ${laneFilter === filter.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'}`}
              >
                {filter.label} <span className="ml-1 opacity-75">{filter.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5">
        <div className="hidden grid-cols-[minmax(0,1.55fr)_minmax(8rem,.55fr)_minmax(8rem,.5fr)_minmax(14rem,.75fr)] gap-4 border-b border-slate-200 pb-2 text-[11px] font-semibold uppercase text-slate-500 lg:grid">
          <span>Survey action</span><span>Trade</span><span>Estimate</span><span>Next action</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {visible.map((task) => {
            const lane = surveyActionLane(task);
            const presentation = laneContent[lane];
            const startStatus: PropertyTaskStatus = task.status === 'verify' ? 'completed' : 'in_progress';
            const specialty = contractorSpecialtyForTask(task);
            return (
              <article key={task.id} id={`survey-task-${task.id}`} className="py-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1.55fr)_minmax(8rem,.55fr)_minmax(8rem,.5fr)_minmax(14rem,.75fr)] lg:gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded px-2 py-1 text-[11px] font-semibold ${presentation.className}`}>{presentation.label}</span>
                      <span className="text-xs text-slate-500">{task.pageReference || 'Survey reference'}</span>
                    </div>
                    <h3 className="mt-2 text-sm font-semibold leading-5 text-slate-950 dark:text-white">{task.title}</h3>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Survey finding</p>
                    <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{task.surveyEvidence || task.impact}</p>
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="mb-1 block font-semibold text-slate-500 lg:hidden">Trade</span>
                    {task.recommendedContractor || tradeLabel(specialty)}
                  </div>
                  <div className="text-xs text-slate-600 dark:text-slate-300">
                    <span className="mb-1 block font-semibold text-slate-500 lg:hidden">App estimate</span>
                    {task.defaultCostRange ? (
                      <><span className="font-semibold text-slate-900 dark:text-white">{money.format(task.defaultCostRange.min)}–{money.format(task.defaultCostRange.max)}</span><span className="mt-0.5 block text-[11px] text-slate-500">Not supplied by survey</span></>
                    ) : 'Not estimated'}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                    <Link href={contractorHref({ task, address: propertyAddress })} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-blue-600 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-200 dark:hover:bg-blue-500/10">
                      <Search className="h-3.5 w-3.5" />Find {tradeLabel(specialty)}
                    </Link>
                    {!isReadOnly && lane !== 'complete' && (
                      <button onClick={() => onStatusChange(task.id, startStatus)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                        {task.status === 'verify' ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                        {task.status === 'verify' ? 'Confirm done' : task.status === 'in_progress' ? 'In progress' : 'Start action'}
                      </button>
                    )}
                    {lane === 'complete' && <span className="inline-flex min-h-10 items-center gap-2 rounded-md bg-emerald-50 px-3 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-3.5 w-3.5" />Your record: complete</span>}
                  </div>
                </div>
              </article>
            );
          })}
          {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No survey actions match this view.</p>}
        </div>
        {filtered.length > 8 && !query.trim() && laneFilter === 'all' && (
          <button onClick={() => setShowAll((value) => !value)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-200">
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAll ? 'Show priority actions only' : `Show all ${filtered.length} actions`}
          </button>
        )}
      </div>

      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60 sm:px-5">
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-slate-950 dark:text-white">Contractor work packages</h3>
            <p className="text-xs text-slate-500">Bundle related findings when asking companies for evidence and quotes.</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((item) => {
            const first = item.tasks[0];
            return (
              <div key={item.key} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.contractor}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.tasks.length} action{item.tasks.length === 1 ? '' : 's'} · {item.urgentCount} urgent · {item.verifyCount} to verify</p>
                </div>
                <Link href={contractorHref({ task: first, address: propertyAddress })} aria-label={`Find options for ${item.contractor}`} title={`Find options for ${item.contractor}`} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-slate-200 text-blue-700 hover:border-blue-500 dark:border-slate-700 dark:text-blue-300">
                  <Search className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-px border-t border-slate-200 bg-slate-200 text-xs dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3">
        <div className="flex items-center gap-2 bg-white p-3 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><ShieldAlert className="h-4 w-4 text-rose-500" />Unknown work remains open.</div>
        <div className="flex items-center gap-2 bg-white p-3 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><FileSearch className="h-4 w-4 text-violet-500" />Proof means an invoice, certificate or photo.</div>
        <div className="flex items-center gap-2 bg-white p-3 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><PoundSterling className="h-4 w-4 text-emerald-500" />Estimates are app planning figures, not survey costs.</div>
      </div>
    </section>
  );
};
