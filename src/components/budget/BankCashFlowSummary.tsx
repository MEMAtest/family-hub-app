'use client';

import { RefreshCw } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cashFlowDate, cashFlowMoney, cashFlowMonth, hasKnownActuals, type CashFlow } from '@/lib/budget/cashFlow';

type Props = { data: CashFlow | null; loading: boolean; error: string; hidden?: boolean; onRefresh?: () => void };

export function BankCashFlowSummary({ data, loading, error, hidden = false, onRefresh }: Props) {
  if (loading) return <p role="status" className="mt-4 text-sm text-slate-500">Loading imported bank figures...</p>;
  if (error) return <div className="mt-4"><p role="alert" className="text-sm text-rose-700">{error}</p>{onRefresh && <button type="button" onClick={onRefresh} className="mt-2 inline-flex items-center gap-2 text-sm text-teal-700"><RefreshCw className="h-4 w-4" />Retry bank summary</button>}</div>;
  if (!data) return <p className="mt-4 text-sm text-slate-500">Bank figures unavailable. Sign in and import a statement.</p>;
  const known = hasKnownActuals(data);
  const series = [
    { name: 'Actual in', amount: data.summary.actualIncome, fill: '#0f766e' },
    { name: 'Actual out', amount: data.summary.actualSpend, fill: '#be123c' },
    { name: 'Actual net flow', amount: data.summary.actualNet, fill: '#2563eb' },
  ];
  return <div data-testid="bank-cash-flow-summary" className="mt-4 min-w-0">
    <p className="text-sm text-slate-600 dark:text-slate-300">{cashFlowMonth(data.month)} · {data.coverage.status === 'complete' ? 'Imported full-month range' : data.coverage.status === 'partial' ? 'Partial imported month' : 'No imported coverage'} · {data.coverage.transactionCount} transactions</p>
    {data.coverage.lastTransactionDate && <p className="mt-1 text-xs text-slate-500">Latest transaction: {cashFlowDate(data.coverage.lastTransactionDate)}. Source: {data.connections.accounts.filter(account => account.importCount > 0).map(account => account.name).join(', ') || 'No imported account'}.</p>}
    <p className="mt-1 text-xs text-slate-500">Statement transactions only, not saved bill plans or forecasts. Identified transfers are excluded. Net flow is not your bank balance.</p>
    {!known && <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">No statement transactions are available for this month. Amounts are unavailable, not zero; saved plans are not substituted.</p>}
    <dl className="mt-4 grid grid-cols-1 divide-y divide-slate-200 border-y border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0 dark:divide-slate-700 dark:border-slate-700">
      {series.map(item => <div key={item.name} className="min-w-0 px-3 py-3"><dt className="text-xs font-medium text-slate-500">{item.name}</dt><dd className="mt-1 break-words text-xl font-semibold text-slate-900 dark:text-slate-100">{hidden ? 'Hidden' : known ? cashFlowMoney(item.amount) : 'Unavailable'}</dd></div>)}
    </dl>
    {hidden ? <p className="mt-3 text-sm text-slate-500">Financial values hidden.</p> : known && <div className="mt-4 h-56 w-full min-w-0" aria-label="Imported monthly cash flow chart">
      <ResponsiveContainer width="100%" height="100%"><BarChart data={series} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis width={64} tick={{ fontSize: 11 }} tickFormatter={value => `£${(Number(value) / 1000).toLocaleString('en-GB', { maximumFractionDigits: 1 })}k`} />
        <Tooltip formatter={(value: number) => cashFlowMoney(value)} /><Bar dataKey="amount" name="Imported amount" isAnimationActive={false} radius={[4, 4, 0, 0]}>{series.map(item => <Cell key={item.name} fill={item.fill} />)}</Bar>
      </BarChart></ResponsiveContainer>
    </div>}
  </div>;
}
