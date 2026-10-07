'use client';
import { useState } from 'react';
import { Check } from 'lucide-react';
import type { ComponentEvidence, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { productComponentEvidence } from '@/lib/sourcing/productMatching';

export default function IncludedPartsEditor({ product, requirement, disabled, onSave }: { product: SourcedProduct; requirement: SourcingRequirement; disabled: boolean; onSave: (updates: Partial<SourcedProduct>) => void }) {
  const initial = productComponentEvidence(product, requirement.requiredComponents);
  const [values, setValues] = useState<Record<string, ComponentEvidence>>(initial);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  if (!requirement.requiredComponents.length) return null;
  return <form aria-label="Included parts quantities" className="space-y-2 border-y border-gray-200 py-3 dark:border-slate-700" onSubmit={(event) => {
    event.preventDefault(); setError('');
    const evidence = { ...product.componentEvidence };
    for (const part of requirement.requiredComponents) {
      const value = values[part] ?? { quantity: 0, state: 'unknown' as const, source: 'user' as const };
      if (!Number.isInteger(value.quantity) || value.quantity < 0 || value.quantity > 10000 || value.state === 'included' && value.quantity <= 0) { setError('Enter a positive whole included quantity per purchased unit.'); return; }
      evidence[part] = { ...value, source: 'user', text: 'Confirmed in included-parts editor' };
    }
    onSave({ componentEvidence: evidence, components: Object.keys(evidence).filter((part) => evidence[part].state === 'included') }); setSaved(true);
  }}>
    <h4 className="text-sm font-semibold">Included parts per purchased unit</h4>
    {requirement.requiredComponents.map((part) => {
      const value = values[part] ?? { quantity: 0, state: 'unknown' as const, source: 'user' as const };
      return <div key={part} className="grid min-w-0 grid-cols-[1fr_112px_64px] items-center gap-2 text-xs">
        <label className="min-w-0 break-words" htmlFor={`part-${product.id}-${part}`}>{part.replace(/-/g, ' ')}</label>
        <select id={`part-${product.id}-${part}`} aria-label={`Contents ${part.replace(/-/g, ' ')}`} disabled={disabled} value={value.state} onChange={(event) => { setSaved(false); const state = event.target.value as ComponentEvidence['state']; setValues({ ...values, [part]: { ...value, state, quantity: state === 'included' ? value.quantity || 1 : 0 } }); }} className="min-h-11 min-w-0 rounded-md border-gray-200 text-xs dark:bg-slate-800"><option value="unknown">Unknown</option><option value="included">Included</option><option value="excluded">Not included</option></select>
        <input aria-label={`Included quantity ${part.replace(/-/g, ' ')}`} type="number" min="1" max="10000" step="1" disabled={disabled || value.state !== 'included'} value={value.quantity} onChange={(event) => { setSaved(false); setValues({ ...values, [part]: { ...value, quantity: event.target.valueAsNumber } }); }} className="min-h-11 min-w-0 rounded-md border-gray-200 text-xs dark:bg-slate-800" />
      </div>;
    })}
    {!disabled && <button className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-teal-700"><Check className="h-4 w-4" />Save included parts</button>}
    {saved && <p role="status" className="text-xs text-teal-700">Included parts saved</p>}{error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </form>;
}
