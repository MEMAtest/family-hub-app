'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Landmark, RefreshCw, WalletCards } from 'lucide-react';

type CashFlow = {
  month: string;
  summary: {
    actualIncome: number;
    actualSpend: number;
    actualNet: number;
    plannedIncome: number;
    plannedExpenses: number;
    forecastNet: number;
  };
  categorySpend: Array<{ category: string; amount: number }>;
  reconciliations: Array<{ accountId: string; accountName: string; mismatch: number | null; reconciled: boolean | null }>;
};

const formatMoney = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);

export function ActualCashFlowPanel({ familyId, month }: { familyId: string | null; month: string }) {
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

  useEffect(() => { void refresh(); }, [familyId, month]);

  const hasMismatch = useMemo(() => data?.reconciliations.some((item) => item.reconciled === false) ?? false, [data]);

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
              ['Planned remaining', data.summary.plannedExpenses - data.summary.plannedIncome, 'text-slate-700 dark:text-slate-200'],
              ['Month-end forecast', data.summary.forecastNet, data.summary.forecastNet >= 0 ? 'text-[#147c72]' : 'text-rose-700'],
            ].map(([label, value, colour]) => <div key={String(label)} className="bg-white p-3 dark:bg-slate-900"><p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 text-lg font-semibold ${colour}`}>{formatMoney(Number(value))}</p></div>)}
          </div>
          {(data.categorySpend.length > 0 || data.reconciliations.length > 0) && <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Actual spending</p><div className="mt-2 space-y-2">{data.categorySpend.slice(0, 5).map((item) => <div key={item.category} className="flex justify-between text-sm"><span>{item.category}</span><span className="font-medium">{formatMoney(item.amount)}</span></div>)}{data.categorySpend.length === 0 && <p className="text-sm text-slate-500">No statement transactions for this month yet.</p>}</div></div>
            <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Account reconciliation</p><div className="mt-2 space-y-2">{data.reconciliations.map((item) => <div key={item.accountId} className="flex items-center justify-between gap-3 text-sm"><span className="inline-flex items-center gap-1.5"><Landmark className="h-3.5 w-3.5 text-slate-400" />{item.accountName}</span><span className={item.reconciled === false ? 'font-medium text-amber-700 dark:text-amber-300' : 'text-slate-500'}>{item.reconciled === false ? `${formatMoney(Math.abs(item.mismatch || 0))} to check` : item.reconciled ? 'Matched' : 'Balance unavailable'}</span></div>)}</div></div>
          </div>}
          {hasMismatch && <p className="mt-4 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200"><AlertCircle className="h-4 w-4" />One or more imported statement balances do not reconcile with the transactions in this month.</p>}
        </>
      )}
    </section>
  );
}
