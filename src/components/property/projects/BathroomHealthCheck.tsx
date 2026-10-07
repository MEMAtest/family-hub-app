'use client';
import { ArrowRight, CircleAlert } from 'lucide-react';
import type { ProjectSourcing, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { roomName } from './bathroomProject.helpers';
import { evaluateSelection, requiredDemands } from '@/lib/sourcing/selection';
import { quoteReferenceSpend, selectedSpend } from '@/lib/sourcing/spend';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

export default function BathroomHealthCheck({ sourcing, roomId, onOpenRequirement }: { sourcing: ProjectSourcing; roomId?: SourcingRoomId; onOpenRequirement: (requirement: SourcingRequirement, part?: string) => void }) {
  const checks = requiredDemands(sourcing, roomId).map((item) => ({ item, check: evaluateSelection(sourcing, item) }));
  const complete = checks.filter(({ check }) => check.complete).length;
  const selected = checks.filter(({ check }) => check.selected.length).length;
  const ordered = checks.filter(({ check }) => check.selected.some(({ item }) => item.status === 'ordered')).length;
  const spend = selectedSpend(sourcing, roomId);
  const orderedSpend = selectedSpend(sourcing, roomId, 'ordered');
  const quote = quoteReferenceSpend(sourcing, roomId);
  const missing = checks.filter(({ check }) => !check.complete).slice(0, 5);
  const warnings = checks.flatMap(({ item, check }) => check.warnings.map((warning) => ({ id: item.id, warning })));
  return <section aria-label="Bathroom health check" className="space-y-3 border-y border-gray-200 py-4 dark:border-slate-700">
    <header className="flex flex-wrap items-start justify-between gap-3"><h3 className="text-base font-semibold">Bathroom health check</h3><span className="text-sm font-semibold text-teal-700">{complete}/{checks.length} required items covered</span></header>
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <Metric label="Selected spend" value={money.format(spend.totalPence / 100)} detail="Known purchase subtotal" />
      <Metric label="Selected items" value={String(selected)} detail="Basket-backed choices" />
      <Metric label="Ordered items" value={String(ordered)} detail="With a part marked ordered" />
      <Metric label="Still to cover" value={String(checks.length - complete)} detail="Required demands only" />
    </div>
    <dl aria-label="Cost commitments and quote reference" className="grid grid-cols-2 gap-x-4 gap-y-2 border-y border-gray-100 py-3 text-xs dark:border-slate-800">
      <dt>Ordered goods</dt><dd className="text-right font-medium">{money.format(orderedSpend.totalPence / 100)}{orderedSpend.unknown > 0 && <span className="block font-normal text-gray-500">+ {orderedSpend.unknown} costs unconfirmed</span>}</dd>
      <dt>Quoted labour reference</dt><dd className="text-right font-medium">{quote.labourPence === undefined ? 'Unknown' : money.format(quote.labourPence / 100)}</dd>
      <dt>Delivery</dt><dd className="text-right">{quote.deliveryPence === undefined ? 'Unknown - confirm separately' : money.format(quote.deliveryPence / 100)}</dd>
      <dt>Selected costs unconfirmed</dt><dd className="text-right">{spend.unknown} purchases</dd>
      {quote.reference && <><dt className="col-span-2 text-gray-500">{quote.reference.supplier} quotation dated {quote.reference.quotedOn}. Reference only, not a current invoice.</dt><dt>Original quoted goods</dt><dd className="text-right">{quote.goodsPence === undefined ? 'Unknown' : money.format(quote.goodsPence / 100)}</dd><dt>Original quotation total</dt><dd className="text-right">{quote.totalPence === undefined ? 'Unknown' : money.format(quote.totalPence / 100)}</dd></>}
      {quote.labourPence !== undefined && <><dt>Selected goods + quoted labour estimate</dt><dd className="text-right">{money.format((spend.totalPence + quote.labourPence) / 100)}<span className="block text-gray-500">Excludes delivery and unknown costs; not project total</span></dd></>}
    </dl>
    <section aria-label="Category spending">
      <h4 className="mb-2 text-sm font-semibold">Selected cost breakdown</h4>
      <table className="w-full table-fixed text-xs"><thead><tr className="border-b border-gray-200"><th className="w-2/5 py-2 text-left font-medium">Category</th><th className="py-2 text-right font-medium">Known cost</th><th className="w-16 py-2 text-right font-medium">Share</th></tr></thead><tbody>
        {spend.categories.map((entry) => <tr key={entry.category} className="border-b border-gray-100 dark:border-slate-800"><th className="break-words py-2 text-left font-normal">{entry.category}{entry.unknown > 0 && <span className="block text-[10px] text-gray-500">{entry.unknown} cost unconfirmed</span>}</th><td className="py-2 text-right">{money.format(entry.pence / 100)}</td><td className="py-2 text-right">{entry.percent.toFixed(1)}%</td></tr>)}
      </tbody><tfoot><tr><th className="py-2 text-left">Known total</th><td className="py-2 text-right font-semibold">{money.format(spend.totalPence / 100)}</td><td className="py-2 text-right">{spend.totalPence ? '100%' : '0%'}</td></tr></tfoot></table>
      <p className="mt-2 text-xs text-gray-500">{spend.unknown} selected costs unconfirmed. Delivery, labour, VAT adjustments and unselected purchases not included.</p>
    </section>
    {missing.length > 0 ? <ul aria-label="Parts still needed" className="divide-y divide-gray-100 dark:divide-slate-800">{missing.map(({ item, check }) => <li key={item.id}><button onClick={() => onOpenRequirement(item, check.unknown ? undefined : check.missing[0])} className="flex min-h-11 w-full items-center gap-2 text-left text-xs"><CircleAlert className="h-4 w-4 shrink-0 text-blue-600" /><span className="min-w-0 flex-1"><strong>{check.selected.length ? check.unknown ? 'Selected - confirm contents' : 'Selected - coverage incomplete' : 'To choose'}</strong><span className="text-gray-500"> · {item.name} · {roomName(sourcing, item.roomId)}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-teal-700" /></button></li>)}</ul> : <p className="text-sm text-teal-700">Every required demand is covered by a selected purchase.</p>}
    {warnings.map(({ id, warning }) => <p key={id + warning} role="status" className="text-xs text-amber-800">{warning}</p>)}
  </section>;
}

function Metric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="min-w-0 border-l-2 border-teal-600 pl-2"><p className="text-[11px] text-gray-500">{label}</p><p className="break-words text-sm font-semibold text-gray-900 dark:text-white">{value}</p><p className="text-[10px] text-gray-500">{detail}</p></div>;
}
