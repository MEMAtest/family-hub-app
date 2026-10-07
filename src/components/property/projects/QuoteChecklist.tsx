'use client';

import { useState } from 'react';
import { ArrowRight, CheckCircle2, ChevronDown, ChevronUp, Circle, ImageOff, MinusCircle, Package } from 'lucide-react';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { quoteLineSelection } from '@/lib/sourcing/quoteInventory';
import { fixtureFit } from '@/lib/sourcing/fixtureFit';
import { basketStatuses, productSize, roomName } from './bathroomProject.helpers';
import QuoteSizeStatus from './QuoteSizeStatus';
import { isPrimaryOption } from '@/lib/sourcing/selection';

type Props = { sourcing: ProjectSourcing; roomId: SourcingRoomId; search?: string; onOpenRequirement: (requirement: SourcingRequirement, part?: string) => void; onOpenProduct: (product: SourcedProduct, requirement: SourcingRequirement) => void };

export default function QuoteChecklist({ sourcing, roomId, search = '', onOpenRequirement, onOpenProduct }: Props) {
  const [filter, setFilter] = useState<'all' | 'chosen' | 'missing'>('all');
  const [expanded, setExpanded] = useState(true);
  const [focusedLine, setFocusedLine] = useState('');
  const lines = sourcing.quoteLines?.filter((line) => line.roomId === roomId) ?? [];
  const complete = lines.filter((line) => quoteLineSelection(sourcing, line).complete).length;
  const chosen = lines.filter((line) => quoteLineSelection(sourcing, line).selections.length > 0).length;
  const visible = lines.filter((line) => (!focusedLine || focusedLine === line.id) && (!search.trim() || `${line.text} ${quoteLineSelection(sourcing, line).selections.map(({ product }) => product.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())) && (filter === 'all' || (filter === 'chosen' ? quoteLineSelection(sourcing, line).selections.length > 0 : !quoteLineSelection(sourcing, line).complete)));
  return <section aria-label={`${roomName(sourcing, roomId)} digital quote`} className="mt-4 min-w-0 border-y border-gray-200 py-4 dark:border-slate-700">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h4 className="text-base font-semibold">Original quote checklist</h4>
      <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{complete} of {lines.length} supply lines selected</span>
      <button aria-expanded={expanded} aria-label={expanded ? 'Collapse quote checklist' : 'Expand quote checklist'} title={expanded ? 'Collapse quote checklist' : 'Expand quote checklist'} onClick={() => setExpanded(!expanded)} className="flex min-h-11 min-w-11 items-center justify-center text-gray-600">{expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}</button>
    </div>
    <p className="mt-1 text-xs text-gray-500">R & R · 18 January 2026 · Supply of goods · Selections are not orders or fitter approval.</p>
    <progress aria-label="Quote selection progress" value={complete} max={lines.length || 1} className="mt-3 h-2 w-full accent-teal-600" />
    {expanded && <>
    <label className="mt-3 block text-xs font-medium">Quote line<select aria-label={`${roomName(sourcing, roomId)} quote line`} value={focusedLine} onChange={(event) => { setFocusedLine(event.target.value); setFilter('all'); }} className="mt-1 min-h-11 w-full min-w-0 rounded-md border-gray-200 text-sm dark:bg-slate-800"><option value="">All supply lines</option>{lines.map((line) => <option key={line.id} value={line.id}>{quoteLineSelection(sourcing, line).complete ? 'Selected' : 'Still needed'} · {line.text}</option>)}</select></label>
    <div role="group" aria-label="Quote checklist filter" className="mt-3 flex flex-wrap gap-1 border-b border-gray-100 pb-2 dark:border-slate-800">
      {([{ value: 'all', label: `All (${lines.length})` }, { value: 'chosen', label: `Chosen (${chosen})` }, { value: 'missing', label: `Still needed (${lines.length - complete})` }] as const).map((option) => <button key={option.value} type="button" aria-pressed={filter === option.value} onClick={() => setFilter(option.value)} className={`min-h-11 rounded-md px-3 text-xs font-medium ${filter === option.value ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200' : 'text-gray-600 dark:text-slate-300'}`}>{option.label}</button>)}
    </div>
    <ul aria-label={`${roomName(sourcing, roomId)} quote checklist`} className="mt-3 divide-y divide-gray-200 dark:divide-slate-700">
      {visible.map((line) => {
        const requirement = sourcing.requirements.find((item) => item.id === line.requirementId);
        const selection = quoteLineSelection(sourcing, line);
        const suggestion = sourcing.products.find((product) => product.imageUrl && product.requirementIds?.includes(line.requirementId) && line.components.some((part) => product.components.includes(part)));
        const Icon = selection.complete ? CheckCircle2 : selection.partial ? MinusCircle : Circle;
        const status = selection.complete ? 'Selected' : selection.selections.length ? selection.unknown ? 'Selected - contents unconfirmed' : 'Part selected' : 'To choose';
        return <li key={line.id} aria-label={`${line.text}: ${status}`} className="min-w-0 py-4">
          <div className="flex items-start gap-2">
            <Icon aria-hidden="true" className={`mt-0.5 h-5 w-5 shrink-0 ${selection.complete ? 'text-teal-600' : selection.partial ? 'text-amber-600' : 'text-gray-400'}`} />
            <div className="min-w-0 flex-1"><span className="text-xs font-medium text-gray-500">QUOTED · {line.quantity} ×</span><h5 className="mt-1 break-words text-sm font-medium">{line.text}</h5></div>
            <span className={`shrink-0 text-xs font-semibold ${selection.complete ? 'text-teal-700' : 'text-amber-700'}`}>{status}</span>
          </div>
          <div className="mt-3 min-w-0 sm:pl-7">
            {selection.selections.length ? <div className="space-y-3">{selection.selections.map(({ item, product }) => {
              const isPrimary = requirement && isPrimaryOption(product, requirement);
              return <div key={item.id} className="min-w-0">
                <button type="button" onClick={() => requirement && onOpenProduct(product, requirement)} disabled={!requirement} aria-label={`Inspect selected ${product.name} for ${line.text}`} className="flex min-h-16 w-full items-start gap-3 text-left">
                  <QuotePhoto key={`${product.id}-${product.imageUrl}`} product={product} />
                  <span className="min-w-0 flex-1"><span className="block text-xs text-gray-500">YOUR SELECTION</span><span className="mt-0.5 block break-words text-sm font-medium">{product.name}</span><span className="mt-1 block break-words text-xs text-gray-500">{productSize(product)} · Qty {item.quantity} · {basketStatuses.find((entry) => entry.value === item.status)?.label}</span></span>
                  <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-teal-700" />
                </button>
                {isPrimary ? <QuoteSizeStatus requirement={requirement} product={product} /> : <p className="mt-2 text-xs text-gray-500">Part specification needs checking</p>}
                {isPrimary && requirement && <p className="mt-1 text-xs text-gray-500">Room fit: {fixtureFit(requirement, product).label}</p>}
                {product.components.some((part) => !line.components.includes(part)) && <p className="mt-1 text-xs text-gray-500">Bundled product · also covers other parts. Counted once in basket.</p>}
              </div>;
            })}</div> : <div className="space-y-2"><p className="text-sm text-gray-500">No product selected</p>{suggestion && requirement ? <button onClick={() => onOpenProduct(suggestion, requirement)} className="flex min-h-16 w-full items-start gap-3 text-left"><QuotePhoto product={suggestion} /><span className="min-w-0 text-xs text-gray-500">Available option · not selected<span className="mt-1 block break-words text-sm text-gray-800 dark:text-white">{suggestion.name}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-teal-700" /></button> : <span className="flex items-center gap-3 text-xs text-gray-500"><Package aria-hidden="true" className="h-6 w-6 shrink-0" />No supplier photo available yet</span>}</div>}
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <p className={`min-w-0 break-words text-xs ${selection.complete ? 'text-teal-700' : 'text-amber-700'}`}>{selection.coverage.map((part) => `${part.component.replace(/-/g, ' ')}: ${part.quantity}/${line.quantity}`).join(' · ')}</p>
              {requirement && <button type="button" onClick={() => onOpenRequirement(requirement)} aria-label={`${selection.selections.length ? 'Change' : 'Choose'} product for ${line.text}`} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700 dark:text-teal-300">{selection.selections.length ? 'Change choice' : 'Choose product'}<ArrowRight className="h-4 w-4" /></button>}
            </div>
            {selection.unknown && <p className="mt-2 text-xs text-gray-600">Selected choice retained. Included contents need confirmation.</p>}
            {selection.deviation && <p className="mt-2 text-xs text-blue-700">Replacement selected against this original demand - quote deviation needs review.</p>}
            {selection.warnings.map((warning) => <p key={warning} role="status" className="mt-2 text-xs text-amber-800">{warning}</p>)}
            {requirement && !selection.complete && <div className="flex flex-wrap gap-2">{selection.coverage.filter((part) => part.quantity < line.quantity).map((part) => <button key={part.component} onClick={() => onOpenRequirement(requirement, part.unknown ? undefined : part.component)} className="min-h-11 text-xs font-medium text-blue-700 underline underline-offset-2">{part.unknown ? 'Confirm' : 'Find'} {part.component.replace(/-/g, ' ')}</button>)}</div>}
          </div>
        </li>;
      })}
    </ul>
    {!visible.length && <p className="py-4 text-sm text-gray-500">{search.trim() || focusedLine ? 'No lines match these filters.' : filter === 'chosen' ? 'No products selected yet.' : 'All quoted parts have selections.'}</p>}
    </>}
  </section>;
}

function QuotePhoto({ product }: { product: SourcedProduct }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-16 w-16 shrink-0 rounded-md bg-white object-contain" /> : <span role="img" aria-label={`Photo unavailable for ${product.name}`} className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md bg-gray-50 dark:bg-slate-800"><ImageOff aria-hidden="true" className="h-6 w-6 text-gray-400" /></span>;
}
