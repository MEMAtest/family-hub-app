'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ExternalLink, LoaderCircle, Plus, Search, ShoppingBasket, Trash2 } from 'lucide-react';
import type { ProjectSourcing, SourcedProduct, SourcingBasketStatus, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import type { PropertyProject } from '@/types/property.types';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const rooms: { id: SourcingRoomId; label: string }[] = [
  { id: 'main-bathroom', label: 'Main Bathroom' },
  { id: 'small-bathroom', label: 'Small Bathroom' },
  { id: 'shower-room', label: 'Shower Room' },
];

type Props = { project: PropertyProject; onUpdateProject: (updates: Partial<PropertyProject>) => void; isReadOnly?: boolean };

function assess(requirement: SourcingRequirement, product: SourcedProduct) {
  const mismatches: string[] = [];
  const unknowns: string[] = [];
  const closeFits: string[] = [];
  const tolerance = typeof requirement.constraints.tileToleranceMm === 'number' ? requirement.constraints.tileToleranceMm : 0;
  Object.entries(requirement.constraints).forEach(([key, required]) => {
    if (key === 'tileToleranceMm') return;
    if (['finish', 'colour', 'material', 'effect'].includes(key)) {
      const productValue = key === 'finish' ? product.finish : key === 'colour' ? product.colour : key === 'material' ? product.material : product.effect;
      const label = key === 'colour' ? 'Colour' : key.charAt(0).toUpperCase() + key.slice(1);
      if (!productValue) unknowns.push(`${label} is not confirmed`);
      else if (productValue.toLowerCase() !== String(required).toLowerCase()) mismatches.push(`${label} is ${productValue}, not ${required}`);
      return;
    }
    const actual = product.dimensions[key];
    if (typeof required !== 'number' || typeof actual !== 'number') unknowns.push(`${key.replace('Mm', '')} is not confirmed`);
    else if (key === 'maxWidthMm' ? actual > required : Math.abs(actual - required) > tolerance) mismatches.push(`${key.replace('Mm', '')} is ${actual}mm; requirement is ${required}mm${tolerance ? ` (±${tolerance}mm allowed)` : ''}`);
    else if (actual !== required) closeFits.push(`${key.replace('Mm', '')} is ${Math.abs(actual - required)}mm ${actual < required ? 'smaller' : 'larger'} than the reference`);
  });
  const missing = requirement.requiredComponents.filter((component) => !product.components.includes(component));
  if (product.stock === 'OUT_OF_STOCK') unknowns.push('Supplier currently marks this out of stock');
  if (product.stock === 'UNKNOWN') unknowns.push('Stock could not be confirmed');
  if (missing.length) unknowns.push(`Check included components: ${missing.join(', ')}`);
  return { mismatches, unknowns, closeFits, state: mismatches.length ? 'Does not fit' : unknowns.length ? 'Fitter check' : 'Matches stated requirements' };
}

function marketLinks(requirement: SourcingRequirement) {
  const query = encodeURIComponent(`${requirement.name} ${requirement.specification}`);
  return [
    { name: 'Victorian Plumbing', url: `https://www.victorianplumbing.co.uk/search?search=${query}` },
    { name: 'Easy Bathrooms', url: `https://www.easybathrooms.com/search?q=${query}` },
    { name: 'Screwfix', url: `https://www.screwfix.com/search?search=${query}` },
    { name: 'Wickes', url: `https://www.wickes.co.uk/search?text=${query}` },
  ];
}

export default function ProjectMaterialsView({ project, onUpdateProject, isReadOnly = false }: Props) {
  const isBathroomProject = /bath|shower/i.test(`${project.category} ${project.title} ${project.description ?? ''}`);
  const sourcing = project.sourcing ?? (isBathroomProject
    ? createBathroomSourcingSeed()
    : { requirements: [], products: [], basket: [] });
  const [searchResults, setSearchResults] = useState<SourcedProduct[]>([]);
  const [roomId, setRoomId] = useState<SourcingRoomId>('main-bathroom');
  const [selectedId, setSelectedId] = useState('main-bath');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState('');
  const [newSpec, setNewSpec] = useState('');
  const [addingRequirement, setAddingRequirement] = useState(false);

  const visibleRequirements = sourcing.requirements.filter((requirement) => requirement.roomId === roomId);
  const requirement = visibleRequirements.find((item) => item.id === selectedId) ?? visibleRequirements[0];
  const candidates = useMemo(() => {
    if (!requirement) return [];
    return Array.from(new Map([...sourcing.products, ...searchResults].map((product) => [product.id, product])).values())
      .filter((product) => requirement.category.toLowerCase() !== 'tiles' || product.category === 'Tiles')
      .map((product) => ({ product, assessment: assess(requirement, product) }))
      .filter((item) => item.assessment.state !== 'Does not fit')
      .sort((a, b) => Number(a.assessment.state !== 'Matches stated requirements') - Number(b.assessment.state !== 'Matches stated requirements') || a.product.price - b.product.price);
  }, [requirement, sourcing.products, searchResults]);

  function save(next: ProjectSourcing) {
    onUpdateProject({ sourcing: next, updatedAt: new Date().toISOString() });
  }

  useEffect(() => {
    if (!project.sourcing && isBathroomProject && !isReadOnly) {
      onUpdateProject({ sourcing: createBathroomSourcingSeed(), updatedAt: new Date().toISOString() });
    }
  }, [isBathroomProject, isReadOnly, onUpdateProject, project.id, project.sourcing]);

  async function searchSupplier() {
    if (!requirement) return;
    setSearching(true);
    setError('');
    try {
      const response = await fetch('/api/property/sourcing/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: requirement.category.toLowerCase() === 'tiles' ? 'topps-tiles' : 'stonewater', requirement: { name: requirement.name, specification: requirement.specification } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Supplier search failed.');
      const found = (data.products ?? []) as SourcedProduct[];
      setSearchResults(found);
      if (!isReadOnly) {
        const products = [...sourcing.products];
        found.forEach((product) => {
          const existing = products.findIndex((item) => item.id === product.id);
          if (existing >= 0) products[existing] = product;
          else products.push(product);
        });
        save({ ...sourcing, products });
      }
      if (found.length === 0) setError(`No ${isTileRequirement ? 'Topps Tiles' : 'Stonewater'} results. Try the wider-market links below.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Supplier search failed.');
    } finally {
      setSearching(false);
    }
  }

  const isTileRequirement = requirement?.category.toLowerCase() === 'tiles';

  function addToBasket(product: SourcedProduct, status: SourcingBasketStatus = 'review') {
    if (!requirement) return;
    const next = sourcing.basket.filter((item) => item.requirementId !== requirement.id);
    next.push({ id: `basket-${requirement.id}`, requirementId: requirement.id, productId: product.id, quantity: requirement.quantity, status });
    save({ ...sourcing, basket: next });
  }

  function updateBasketStatus(id: string, status: SourcingBasketStatus) {
    save({ ...sourcing, basket: sourcing.basket.map((item) => item.id === id ? { ...item, status } : item) });
  }

  function addRequirement() {
    if (!newName.trim() || !newSpec.trim()) return;
    const item: SourcingRequirement = {
      id: `req-${Date.now()}`, roomId, name: newName.trim(), category: 'Other', specification: newSpec.trim(),
      quantity: 1, status: 'fitter_check', constraints: {}, requiredComponents: [],
    };
    save({ ...sourcing, requirements: [...sourcing.requirements, item] });
    setSelectedId(item.id);
    setNewName(''); setNewSpec(''); setAddingRequirement(false);
  }

  const basketTotal = sourcing.basket.reduce((total, item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return total + (product?.price ?? 0) * item.quantity;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Room requirements · product fit · procurement</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Materials sourcing</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">Check dimensions and included parts before adding products to the project basket. Supplier prices and stock can change.</p>
        </div>
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-right dark:bg-slate-800">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-slate-200"><ShoppingBasket className="h-4 w-4" /> {sourcing.basket.length} basket items</div>
          <div className="mt-1 text-lg font-semibold text-gray-900 dark:text-white">{money.format(basketTotal)}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 dark:border-slate-700">
        {rooms.map((room) => <button key={room.id} onClick={() => { setRoomId(room.id); setSelectedId(''); }} className={`rounded-full px-4 py-2 text-sm font-medium ${roomId === room.id ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-300'}`}>{room.label}</button>)}
        <span className="ml-auto self-center text-xs text-gray-400">{sourcing.requirements.filter((item) => item.roomId === roomId).length} requirements</span>
      </div>

      {addingRequirement && <div className="grid gap-3 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30 md:grid-cols-[1fr_2fr_auto_auto]">
        <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="Item name" className="rounded-lg border-gray-300 text-sm dark:border-slate-600 dark:bg-slate-900" />
        <input value={newSpec} onChange={(event) => setNewSpec(event.target.value)} placeholder="Specification and dimensions" className="rounded-lg border-gray-300 text-sm dark:border-slate-600 dark:bg-slate-900" />
        <button onClick={addRequirement} disabled={!newName.trim() || !newSpec.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
        <button onClick={() => setAddingRequirement(false)} className="rounded-lg px-3 py-2 text-sm text-gray-500">Cancel</button>
      </div>}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">{rooms.find((room) => room.id === roomId)?.label} requirements</h3>
            {!isReadOnly && <button onClick={() => setAddingRequirement(true)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"><Plus className="h-4 w-4" /> Add requirement</button>}
          </div>
          {visibleRequirements.length === 0 && <div className="rounded-xl border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-slate-700">No requirements for this room yet.</div>}
          {visibleRequirements.map((item) => {
            const basketItem = sourcing.basket.find((entry) => entry.requirementId === item.id);
            return <button key={item.id} onClick={() => setSelectedId(item.id)} className={`block w-full rounded-xl border p-4 text-left transition ${requirement?.id === item.id ? 'border-blue-400 bg-blue-50/60 ring-1 ring-blue-200 dark:border-blue-700 dark:bg-blue-950/30 dark:ring-blue-900' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900'}`}>
              <div className="flex items-start justify-between gap-3"><div><span className="text-xs font-medium uppercase tracking-wide text-gray-400">{item.category} · Qty {item.quantity}</span><div className="mt-1 font-semibold text-gray-900 dark:text-white">{item.name}</div><p className="mt-1 text-sm text-gray-600 dark:text-slate-300">{item.specification}</p>{item.notes && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{item.notes}</p>}</div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${item.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{item.status === 'confirmed' ? 'Confirmed' : 'Fitter check'}</span></div>
              {basketItem && <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-blue-700 dark:text-blue-300"><Check className="h-3.5 w-3.5" /> Basket: {basketItem.status.replace('_', ' ')}</div>}
            </button>;
          })}
        </section>

        <section className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
          {requirement ? <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Supplier match</span><h3 className="mt-1 font-semibold text-gray-900 dark:text-white">{requirement.name}</h3><p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{requirement.specification}</p>
                {requirement.referenceProduct && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Reference product outside Topps Tiles: <strong>{requirement.referenceProduct.name}</strong> by {requirement.referenceProduct.supplier}. {requirement.recommendationNote}</p>}
              </div>
              <button onClick={searchSupplier} disabled={searching} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"><Search className="h-4 w-4" />{searching ? 'Searching…' : isTileRequirement ? 'Search Topps Tiles' : 'Search Stonewater'}</button>
            </div>
            {error && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">{searching && <LoaderCircle className="mr-1 inline h-4 w-4 animate-spin" />}{error}</p>}
            <div className="space-y-3">
              {candidates.length === 0 && <div className="rounded-lg border border-dashed border-gray-300 p-5 text-center text-sm text-gray-500 dark:border-slate-700">{isTileRequirement ? 'Search Topps Tiles to find catalogue matches for this requirement.' : 'Search the live catalogue to find products for this requirement.'}</div>}
              {candidates.map(({ product, assessment }) => <ProductCard key={product.id} product={product} assessment={assessment} inBasket={sourcing.basket.some((item) => item.requirementId === requirement.id && item.productId === product.id)} disabled={isReadOnly} onAdd={(status) => addToBasket(product, status)} />)}
            </div>
            <div className="border-t border-gray-200 pt-3 dark:border-slate-700"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Wider market searches</p><div className="flex flex-wrap gap-2">{marketLinks(requirement).map((link) => <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ExternalLink className="h-3 w-3" />{link.name}</a>)}</div><p className="mt-2 text-xs text-gray-400">Check exact dimensions, included parts, price and stock on each supplier page.</p></div>
          </> : <div className="py-10 text-center text-sm text-gray-500">Select or add a room requirement.</div>}
        </section>
      </div>

      {sourcing.basket.length > 0 && <section className="overflow-hidden rounded-xl border border-gray-200 dark:border-slate-700">
        <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-slate-900"><div><h3 className="font-semibold text-gray-900 dark:text-white">Project basket</h3><p className="text-xs text-gray-500 dark:text-slate-400">Review selected products before ordering. No orders are placed here.</p></div><span className="font-semibold text-gray-900 dark:text-white">{money.format(basketTotal)}</span></div>
        <div className="divide-y divide-gray-100 dark:divide-slate-800">{sourcing.basket.map((item) => {
          const product = sourcing.products.find((candidate) => candidate.id === item.productId);
          const linkedRequirement = sourcing.requirements.find((candidate) => candidate.id === item.requirementId);
          if (!product) return null;
          return <div key={item.id} className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 dark:bg-slate-900"><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-gray-900 dark:text-white">{product.name}</div><div className="text-xs text-gray-500">{linkedRequirement?.name} · {product.supplier} · Qty {item.quantity}</div></div><span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{money.format(product.price * item.quantity)}</span><select aria-label={`Status for ${product.name}`} disabled={isReadOnly} value={item.status} onChange={(event) => updateBasketStatus(item.id, event.target.value as SourcingBasketStatus)} className="rounded-lg border-gray-200 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="review">Review</option><option value="ask_fitter">Ask fitter</option><option value="approved">Approved</option><option value="ordered">Ordered</option></select>{!isReadOnly && <button aria-label={`Remove ${product.name} from basket`} onClick={() => save({ ...sourcing, basket: sourcing.basket.filter((entry) => entry.id !== item.id) })} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>}</div>;
        })}</div>
      </section>}
    </div>
  );
}

function ProductCard({ product, assessment, inBasket, disabled, onAdd }: { product: SourcedProduct; assessment: ReturnType<typeof assess>; inBasket: boolean; disabled: boolean; onAdd: (status: SourcingBasketStatus) => void }) {
  return <article className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-slate-700 dark:bg-slate-900">
    <div className="flex gap-3 p-3">{product.category === 'Tiles' ? <div aria-label={`${product.colour ?? 'Tile'} sample`} className="h-20 w-24 shrink-0 rounded-lg border border-black/10" style={{ backgroundColor: product.colour?.toLowerCase() === 'bone' ? '#ddd2bd' : product.colour?.toLowerCase() === 'basalt' ? '#656765' : '#8b8b87' }} /> : <img src={product.imageUrl} alt="" className="h-20 w-24 shrink-0 rounded-lg bg-gray-100 object-cover dark:bg-slate-800" />}
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-medium text-gray-400">{product.supplier}</span><strong className="text-sm text-gray-900 dark:text-white">{money.format(product.price)}{product.priceUnit ? ` ${product.priceUnit}` : ''}</strong></div><h4 className="mt-1 line-clamp-2 text-sm font-semibold text-gray-800 dark:text-slate-100">{product.name}</h4><div className="mt-1 flex flex-wrap gap-x-3 text-xs text-gray-500 dark:text-slate-400"><span>Stock: {product.stock.toLowerCase().replace(/_/g, ' ')}</span>{Object.entries(product.dimensions).map(([key, value]) => <span key={key}>{key.replace('Mm', '')}: {value}mm</span>)}{product.colour && <span>Colour: {product.colour}</span>}{product.finish && <span>{product.finish}</span>}{product.effect && <span>{product.effect}</span>}</div>{product.material && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{product.material}</p>}</div>
    </div>
    <div className="border-t border-gray-100 px-3 py-2.5 dark:border-slate-800"><div className={`text-xs font-semibold ${assessment.state === 'Matches stated requirements' ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>{assessment.state}</div>{assessment.closeFits.length > 0 && <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">{assessment.closeFits.join(' · ')} (within the accepted size tolerance)</p>}{assessment.unknowns.length > 0 && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{assessment.unknowns.join(' · ')}</p>}{product.components.length > 0 && <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">Includes: {product.components.join(', ')}</p>}
      <div className="mt-2 flex items-center justify-between"><a href={product.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">Supplier page <ExternalLink className="h-3 w-3" /></a><button disabled={disabled || inBasket} onClick={() => onAdd(assessment.state === 'Matches stated requirements' ? 'review' : 'ask_fitter')} className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-45 dark:bg-slate-700">{inBasket ? 'In basket' : assessment.state === 'Matches stated requirements' ? 'Add to basket' : 'Ask fitter'}</button></div>
    </div>
  </article>;
}
