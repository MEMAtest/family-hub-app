'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CircleCheck, FolderKanban, Landmark, RefreshCw, WalletCards } from 'lucide-react';

type CashFlow = {
  month: string;
  summary: {
    actualIncome: number;
    actualSpend: number;
    actualNet: number;
    plannedIncome: number;
    plannedExpenses: number;
    plannedNet: number;
    forecastNet: number | null;
    forecastStatus: 'unreconciled';
  };
  categorySpend: Array<{ category: string; amount: number }>;
  reconciliations: Array<{ accountId: string; accountName: string; mismatch: number | null; reconciled: boolean | null }>;
  connections: {
    planned: { incomeItems: number; expenseItems: number; excludedQaItems?: number };
    accounts: Array<{ id: string; name: string; institution: string | null; importCount: number; transactionCount: number; lastImportAt: string | null; statementThrough: string | null }>;
    property: { projects: Array<{ id: string; title: string; status: string; selectedCost: number; unknownCostItems: number; quoteReference: number | null; actualSpend: number | null }>; updatedAt: string | null };
  };
};

const formatMoney = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Never';

export function ActualCashFlowPanel({ familyId, month, refreshKey = 0 }: { familyId: string | null; month: string; refreshKey?: number }) {
  const [data, setData] = useState<CashFlow | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const refresh = async () => {
    if (!familyId) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/families/${familyId}/budget/cash-flow?month=${month}`);
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Could not load actual cash flow.');
      setData(body);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not load actual cash flow.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void refresh(); }, [familyId, month, refreshKey]);

  const hasMismatch = useMemo(() => data?.reconciliations.some((item) => item.reconciled === false) ?? false, [data]);
  const hasActualTransactions = Boolean(
    data && (data.summary.actualIncome !== 0 || data.summary.actualSpend !== 0)
  );

  if (!familyId) return null;
  return (
    <section className="mb-6 border-y border-[#dbe6df] bg-white px-4 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><WalletCards className="h-4 w-4 text-[#147c72]" /><h2 className="text-base font-semibold text-[#18221f] dark:text-slate-100">Actual cash flow</h2></div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Imported statement transactions are separate from planned bills.</p>
        </div>
        <button type="button" onClick={refresh} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title="Refresh actual cash flow" aria-label="Refresh actual cash flow"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>
      {error && <p className="mt-4 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
      {!error && data && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 sm:grid-cols-4 dark:border-slate-700 dark:bg-slate-700">
            {[
              ['Actual in', data.summary.actualIncome, 'text-[#147c72]'],
              ['Actual out', data.summary.actualSpend, 'text-rose-700'],
              ['Actual balance', data.summary.actualNet, data.summary.actualNet >= 0 ? 'text-[#147c72]' : 'text-rose-700'],
              ['Plan balance', data.summary.plannedNet, data.summary.plannedNet >= 0 ? 'text-[#147c72]' : 'text-rose-700'],
            ].map(([label, value, colour]) => <div key={String(label)} className="bg-white p-3 dark:bg-slate-900"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-lg font-semibold ${colour}`}>{formatMoney(Number(value))}</p></div>)}
          </div>
          {!hasActualTransactions && (
            <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
              No statement transactions have been imported for this month. The plan is shown separately and is not presented as actual savings.
            </p>
          )}
          {(data.categorySpend.length > 0 || data.reconciliations.length > 0) && <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actual spending</p><div className="mt-2 space-y-2">{data.categorySpend.slice(0, 5).map((item) => <div key={item.category} className="flex justify-between text-sm"><span>{item.category}</span><span className="font-medium">{formatMoney(item.amount)}</span></div>)}{data.categorySpend.length === 0 && <p className="text-sm text-slate-500">No statement transactions for this month yet.</p>}</div></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account reconciliation</p><div className="mt-2 space-y-2">{data.reconciliations.map((item) => <div key={item.accountId} className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-slate-400" />{item.accountName}</span><span className={item.reconciled === false ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-slate-500'}>{item.reconciled === false ? `${formatMoney(Math.abs(item.mismatch || 0))} to check` : item.reconciled ? 'Matched' : 'Balance unavailable'}</span></div>)}</div></div>
          </div>}
          {hasMismatch && <p className="mt-4 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200"><AlertCircle className="h-4 w-4" />One or more imported statement balances do not reconcile with the transactions in this month.</p>}
          <div className="mt-5 border-t border-[#dbe6df] pt-4 dark:border-slate-800">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div><h3 className="text-sm font-semibold text-[#18221f] dark:text-slate-100">Money index</h3><p className="mt-1 text-xs text-slate-500">What is connected, what is current, and what still sits outside cash flow.</p></div>
              <span className="text-xs text-slate-500">{data.connections.planned.incomeItems} income · {data.connections.planned.expenseItems} expense plans</span>
            </div>
            <div className="mt-3 divide-y divide-[#e4ebe7] border-y border-[#e4ebe7] dark:divide-slate-800 dark:border-slate-800">
              {data.connections.accounts.length === 0 ? <div className="flex min-h-14 items-center gap-3 py-3"><Landmark className="h-4 w-4 text-amber-600" /><div><p className="text-sm font-medium">Bank accounts</p><p className="text-xs text-slate-500">No account source connected. Import a statement to establish the first account.</p></div></div> : data.connections.accounts.map((account) => <div key={account.id} className="flex min-h-14 items-center gap-3 py-3"><Landmark className="h-4 w-4 text-[#147c72]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{account.name}{account.institution ? ` · ${account.institution}` : ''}</p><p className="text-xs text-slate-500">{account.transactionCount} transactions · latest import {formatDate(account.lastImportAt)}{account.statementThrough ? ` · statement to ${formatDate(account.statementThrough)}` : ''}</p></div>{account.importCount > 0 && <CircleCheck className="h-4 w-4 text-emerald-600" aria-label="Statement source connected" />}</div>)}
              {data.connections.property.projects.length === 0 ? <div className="flex min-h-14 items-center gap-3 py-3"><FolderKanban className="h-4 w-4 text-slate-400" /><div><p className="text-sm font-medium">Property projects</p><p className="text-xs text-slate-500">No project commitments found.</p></div></div> : data.connections.property.projects.map((project) => <div key={project.id} className="flex min-h-14 items-center gap-3 py-3"><FolderKanban className="h-4 w-4 text-blue-600" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{project.title}</p><p className="text-xs text-slate-500">{formatMoney(project.selectedCost)} selected{project.quoteReference !== null ? ` · ${formatMoney(project.quoteReference)} quote reference` : ''}{project.unknownCostItems ? ` · ${project.unknownCostItems} price${project.unknownCostItems === 1 ? '' : 's'} unknown` : ''}</p></div><span className="text-[11px] font-medium text-blue-700 dark:text-blue-300">Not cash yet</span></div>)}
            </div>
            {Boolean(data.connections.planned.excludedQaItems) && <p className="mt-3 text-xs text-amber-700">{data.connections.planned.excludedQaItems} test or rehearsal rows are excluded from the money index.</p>}
            <p className="mt-3 text-xs text-slate-500">Selected project products and quote references are planning commitments. They enter actual cash flow only after a bank statement or recorded payment confirms them.</p>
          </div>
        </>
      )}
    </section>
  );
}
