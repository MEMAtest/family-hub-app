import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { evaluateSelection, isPrimaryOption } from '@/lib/sourcing/selection';
import { basketCostPence } from '@/lib/sourcing/spend';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
export default function SelectedChoiceSummary({ sourcing, requirement, onOpen, onBack }: { sourcing: ProjectSourcing; requirement: SourcingRequirement; onOpen: (product: SourcedProduct, requirement: SourcingRequirement) => void; onBack: () => void }) {
  const check = evaluateSelection(sourcing, requirement);
  const choices = [...check.selected].sort((a, b) => Number(isPrimaryOption(b.product, check.demand)) - Number(isPrimaryOption(a.product, check.demand)));
  return <section aria-label="Current selected choice" className={`sticky top-[60px] z-10 border-b-2 bg-white px-2 py-2 dark:bg-slate-900 ${requirement.roomId === 'shower-room' ? 'border-blue-600' : 'border-teal-600'}`}>
    <div className="flex min-w-0 items-center gap-2"><button type="button" aria-label="Back to previous bathroom view" title="Back" onClick={onBack} className="flex h-11 w-11 shrink-0 items-center justify-center"><ArrowLeft className="h-5 w-5" /></button><h3 className="min-w-0 break-words text-sm font-semibold">{check.demand.name}</h3></div>
    {choices.length ? choices.slice(0, 2).map(({ item, product }) => {
      const cost = basketCostPence(sourcing, item);
      return <button key={item.id} type="button" onClick={() => onOpen(product, check.demand)} aria-label={`Inspect current selection ${product.name}`} className="flex min-h-14 w-full min-w-0 items-center gap-3 text-left">
        <SelectionThumbnail product={product} />
        <span className="min-w-0 flex-1"><span className="block text-[10px] font-medium text-teal-700">SELECTED</span><span className="line-clamp-2 break-words text-xs font-medium">{product.name}</span><span className="block text-xs text-gray-600">{cost === undefined ? 'Cost unconfirmed' : money.format(cost / 100)} · Qty {item.quantity}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
      </button>;
    }) : <p className="py-2 text-xs text-gray-500">No selected choice</p>}
    {choices.length > 2 && <p className="text-xs text-gray-500">+ {choices.length - 2} selected supporting parts in basket</p>}
    <p className={`mt-1 text-xs ${check.complete ? 'text-teal-700' : 'text-gray-600'}`}>{check.complete ? 'Required quantity covered' : choices.length ? check.unknown ? 'Selected - contents need confirmation' : 'Selected - quantity or parts still needed' : 'To choose'}</p>
    {check.deviation && <p className="text-xs text-blue-700">Replacement - quote deviation needs review</p>}
    {check.warnings.map((warning) => <p key={warning} role="status" className="mt-1 text-xs text-amber-800">{warning}</p>)}
  </section>;
}

function SelectionThumbnail({ product }: { product: SourcedProduct }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? <img src={product.imageUrl} alt={product.name} onError={() => setFailed(true)} referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded-md bg-white object-contain" /> : <span role="img" aria-label={`Photo unavailable for ${product.name}`} className="flex h-12 w-12 shrink-0 items-center justify-center text-xs text-gray-500">Photo</span>;
}
