'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cashFlowDate, cashFlowMoney, type CashFlow } from '@/lib/budget/cashFlow';

export function BankTransactionDetails({ data }: { data: CashFlow }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const rows = useMemo(() => data.transactions.filter(item => `${item.description} ${item.category ?? ''} ${item.accountName}`.toLowerCase().includes(query.toLowerCase())), [data.transactions, query]);
  const maxPage = Math.max(0, Math.ceil(rows.length / 20) - 1);
  const currentPage = Math.min(page, maxPage);
  return <details className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
    <summary className="cursor-pointer text-sm font-semibold">Imported transactions ({data.transactions.length})</summary>
    <label className="mt-3 flex max-w-lg items-center gap-2 rounded-md border border-slate-300 px-3"><Search className="h-4 w-4 shrink-0 text-slate-400" /><span className="sr-only">Search imported transactions</span><input type="search" value={query} onChange={event => { setQuery(event.target.value); setPage(0); }} placeholder="Search merchant, category or account" className="min-h-10 min-w-0 flex-1 border-0 bg-transparent text-sm focus:ring-0" /></label>
    <p className="mt-2 text-xs text-slate-500">Imported categories may need review. Transfer rows stay visible but are excluded from spending and incoming totals.</p>
    <div className="mt-3 overflow-x-auto"><table aria-label="Imported bank transactions" className="w-full min-w-[560px] text-left text-sm"><thead className="border-b border-slate-200 text-xs text-slate-500"><tr><th className="py-2 pr-3">Date</th><th className="px-3 py-2">Description / source</th><th className="px-3 py-2">Category</th><th className="px-3 py-2 text-right">Amount</th></tr></thead><tbody>{rows.slice(currentPage * 20, currentPage * 20 + 20).map(item => <tr key={item.id} className="border-b border-slate-100 align-top"><td className="whitespace-nowrap py-3 pr-3">{cashFlowDate(item.transactionDate)}</td><td className="px-3 py-3"><p className="max-w-md break-words">{item.description}</p><p className="mt-1 text-xs text-slate-500">{item.accountName}</p></td><td className="px-3 py-3">{item.transactionType === 'transfer' ? 'Transfer (excluded)' : item.category || 'Uncategorised'}</td><td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{item.direction === 'debit' ? '-' : '+'}{cashFlowMoney(item.amount)}</td></tr>)}</tbody></table></div>
    {!rows.length && <p className="mt-3 text-sm text-slate-500">No matching imported transactions.</p>}
    <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span>{rows.length} matches · Page {currentPage + 1} of {maxPage + 1}</span><div className="flex gap-2"><button type="button" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous transaction page" title="Previous page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><button type="button" disabled={currentPage >= maxPage} onClick={() => setPage(currentPage + 1)} aria-label="Next transaction page" title="Next page" className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div></div>
  </details>;
}
