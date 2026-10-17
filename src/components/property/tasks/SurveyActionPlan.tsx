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
} from '@/lib/property/surveyActionPlan';
import { CONTRACTOR_SPECIALTIES } from '@/types/contractor.types';
import type { PropertyTask, PropertyTaskStatus } from '@/types/property.types';

const money = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
});

const laneContent = {
  act_now: { label: 'Action needed', className: 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-200' },
  verify_work: { label: 'Check what was done', className: 'bg-violet-50 text-violet-700 dark:bg-violet-500/15 dark:text-violet-200' },
  plan_next: { label: 'Plan next', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200' },
  complete: { label: 'Recorded complete', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200' },
} as const;

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
  const summary = useMemo(() => surveyPlanSummary(tasks), [tasks]);
  const ordered = useMemo(() => orderedSurveyTasks(tasks).filter((task) => task.status !== 'completed'), [tasks]);
  const packages = useMemo(() => surveyWorkPackages(tasks), [tasks]);
  const visible = showAll ? ordered : ordered.slice(0, 8);

  if (summary.total === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-teal-200 bg-white dark:border-teal-900 dark:bg-slate-900">
      <div className="border-b border-teal-100 bg-teal-50 p-4 dark:border-teal-900 dark:bg-teal-950/30 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-teal-700 dark:text-teal-300" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">Survey action plan</h2>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-slate-300">
              The building survey translated into clear work, proof to collect and trades to contact.
            </p>
          </div>
          <div className="text-xs text-gray-500 dark:text-slate-400">
            RICS Level 3 survey
            {summary.foldedExtracts > 0 && <span className="block">{summary.foldedExtracts} duplicate text extracts folded into the checked actions</span>}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-teal-100 bg-teal-100 dark:border-teal-900 dark:bg-teal-900 sm:grid-cols-4">
          <div className="bg-white p-3 dark:bg-slate-900"><p className="text-xs text-gray-500">Action now</p><p className="mt-1 text-xl font-semibold text-rose-700 dark:text-rose-300">{summary.actNow}</p></div>
          <div className="bg-white p-3 dark:bg-slate-900"><p className="text-xs text-gray-500">Check proof</p><p className="mt-1 text-xl font-semibold text-violet-700 dark:text-violet-300">{summary.verifyWork}</p></div>
          <div className="bg-white p-3 dark:bg-slate-900"><p className="text-xs text-gray-500">Plan next</p><p className="mt-1 text-xl font-semibold text-amber-700 dark:text-amber-300">{summary.planNext}</p></div>
          <div className="bg-white p-3 dark:bg-slate-900"><p className="text-xs text-gray-500">Complete</p><p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-300">{summary.complete} / {summary.total}</p></div>
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">What to do next</h3>
            <p className="text-xs text-gray-500">Urgent unresolved work first, followed by work that needs evidence.</p>
          </div>
          <span className="text-xs font-medium text-gray-500">{ordered.length} open</span>
        </div>
        <div className="mt-3 divide-y divide-gray-100 border-y border-gray-100 dark:divide-slate-800 dark:border-slate-800">
          {visible.map((task) => {
            const lane = surveyActionLane(task);
            const presentation = laneContent[lane];
            const startStatus: PropertyTaskStatus = task.status === 'verify' ? 'completed' : 'in_progress';
            return (
              <article key={task.id} id={`survey-task-${task.id}`} className="py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${presentation.className}`}>{presentation.label}</span>
                      <span className="text-xs text-gray-500">{task.pageReference || 'Survey reference'}</span>
                    </div>
                    <h4 className="mt-2 text-sm font-semibold leading-5 text-gray-900 dark:text-slate-100">{task.title}</h4>
                    <p className="mt-1 text-xs leading-5 text-gray-600 dark:text-slate-300">{task.surveyEvidence || task.impact}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>{task.recommendedContractor || 'Specialist to confirm'}</span>
                      {task.defaultCostRange && <span>{money.format(task.defaultCostRange.min)}–{money.format(task.defaultCostRange.max)} survey allowance</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2 sm:max-w-[17rem] sm:justify-end">
                    <Link href={contractorHref({ task, address: propertyAddress })} className="inline-flex min-h-10 items-center gap-2 rounded-md border border-teal-700 px-3 text-xs font-semibold text-teal-800 hover:bg-teal-50 dark:text-teal-200 dark:hover:bg-teal-950">
                      <Search className="h-3.5 w-3.5" />Find {tradeLabel(contractorSpecialtyForTask(task))}
                    </Link>
                    {!isReadOnly && (
                      <button onClick={() => onStatusChange(task.id, startStatus)} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-gray-900 px-3 text-xs font-semibold text-white hover:bg-gray-700 dark:bg-white dark:text-slate-900">
                        {task.status === 'verify' ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
                        {task.status === 'verify' ? 'Confirm done' : task.status === 'in_progress' ? 'In progress' : 'Start action'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {ordered.length > 8 && (
          <button onClick={() => setShowAll((value) => !value)} className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-teal-800 dark:text-teal-200">
            {showAll ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showAll ? 'Show priority actions only' : `Show all ${ordered.length} open actions`}
          </button>
        )}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 p-4 dark:border-slate-800 dark:bg-slate-950/60 sm:p-5">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-amber-600" />
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-slate-100">Contractor work packages</h3>
            <p className="text-xs text-gray-500">Contact one suitable company about related actions together, then compare evidence and quotes.</p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {packages.map((item) => {
            const first = item.tasks[0];
            return (
              <div key={item.key} className="border-l-4 border-amber-400 bg-white p-3 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{item.contractor}</p>
                    <p className="mt-1 text-xs text-gray-500">{item.tasks.length} action{item.tasks.length === 1 ? '' : 's'} · {item.urgentCount} urgent · {item.verifyCount} to verify</p>
                  </div>
                  <Link href={contractorHref({ task: first, address: propertyAddress })} aria-label={`Find options for ${item.contractor}`} title={`Find options for ${item.contractor}`} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-gray-200 text-teal-700 hover:border-teal-500 dark:border-slate-700 dark:text-teal-300">
                    <Search className="h-4 w-4" />
                  </Link>
                </div>
                <ul className="mt-3 space-y-2">
                  {item.tasks.slice(0, 3).map((task) => <li key={task.id} className="flex gap-2 text-xs leading-5 text-gray-600 dark:text-slate-300"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />{task.title}</li>)}
                  {item.tasks.length > 3 && <li className="text-xs font-medium text-gray-500">+ {item.tasks.length - 3} more in this package</li>}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-px border-t border-gray-200 bg-gray-200 text-xs dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-3">
        <div className="flex items-center gap-2 bg-white p-3 text-gray-600 dark:bg-slate-900 dark:text-slate-300"><ShieldAlert className="h-4 w-4 text-rose-500" />Unknown is kept visible, not treated as complete.</div>
        <div className="flex items-center gap-2 bg-white p-3 text-gray-600 dark:bg-slate-900 dark:text-slate-300"><FileSearch className="h-4 w-4 text-violet-500" />“Verify” means collect an invoice, certificate or photo.</div>
        <div className="flex items-center gap-2 bg-white p-3 text-gray-600 dark:bg-slate-900 dark:text-slate-300"><CheckCircle2 className="h-4 w-4 text-emerald-500" />Completed work stays in the full register below.</div>
      </div>
    </section>
  );
};
