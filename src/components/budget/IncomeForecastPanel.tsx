'use client';

import { useEffect, useState } from 'react';
import { Plus, RefreshCw, TrendingUp } from 'lucide-react';
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HistoryForecast } from '@/lib/budget/historyForecast';

type Props = { familyId: string | null; refreshKey: number; onPlanIncome?: () => void };
const currency = (value: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
const monthLabel = (month: string) => new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' });

export function IncomeForecastPanel({ familyId, refreshKey, onPlanIncome }: Props) {
  const [horizon, setHorizon] = useState(6);
  const [basis, setBasis] = useState<'history' | 'plan'>('history');
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<HistoryForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!familyId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    fetch(`/api/families/${encodeURIComponent(familyId)}/budget/forecast?months=${horizon}`, { cache: 'no-store', signal: controller.signal })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Could not load forecast.');
        if (!result.window || !Array.isArray(result.history) || !Array.isArray(result.projection) || !Array.isArray(result.sources)) throw new Error('The forecast response was incomplete. Please refresh.');
        return result as HistoryForecast;
      })
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(reason => { if (!controller.signal.aborted) { setData(null); setError(reason instanceof Error ? reason.message : 'Could not load forecast.'); } })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [familyId, horizon, refreshKey, revision]);

  const ready = data?.status === 'ready';
  const next = data?.projection[0];
  const series = [
    ...(data?.history ?? []).map(point => ({
      month: monthLabel(point.month), incoming: point.income, spending: point.spending,
      expectedIncoming: null as number | null, expectedSpending: null as number | null,
    })),
    ...(ready ? data.projection : []).map(point => ({
      month: monthLabel(point.month), incoming: null as number | null, spending: null as number | null,
      expectedIncoming: basis === 'plan' ? point.plannedIncome : point.income?.expected ?? null,
      expectedSpending: point.spending?.expected ?? null,
    })),
  ];
  const plannedMode = basis === 'plan';
  const nextIncome = next ? (plannedMode ? next.plannedIncome : next.income?.expected) : null;
  const nextNet = next ? (plannedMode ? next.planIncomeNet : next.net) : null;

  return (
    <section aria-labelledby="income-forecast-title" className="border-y border-slate-200 bg-white px-4 py-5 text-slate-900 sm:px-6 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="income-forecast-title" className="flex items-center gap-2 text-lg font-semibold"><TrendingUp className="h-5 w-5 text-teal-700" />Income & forecast</h2>
        <div className="flex items-center gap-2">
          {onPlanIncome && <button type="button" onClick={onPlanIncome} className="inline-flex min-h-10 items-center gap-2 rounded-md bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"><Plus className="h-4 w-4" />Plan income</button>}
          <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading || !familyId} aria-label="Refresh history forecast" title="Refresh forecast" className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <label className="grid gap-1 text-xs text-slate-600 dark:text-slate-300">Income basis
          <select value={basis} onChange={event => setBasis(event.target.value as 'history' | 'plan')} className="min-h-10 max-w-full rounded-md border border-slate-300 bg-transparent px-2 text-sm text-slate-900 dark:text-slate-100">
            <option value="history">Historical incoming money</option><option value="plan">My saved income plan</option>
          </select>
        </label>
        <div role="group" aria-label="Forecast period" className="inline-flex rounded-md border border-slate-200 p-1">
          {[3, 6, 12].map(months => <button key={months} type="button" aria-pressed={horizon === months} onClick={() => setHorizon(months)} className={`min-h-9 rounded px-3 text-sm ${horizon === months ? 'bg-teal-700 text-white' : ''}`}>{months} months</button>)}
        </div>
      </div>
      {!familyId && <p className="mt-4 text-sm">Sign in to your household to view its forecast.</p>}
      {loading && <p role="status" className="mt-4 text-sm text-slate-500">Updating forecast...</p>}
      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
      {data && !loading && <>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{data.window.completeMonths} of 24 complete months available · {monthLabel(data.window.start)}–{monthLabel(data.window.end)} · {data.sources.map(source => source.name).join(', ') || 'No imported accounts'}</p>
        <p className="mt-1 text-xs text-slate-500">Current and incomplete months excluded. Coverage uses imported date ranges, not verified monthly statements. {data.excludedTransfers} identified transfers excluded; unidentified transfers and refunds may remain in incoming money.</p>
        {data.missingAccounts.length > 0 && <p className="mt-2 text-sm text-amber-800">Not included: {data.missingAccounts.join(', ')}. Only GBP accounts with imported history are analysed.</p>}
        {!ready && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Forecast needs at least six complete months, including the latest three. Missing months are unknown, not zero.</p>}
        {ready && next && <>
          <div className="mt-5 grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              [`${monthLabel(next.month)} ${plannedMode ? 'planned income' : 'expected incoming'}`, nextIncome],
              ['Expected spending', next.spending?.expected],
              ['Expected monthly surplus / shortfall', nextNet],
            ].map(([label, value]) => <div key={String(label)} className="min-w-0 px-2 py-3 sm:px-4"><p className="text-xs text-slate-500">{label}</p><p className={`mt-1 text-xl font-semibold ${typeof value === 'number' && value < 0 ? 'text-rose-700' : ''}`}>{typeof value === 'number' ? currency(value) : 'Unavailable'}</p></div>)}
          </div>
          {plannedMode && next.plannedIncome === 0 && <p className="mt-3 text-sm text-amber-800">No income planned for {monthLabel(next.month)}. This scenario uses £0 income, not the historical estimate.</p>}
          <p className="mt-3 text-xs text-slate-500">{plannedMode ? 'Saved income replaces historical incoming money; it is not added twice.' : 'Incoming money is not verified salary or earnings.'} Spending uses a recent six-month median blended with seasonal history when two earlier examples exist. Estimates are not guaranteed and do not predict your bank balance. This month is not projected.</p>
        </>}
        <div className="mt-5 h-72 w-full min-w-0" aria-label="24-month actual history and future cash-flow forecast">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ top: 12, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" minTickGap={32} tick={{ fontSize: 11 }} />
              <YAxis width={58} tick={{ fontSize: 11 }} tickFormatter={value => `£${(Number(value) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}k`} />
              <Tooltip formatter={(value: number) => currency(value)} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="linear" dataKey="incoming" name="Actual incoming" stroke="#0f766e" isAnimationActive={false} dot={false} connectNulls={false} />
              <Line type="linear" dataKey="spending" name="Actual spending" stroke="#be123c" isAnimationActive={false} dot={false} connectNulls={false} />
              <Line type="linear" dataKey="expectedIncoming" name={plannedMode ? 'Planned income' : 'Expected incoming'} stroke="#0f766e" isAnimationActive={false} strokeDasharray="5 4" dot={false} />
              <Line type="linear" dataKey="expectedSpending" name="Expected spending" stroke="#be123c" isAnimationActive={false} strokeDasharray="5 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {ready && <>
          <p id="forecast-range-note" className="mt-4 text-xs text-slate-500">Forecast ranges reflect past monthly variation (10th–90th percentiles), not a confidence guarantee. Planned bills are shown separately, not added to historical spending.</p>
          <div className="mt-2 overflow-x-auto"><table aria-label="Monthly forecast" aria-describedby="forecast-range-note" className="w-full min-w-[580px] text-left text-sm">
            <thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pr-3">Month</th><th className="px-3 py-2">{plannedMode ? 'Planned income' : 'Incoming estimate'}</th><th className="px-3 py-2">Spending estimate</th><th className="px-3 py-2">Surplus / shortfall</th><th className="px-3 py-2">Planned bills</th></tr></thead>
            <tbody>{data.projection.map(point => {
              const net = plannedMode ? point.planIncomeNet : point.net;
              const low = plannedMode && point.spending ? point.plannedIncome - point.spending.high : point.netLow;
              const high = plannedMode && point.spending ? point.plannedIncome - point.spending.low : point.netHigh;
              return <tr key={point.month} className="border-b border-slate-100 align-top"><th className="py-3 pr-3 font-medium">{monthLabel(point.month)}</th><td className="px-3 py-3">{currency(plannedMode ? point.plannedIncome : point.income?.expected ?? 0)}<span className="mt-1 block text-xs text-slate-500">{!plannedMode && point.income ? `${currency(point.income.low)}–${currency(point.income.high)}` : 'Saved plan'}</span></td><td className="px-3 py-3">{currency(point.spending?.expected ?? 0)}<span className="mt-1 block text-xs text-slate-500">{point.spending ? `${currency(point.spending.low)}–${currency(point.spending.high)}` : ''}</span></td><td className={`px-3 py-3 ${net !== null && net < 0 ? 'text-rose-700' : 'text-teal-700'}`}>{net === null ? 'Unavailable' : currency(net)}<span className="mt-1 block text-xs text-slate-500">{low !== null && high !== null ? `${currency(low)}–${currency(high)}` : ''}</span></td><td className="px-3 py-3">{currency(point.plannedExpenses)}</td></tr>;
            })}</tbody>
          </table></div>
        </>}
        {data.backtest && <p className="mt-3 text-xs text-slate-500">Rolling check against {data.backtest.months} historical months, using only earlier data: average monthly error {currency(data.backtest.incomeError)} incoming · {currency(data.backtest.spendingError)} spending · {currency(data.backtest.netError)} net. Past error does not guarantee future accuracy.</p>}
      </>}
    </section>
  );
}
