'use client';
import { ArrowRight, CheckCircle2, CircleAlert } from 'lucide-react';
import type { ProjectSourcing, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { basketLineCost, basketTotal, requirementSelection, roomName } from './bathroomProject.helpers';
import { quoteLineSelection } from '@/lib/sourcing/quoteInventory';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export default function BathroomHealthCheck({ sourcing, roomId, onOpenRequirement }: { sourcing: ProjectSourcing; roomId?: SourcingRoomId; onOpenRequirement: (requirement: SourcingRequirement, part?: string) => void }) {
  const lines = (sourcing.quoteLines ?? []).filter((line) => !roomId || line.roomId === roomId);
  const assessed = lines.map((line) => ({ line, check: quoteLineSelection(sourcing, line) }));
  const complete = assessed.filter(({ check }) => check.complete).length;
  const custom = sourcing.requirements.filter((item) => item.source === 'household' && (!roomId || item.roomId === roomId) && !lines.some((line) => line.requirementId === item.id));
  const customChecks = custom.map((item) => ({ item, check: requirementSelection(sourcing, item) }));
  const customComplete = customChecks.filter(({ check }) => check.complete).length;
  const totalItems = assessed.length + custom.length;
  const ordered = assessed.filter(({ check }) => check.selections.some(({ item }) => item.status === 'ordered')).length
    + customChecks.filter(({ check }) => check.selected.some(({ item }) => item.status === 'ordered')).length;
  const total = basketTotal(sourcing, roomId);
  const tileSpend = sourcing.basket.reduce((sum, entry) => {
    const requirement = sourcing.requirements.find((item) => item.id === entry.requirementId);
    return requirement?.category === 'Tiles' && (!roomId || requirement.roomId === roomId) ? sum + basketLineCost(sourcing, entry) : sum;
  }, 0);
  const tileShare = total ? Math.round(tileSpend / total * 100) : 0;
  const missing = [...assessed.flatMap(({ line, check }) => check.coverage.filter((part) => part.quantity < line.quantity).map((part) => ({ requirementId: line.requirementId, roomId: line.roomId, text: line.text, part: part.component }))), ...customChecks.filter(({ check }) => !check.complete).map(({ item, check }) => ({ requirementId: item.id, roomId: item.roomId, text: item.name, part: check.missing[0] ?? 'product selection' }))].slice(0, 5);
  return <section aria-label="Bathroom health check" className="space-y-3 border-y border-gray-200 py-4 dark:border-slate-700">
    <header className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">Bathroom health check</h3><p className="mt-1 text-xs text-gray-500">Quote parts matched against products in your selections and basket.</p></div><span className="shrink-0 text-sm font-semibold text-emerald-700">{complete + customComplete}/{totalItems} items covered</span></header>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Selected spend" value={money.format(total)} detail="Current basket subtotal" />
      <Metric label="Tiles" value={`${money.format(tileSpend)} · ${tileShare}%`} detail="Share of selected spend" />
      <Metric label="Ordered lines" value={`${ordered}`} detail="Items with parts marked ordered" />
      <Metric label="Still to cover" value={`${totalItems - complete - customComplete}`} detail="Quote and added items" />
    </div>
    <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-slate-800" role="img" aria-label={`Tiles account for ${tileShare} percent of selected spending`}><div className="h-full rounded-full bg-sky-600" style={{ width: `${tileShare}%` }} /></div>
    {missing.length > 0 ? <ul aria-label="Parts still needed" className="divide-y divide-gray-100 dark:divide-slate-800">{missing.map(({ requirementId, roomId: lineRoomId, text, part }, index) => {
      const requirement = sourcing.requirements.find((item) => item.id === requirementId);
      return <li key={`${requirementId}-${part}-${index}`}><button disabled={!requirement} onClick={() => requirement && onOpenRequirement(requirement, part === 'product selection' ? undefined : part)} className="flex min-h-11 w-full items-center gap-2 text-left text-xs"><CircleAlert className="h-4 w-4 shrink-0 text-amber-600" /><span className="min-w-0 flex-1"><strong>{part.replace(/-/g, ' ')}</strong><span className="text-gray-500"> · {text} · {roomName(sourcing, lineRoomId)}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-emerald-700" /></button></li>;
    })}</ul> : <p className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" />Every quoted supply part is covered by a selected product.</p>}
    <p className="text-[11px] text-gray-500">A product counts for a part only when its included-parts details are selected. Check supplier contents before ordering; unpriced boxes and delivery are not included.</p>
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0 border-l-2 border-emerald-600 pl-2"><p className="text-[11px] text-gray-500">{label}</p><p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{value}</p><p className="text-[10px] text-gray-500">{detail}</p></div>;
}
