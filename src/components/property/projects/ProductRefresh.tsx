'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import type { SourcedProduct } from '@/types/sourcing.types';
import type { StonewaterDraft } from '@/lib/sourcing/stonewaterImport';
import { refreshedProductDetails, savedSupplierLink } from '@/lib/sourcing/productRefresh';

export default function ProductRefresh({ product, disabled, onUpdate }: { product: SourcedProduct; disabled: boolean; onUpdate: (updates: Partial<SourcedProduct>) => void }) {
  const link = savedSupplierLink(product);
  const [draft, setDraft] = useState<StonewaterDraft>();
  const [variantId, setVariantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef<AbortController>();
  useEffect(() => { pending.current?.abort(); setDraft(undefined); setLoading(false); setError(''); return () => pending.current?.abort(); }, [product.id, product.url]);
  if (!link) return null;
  async function read() {
    if (disabled || !link) return;
    pending.current?.abort();
    const controller = new AbortController(); pending.current = controller;
    setLoading(true); setError(''); setDraft(undefined);
    try {
      const response = await fetch('/api/property/sourcing/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link }), signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Supplier details could not be read.');
      if (controller.signal.aborted) return;
      const next = data.draft as StonewaterDraft;
      setDraft(next);
      setVariantId(next.variants.find((entry) => product.sku && entry.sku === product.sku)?.id || (!product.sku ? next.selectedVariant : '') || '');
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Supplier details could not be read.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  const variant = draft?.variants.find((entry) => entry.id === variantId);
  const differentSku = Boolean(product.sku && variant && product.sku !== variant.sku);
  return <section aria-label="Refresh saved product" className="border-y border-gray-200 py-3 dark:border-slate-700">
    <button type="button" disabled={disabled || loading} onClick={() => void read()} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-emerald-700 disabled:opacity-50">{loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{loading ? 'Reading supplier details...' : 'Refresh photo & dimensions'}</button>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {draft && <div className="space-y-2">
      <p className="break-words text-sm font-medium">{draft.name}</p>
      <label className="block text-xs">Supplier variant<select aria-label="Refresh supplier variant" value={variantId} onChange={(event) => setVariantId(event.target.value)} className="mt-1 min-h-11 w-full rounded-md border-gray-200 text-sm dark:bg-slate-800"><option value="">Choose a variant</option>{draft.variants.map((entry) => <option key={entry.id} value={entry.id}>{entry.name === 'Default Title' ? draft.name : entry.name}</option>)}</select></label>
      {(variant?.imageUrl || draft.images[0]) && <img src={variant?.imageUrl || draft.images[0]} alt="Supplier refresh preview" referrerPolicy="no-referrer" className="h-32 w-full object-contain" />}
      {variant && <p className="text-xs text-gray-600 dark:text-slate-300">Supplier price: £{variant.price.toFixed(2)} · Saved price stays £{product.price.toFixed(2)}.</p>}
      {differentSku && <p role="alert" className="text-xs text-amber-800">Different supplier code. Add this variant as an alternative option instead.</p>}
      <button type="button" disabled={disabled || !variant || differentSku} onClick={() => { if (draft && variant && !differentSku) { onUpdate(refreshedProductDetails(product, draft, variant.id)); setDraft(undefined); } }} className="min-h-11 rounded-md bg-emerald-700 px-3 text-sm font-medium text-white disabled:opacity-50">Use photo & dimensions</button>
    </div>}
  </section>;
}
