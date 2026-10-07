'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { Download, Plus, X } from 'lucide-react';
import type { StonewaterDraft } from '@/lib/sourcing/stonewaterImport';
import type { z } from 'zod';
import type { ComponentEvidence, ProjectSourcing, SourcingRoomId } from '@/types/sourcing.types';
import { householdItemSchema, householdProductSchema, sourcingCategories } from '@/lib/sourcing/householdItems';
import { inferComponentEvidence } from '@/lib/sourcing/productMatching';
import { bathroomRooms, roomName } from './bathroomProject.helpers';

type Props = { mode: 'item' | 'product'; sourcing: ProjectSourcing; roomId?: SourcingRoomId; requirementId?: string; onClose: () => void;
  onItem: (input: z.input<typeof householdItemSchema>) => void; onProduct: (input: z.input<typeof householdProductSchema>) => void };
const field = 'mt-1 block min-h-11 w-full min-w-0 rounded-lg border-gray-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900';
export default function SourcingEntryDialog({ mode, sourcing, roomId, requirementId, onClose, onItem, onProduct }: Props) {
  const [room, setRoom] = useState<SourcingRoomId>(roomId ?? 'main-bathroom');
  const [target, setTarget] = useState(requirementId ?? '');
  const [name, setName] = useState(''); const [supplier, setSupplier] = useState('');
  const [url, setUrl] = useState(''); const [imageUrl, setImageUrl] = useState('');
  const [size, setSize] = useState(''); const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<(typeof sourcingCategories)[number]>('Other');
  const [quantity, setQuantity] = useState(1); const [unit, setUnit] = useState('each');
  const [price, setPrice] = useState(''); const [basis, setBasis] = useState<'each' | 'per box' | 'per m²' | 'per tile'>('each');
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<StonewaterDraft | null>(null);
  const [variantId, setVariantId] = useState('');
  const [replacement, setReplacement] = useState(false);
  const [confirmedParts, setConfirmedParts] = useState<Record<string, ComponentEvidence>>({});
  const [reading, setReading] = useState(false);
  const pending = useRef<AbortController | null>(null);
  const lastRead = useRef('');
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    if (!url.trim() || lastRead.current === url.trim()) return;
    try {
      const link = new URL(url.trim());
      if (link.protocol !== 'https:') return;
    } catch { return; }
    const timer = setTimeout(() => { if (lastRead.current !== url.trim()) void importProduct(url.trim()); }, 600);
    return () => clearTimeout(timer);
  }, [url, mode]);
  function applyVariant(data: StonewaterDraft, id: string) {
    setVariantId(id);
    const option = data.variants.find((item) => item.id === id);
    setName(`${data.name}${option && !['Default Title', 'Listed product'].includes(option.name) ? ` - ${option.name}` : ''}`.slice(0, 200));
    setPrice(option && option.price > 0 ? String(option.price) : ''); setImageUrl(option?.imageUrl ?? data.images[0] ?? '');
    const selectedUrl = `${data.url}${option ? `?variant=${option.id}` : ''}`;
    lastRead.current = selectedUrl; setUrl(selectedUrl);
    setSize((data.name.match(/\d{3,4}\s*(?:mm)?\s*[x×]\s*\d{3,4}\s*mm/i)?.[0] ?? (option && !['Default Title', 'Listed product'].includes(option.name) ? option.name : '')).slice(0, 300));
  }
  async function importProduct(link = url.trim()) {
    pending.current?.abort();
    lastRead.current = link;
    const controller = new AbortController(); pending.current = controller; setReading(true); setError('');
    try {
      const response = await fetch('/api/property/sourcing/import', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: link }), signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'The product could not be read.');
      if (controller.signal.aborted) return;
      const data = result.draft as StonewaterDraft; setDraft(data); setSupplier(new URL(data.url).hostname.replace(/^www\./, '')); setNotes(data.description); setBasis('each');
      const nextVariant = data.selectedVariant || (data.variants.length === 1 ? data.variants[0].id : '');
      setConfirmedParts({});
      applyVariant(data, nextVariant);
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'Enter this option manually.'); }
    finally { if (!controller.signal.aborted && pending.current === controller) { pending.current = null; setReading(false); } }
  }
  const requirement = sourcing.requirements.find((item) => item.id === target);
  const partEvidence = { ...inferComponentEvidence(`${name}; ${notes}`, requirement?.requiredComponents ?? []), ...confirmedParts };
  function submit(event: React.FormEvent) {
    event.preventDefault(); setError('');
    try {
      if (reading || (draft && !variantId)) throw new Error('Choose the product option first.');
      if (mode === 'item') onItem({ roomId: room, name, category, quantity, size, specification: notes || name, unit, relatedToId: target || undefined, replacement: !!target && replacement, ...(url || imageUrl ? { product: { url, imageUrl, supplier, price: price.trim() ? Number(price) : NaN, sku: draft?.variants.find((item) => item.id === variantId)?.sku, gallery: draft?.images } } : {}) });
      else {
        if (reading || (draft && !variantId)) throw new Error('Choose the product option first.');
        if (draft && !price.trim()) throw new Error('Enter the UK price; this supplier page did not show it clearly.');
        const evidence = partEvidence;
        const included = Object.keys(evidence).filter((part) => evidence[part].state === 'included');
        onProduct({ requirementId: target, name, supplier, url, imageUrl, price: price.trim() ? Number(price) : NaN, priceUnit: basis, size, components: included, componentEvidence: evidence, notes, sku: draft?.variants.find((item) => item.id === variantId)?.sku, gallery: draft?.images });
      }
    } catch (reason) { setError(reason instanceof Error && !('issues' in reason) ? reason.message : 'Check the name, quantity, price and links.'); }
  }
  return <Dialog open onClose={onClose} className="relative z-[80]">
    <div className="fixed inset-0 bg-black/40" aria-hidden="true" />
    <div className="fixed inset-0 flex items-end justify-center p-2 sm:items-center sm:p-5">
      <Dialog.Panel className="flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-lg bg-white text-gray-900 shadow-xl dark:bg-slate-900 dark:text-white">
        <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-slate-700"><Dialog.Title className="text-lg font-semibold">{mode === 'item' ? 'Add bathroom item' : 'Add supplier option'}</Dialog.Title><button type="button" aria-label="Close entry" title="Close" onClick={onClose} className="p-3"><X className="h-5 w-5" /></button></div>
        <form onSubmit={submit} className="min-h-0 overflow-y-auto p-4">
          <div className="space-y-3 text-xs">
            <label className="block">Bathroom<select className={field} value={room} onChange={(event) => { setRoom(event.target.value as SourcingRoomId); setTarget(''); setConfirmedParts({}); setReplacement(false); }}>{bathroomRooms.map((item) => <option key={item.id} value={item.id}>{roomName(sourcing, item.id)}</option>)}</select></label>
            <label className="block">{mode === 'item' ? 'Related to (optional)' : 'Option for'}<select required={mode === 'product'} className={field} value={target} onChange={(event) => { const nextTarget = event.target.value; setTarget(nextTarget); setConfirmedParts({}); }}><option value="">{mode === 'item' ? 'No related item' : 'Choose an item'}</option>{sourcing.requirements.filter((item) => item.roomId === room).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            {mode === 'item' && target && <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={replacement} onChange={(event) => setReplacement(event.target.checked)} className="rounded" />Replacement for the related item</label>}
            <>
              <label className="block">Product link<input autoFocus={mode === 'product'} type="url" maxLength={1500} placeholder="Paste a public product page URL" className={field} value={url} onChange={(event) => { pending.current?.abort(); pending.current = null; lastRead.current = ''; setReading(false); setUrl(event.target.value); setDraft(null); setVariantId(''); setName(''); setPrice(''); setImageUrl(''); setSupplier(''); setSize(''); setNotes(''); setConfirmedParts({}); setError(''); }} /></label>
              {reading && <p role="status" className="text-teal-700">Loading product photo and price...</p>}
              {!draft && <button type="button" disabled={reading || !url.trim()} onClick={() => void importProduct()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal-700 px-3 text-sm text-teal-800 disabled:opacity-50"><Download className="h-4 w-4" />{reading ? 'Reading product...' : 'Read product page'}</button>}
              {draft && <>
                <label className="block">Product option<select required className={field} value={variantId} onChange={(event) => { setConfirmedParts({}); applyVariant(draft, event.target.value); }}><option value="">Choose an option</option>{draft.variants.map((item) => <option key={item.id} value={item.id}>{item.name === 'Default Title' || item.name === 'Listed product' ? draft.name : item.name} - {item.price > 0 ? `£${item.price.toFixed(2)}` : 'price not found'}{item.available ? '' : ' - unavailable'}</option>)}</select></label>
                {imageUrl && <img src={imageUrl} alt={name} className="h-32 w-full object-contain" />}
                <p className="text-gray-500">Supplier page details. Check the price, dimensions and included parts before saving.</p>
              </>}
            </>
            <label className="block">{mode === 'item' ? 'Item name' : 'Product name'}<input autoFocus={mode === 'item'} required maxLength={200} className={field} value={name} onChange={(event) => { setName(event.target.value); }} /></label>
            {mode === 'item' ? <>
              <label className="block">Category<select className={field} value={category} onChange={(event) => setCategory(event.target.value as typeof category)}>{sourcingCategories.map((item) => <option key={item}>{item}</option>)}</select></label>
              <div className="grid grid-cols-2 gap-3"><label>Quantity<input required type="number" step="any" min="0.001" max="10000" className={field} value={Number.isFinite(quantity) ? quantity : ''} onChange={(event) => setQuantity(event.target.valueAsNumber)} /></label><label>Unit<input maxLength={30} className={field} value={unit} onChange={(event) => setUnit(event.target.value)} /></label></div>
              <label className="block">Supplier<input maxLength={100} className={field} value={supplier} onChange={(event) => setSupplier(event.target.value)} /></label>
              <label className="block">Price (£)<input required={!!url || !!imageUrl} type="number" step="0.01" min="0" max="100000" className={field} value={price} onChange={(event) => setPrice(event.target.value)} /></label>
              <label className="block">Photo link (optional)<input type="url" maxLength={1500} placeholder="https://" className={field} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
            </> : <>
              <label className="block">Supplier<input maxLength={100} className={field} value={supplier} onChange={(event) => setSupplier(event.target.value)} /></label>
              <div className="grid grid-cols-2 gap-3"><label>Price (£)<input required type="number" step="0.01" min="0" max="100000" className={field} value={price} onChange={(event) => setPrice(event.target.value)} /></label><label>Price is per<select className={field} value={basis} onChange={(event) => setBasis(event.target.value as typeof basis)}><option value="each">Item</option><option value="per box">Box</option><option value="per m²">m²</option><option value="per tile">Tile</option></select></label></div>
              <label className="block">Photo link (optional)<input type="url" maxLength={1500} placeholder="https://" className={field} value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} /></label>
              {requirement && requirement.requiredComponents.length > 0 && <fieldset className="border-y border-gray-200 py-3 dark:border-slate-700"><legend className="font-medium">Included parts</legend>{requirement.requiredComponents.map((part) => {
                const evidence = partEvidence[part];
                const included = evidence?.state === 'included';
                const label = part.replace(/-/g, ' ');
                return <div key={part} className="flex min-h-11 items-center justify-between gap-2">
                  <label className="flex min-h-11 min-w-0 items-center gap-2"><input type="checkbox" checked={included} onChange={(event) => setConfirmedParts({ ...confirmedParts, [part]: { quantity: event.target.checked ? evidence?.quantity || 1 : 0, state: event.target.checked ? 'included' : 'excluded', source: 'user' } })} className="rounded" />{label}</label>
                  <input aria-label={`Included quantity ${label}`} type="number" min="1" max="10000" step="1" disabled={!included} value={evidence?.quantity ?? 0} onChange={(event) => setConfirmedParts({ ...confirmedParts, [part]: { quantity: event.target.valueAsNumber, state: 'included', source: 'user' } })} className="min-h-11 w-20 min-w-0 rounded-md border-gray-300 text-xs dark:bg-slate-900" />
                </div>;
              })}</fieldset>}
            </>}
            <label className="block">Size / dimensions<input maxLength={300} className={field} value={size} onChange={(event) => setSize(event.target.value)} /></label>
            {!draft && imageUrl && <img src={imageUrl} alt={name || 'Product preview'} className="h-32 w-full object-contain" />}
            <label className="block">Notes<textarea aria-label="Notes" rows={3} maxLength={1000} className={field} value={notes} onChange={(event) => { setNotes(event.target.value); }} /></label>
            {mode === 'product' && <p className="text-gray-500">Unverified supplier option. Price, included parts, stock and room fit need confirmation. No order placed.</p>}
            {error && <p role="alert" className="text-red-700">{error}</p>}
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] pt-3 dark:border-slate-700 dark:bg-slate-900"><button type="button" onClick={onClose} className="min-h-11 px-3">Cancel</button><button disabled={reading} type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />{mode === 'item' ? 'Save item' : 'Save option'}</button></div>
          </div>
        </form>
      </Dialog.Panel>
    </div>
  </Dialog>;
}
