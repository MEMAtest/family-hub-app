'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Armchair, ArrowLeft, ArrowRight, Bath, Check, ExternalLink, Grid2x2, Heater, LayoutGrid, LoaderCircle, Plus, RefreshCw,
  Search, ShoppingBasket, ShowerHead, Trash2, TriangleAlert, Truck, Wrench, X,
} from 'lucide-react';
import type {
  ProjectSourcing, SourcedProduct, SourcingBasketStatus, SourcingRequirement, SourcingRoomId, SourcingStock,
} from '@/types/sourcing.types';
import type { PropertyProject } from '@/types/property.types';
import { SOURCING_SEED_VERSION, createBathroomSourcingSeed } from '@/lib/sourcing/seed';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

const rooms: { id: SourcingRoomId; label: string; heroProductId: string }[] = [
  { id: 'main-bathroom', label: 'Main Bathroom', heroProductId: 'sw-14140039' },
  { id: 'shower-room', label: 'Shower Room', heroProductId: 'sw-32086100' },
];

const categories: { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'All', label: 'All', icon: LayoutGrid },
  { id: 'Tiles', label: 'Tiles', icon: Grid2x2 },
  { id: 'Sanitaryware', label: 'Sanitaryware', icon: Bath },
  { id: 'Furniture', label: 'Furniture', icon: Armchair },
  { id: 'Showers', label: 'Showers', icon: ShowerHead },
  { id: 'Heating', label: 'Heating', icon: Heater },
  { id: 'Fittings', label: 'Fittings', icon: Wrench },
];

const stockStyles: Record<SourcingStock, { label: string; dot: string; text: string }> = {
  IN_STOCK: { label: 'In stock', dot: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-300' },
  LOW_STOCK: { label: 'Low stock', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  TO_ORDER: { label: 'Available to order', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  OUT_OF_STOCK: { label: 'Out of stock', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
  UNKNOWN: { label: 'Check stock', dot: 'bg-gray-400', text: 'text-gray-600 dark:text-slate-300' },
};

type Props = { project: PropertyProject; onUpdateProject: (updates: Partial<PropertyProject>) => void; isReadOnly?: boolean };
type SortOrder = 'recommended' | 'price' | 'stock';

const productsFor = (sourcing: ProjectSourcing, requirement: SourcingRequirement) =>
  sourcing.products.filter((product) => product.requirementIds?.includes(requirement.id));

const lineCost = (requirement: SourcingRequirement | undefined, product: SourcedProduct) =>
  product.price * (product.priceUnit === 'per m²' ? requirement?.quantity ?? 1 : 1);

/** Cheapest top-pick product for each part the quote item needs, so a bath estimate includes its screen and panels. */
function estimateFor(sourcing: ProjectSourcing, requirement: SourcingRequirement) {
  const picks = productsFor(sourcing, requirement).filter((product) => product.topPick);
  const chosen = new Map<string, SourcedProduct>();
  const parts = requirement.requiredComponents.length ? requirement.requiredComponents : [''];
  parts.forEach((part) => {
    const cheapest = picks.filter((product) => !part || product.components.includes(part)).sort((a, b) => a.price - b.price)[0];
    if (cheapest) chosen.set(cheapest.id, cheapest);
  });
  return Array.from(chosen.values()).reduce((total, product) => total + lineCost(requirement, product), 0);
}

function coverage(requirement: SourcingRequirement, products: SourcedProduct[]) {
  const covered = new Set(products.flatMap((product) => product.components));
  return requirement.requiredComponents.map((part) => ({ part, covered: covered.has(part) }));
}

/** Older saved workspaces used placeholder products; replace them with the verified catalogue but keep custom quote items. */
function migrate(saved: ProjectSourcing): ProjectSourcing {
  const seed = createBathroomSourcingSeed();
  const seedIds = new Set(seed.requirements.map((item) => item.id));
  const known = new Set(rooms.map((room) => room.id));
  const custom = saved.requirements.filter((item) => !seedIds.has(item.id) && item.id.startsWith('req-') && known.has(item.roomId));
  const productIds = new Set(seed.products.map((product) => product.id));
  return { ...seed, requirements: [...seed.requirements, ...custom], basket: saved.basket.filter((item) => productIds.has(item.productId)) };
}

export default function ProjectMaterialsView({ project, onUpdateProject, isReadOnly = false }: Props) {
  const isBathroomProject = /bath|shower/i.test(`${project.category} ${project.title} ${project.description ?? ''}`);
  const needsSeed = isBathroomProject && (!project.sourcing || (project.sourcing.version ?? 1) < SOURCING_SEED_VERSION);
  const sourcing = useMemo<ProjectSourcing>(() => {
    if (!needsSeed) return project.sourcing ?? { requirements: [], products: [], basket: [] };
    return project.sourcing ? migrate(project.sourcing) : createBathroomSourcingSeed();
  }, [needsSeed, project.sourcing]);

  const [roomId, setRoomId] = useState<SourcingRoomId | null>(null);
  const [requirementId, setRequirementId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('recommended');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSize, setNewSize] = useState('');

  useEffect(() => {
    if (needsSeed && !isReadOnly) onUpdateProject({ sourcing, updatedAt: new Date().toISOString() });
  }, [needsSeed, isReadOnly, onUpdateProject, sourcing]);

  // Supplier searches and stock checks finish after an await; always build on the latest workspace so
  // basket changes made meanwhile are not overwritten.
  const latest = useRef(sourcing);
  latest.current = sourcing;
  function save(next: ProjectSourcing) {
    latest.current = next;
    onUpdateProject({ sourcing: next, updatedAt: new Date().toISOString() });
  }

  const room = rooms.find((item) => item.id === roomId);
  const roomRequirements = sourcing.requirements.filter((item) => item.roomId === roomId);
  const requirement = roomRequirements.find((item) => item.id === requirementId);
  const detail = sourcing.products.find((product) => product.id === detailId);
  const basketTotal = sourcing.basket.reduce((total, item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    const linked = sourcing.requirements.find((candidate) => candidate.id === item.requirementId);
    return total + (product ? lineCost(linked, product) : 0);
  }, 0);

  const roomProducts = useMemo(() => {
    const ids = new Set((requirement ? [requirement] : roomRequirements).map((item) => item.id));
    return sourcing.products.filter((product) => product.requirementIds?.some((id) => ids.has(id)));
  }, [requirement, roomRequirements, sourcing.products]);

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const rank: Record<SourcingStock, number> = { IN_STOCK: 0, LOW_STOCK: 1, TO_ORDER: 2, UNKNOWN: 3, OUT_OF_STOCK: 4 };
    return roomProducts
      .filter((product) => category === 'All' || product.category === category)
      .filter((product) => !inStockOnly || product.stock === 'IN_STOCK')
      .filter((product) => !text || `${product.name} ${product.size ?? ''} ${product.supplier}`.toLowerCase().includes(text))
      .sort((a, b) => sort === 'price' ? a.price - b.price
        : sort === 'stock' ? rank[a.stock] - rank[b.stock] || a.price - b.price
          : Number(!!b.topPick) - Number(!!a.topPick) || rank[a.stock] - rank[b.stock] || a.price - b.price);
  }, [roomProducts, category, inStockOnly, query, sort]);

  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((item) => [item.id,
    item.id === 'All' ? roomProducts.length : roomProducts.filter((product) => product.category === item.id).length])), [roomProducts]);

  function requirementForProduct(product: SourcedProduct) {
    if (requirement && product.requirementIds?.includes(requirement.id)) return requirement;
    return roomRequirements.find((item) => product.requirementIds?.includes(item.id))
      ?? sourcing.requirements.find((item) => product.requirementIds?.includes(item.id));
  }

  function addToBasket(product: SourcedProduct, status: SourcingBasketStatus = 'review') {
    const linked = requirementForProduct(product);
    if (!linked || isReadOnly) return;
    const current = latest.current;
    const basket = current.basket.filter((item) => !(item.requirementId === linked.id && item.productId === product.id));
    basket.push({ id: `basket-${linked.id}-${product.id}`, requirementId: linked.id, productId: product.id, quantity: linked.quantity, status });
    save({ ...current, basket });
  }

  function updateProduct(id: string, updates: Partial<SourcedProduct>) {
    const current = latest.current;
    save({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...updates } : product) });
  }

  async function searchSupplier() {
    if (!requirement) return;
    const tiles = requirement.category === 'Tiles';
    setSearching(true);
    setMessage('');
    try {
      const response = await fetch('/api/property/sourcing/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: tiles ? 'topps-tiles' : 'stonewater', requirement: { name: requirement.name, size: requirement.size, specification: requirement.specification } }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Supplier search failed.');
      const found = ((data.products ?? []) as SourcedProduct[]).map((product) => ({
        ...product, category: product.category ?? requirement.category,
        requirementIds: Array.from(new Set([...(product.requirementIds ?? []), requirement.id])),
      }));
      const current = latest.current;
      const products = [...current.products];
      found.forEach((product) => {
        const index = products.findIndex((item) => item.id === product.id || item.url === product.url);
        if (index >= 0) products[index] = { ...products[index], stock: product.stock, stockEvidence: product.stockEvidence, lastChecked: product.lastChecked,
          requirementIds: Array.from(new Set([...(products[index].requirementIds ?? []), requirement.id])) };
        else products.push(product);
      });
      if (!isReadOnly) save({ ...current, products });
      setCategory('All');
      setMessage(found.length ? `${found.length} ${tiles ? 'Topps Tiles' : 'Stonewater'} result${found.length === 1 ? '' : 's'} for ${requirement.name}.` : `No ${tiles ? 'Topps Tiles' : 'Stonewater'} results. Try the wider-market links.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Supplier search failed.');
    } finally {
      setSearching(false);
    }
  }

  function addRequirement() {
    if (!roomId || !newName.trim()) return;
    const item: SourcingRequirement = {
      id: `req-${Date.now()}`, roomId, name: newName.trim(), category: 'Other', specification: newName.trim(), size: newSize.trim() || 'Size to confirm',
      quantity: 1, status: 'fitter_check', constraints: {}, requiredComponents: [],
    };
    save({ ...latest.current, requirements: [...latest.current.requirements, item] });
    setRequirementId(item.id);
    setNewName(''); setNewSize(''); setAdding(false);
  }

  const openRoom = (id: SourcingRoomId) => { setRoomId(id); setRequirementId(null); setCategory('All'); setQuery(''); setMessage(''); };

  if (!room) {
    return <MaterialsOverview sourcing={sourcing} basketTotal={basketTotal} isReadOnly={isReadOnly} onOpenRoom={openRoom}
      onUpdateBasket={(basket) => save({ ...latest.current, basket })} />;
  }

  const tiles = requirement?.category === 'Tiles';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={() => setRoomId(null)} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> All rooms</button>
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">{room.label}</h2>
            <select aria-label="Switch room" value={room.id} onChange={(event) => openRoom(event.target.value as SourcingRoomId)} className="rounded-lg border-gray-200 py-1 text-sm dark:border-slate-700 dark:bg-slate-800">
              {rooms.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Materials & products · {roomRequirements.length} quote items</p>
        </div>
        <BasketPill count={sourcing.basket.length} total={basketTotal} />
      </div>

      <section aria-label="Quote items">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">From your quote</h3>
          {!isReadOnly && <button onClick={() => setAdding((value) => !value)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"><Plus className="h-4 w-4" /> Add item</button>}
        </div>
        {adding && <div className="mb-3 grid gap-2 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-950/30 sm:grid-cols-[2fr_1fr_auto]">
          <input value={newName} onChange={(event) => setNewName(event.target.value)} placeholder="What is it? e.g. Mirror cabinet" className="rounded-lg border-gray-300 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <input value={newSize} onChange={(event) => setNewSize(event.target.value)} placeholder="Size, e.g. 600 × 700mm" className="rounded-lg border-gray-300 text-sm dark:border-slate-600 dark:bg-slate-900" />
          <button onClick={addRequirement} disabled={!newName.trim()} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50">Add</button>
        </div>}
        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
          <button onClick={() => setRequirementId(null)} className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm ${!requirement ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' : 'border-gray-200 bg-white text-gray-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'}`}>
            <div className="font-medium">All items</div><div className="text-xs text-gray-500">{roomRequirements.length} in quote</div>
          </button>
          {roomRequirements.map((item) => {
            const picked = sourcing.basket.some((entry) => entry.requirementId === item.id);
            const hasProducts = productsFor(sourcing, item).length > 0;
            return <button key={item.id} onClick={() => { setRequirementId(item.id); setCategory('All'); setMessage(''); }} aria-pressed={requirement?.id === item.id}
              className={`w-56 shrink-0 rounded-xl border px-3 py-2 text-left ${requirement?.id === item.id ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-200 dark:bg-blue-950/40 dark:ring-blue-900' : 'border-gray-200 bg-white hover:border-gray-300 dark:border-slate-700 dark:bg-slate-900'}`}>
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 dark:text-white">{item.name}</span>
                {picked ? <Check aria-label="In basket" className="h-4 w-4 shrink-0 text-blue-600" /> : item.status === 'fitter_check' ? <TriangleAlert aria-label="Fitter check" className="h-4 w-4 shrink-0 text-amber-500" /> : null}
              </div>
              <div className="mt-0.5 text-xs font-medium text-gray-700 dark:text-slate-300">{item.size}</div>
              <div className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-slate-400">{hasProducts ? item.specification : item.notes ?? 'No supplier match yet'}</div>
            </button>;
          })}
        </div>
      </section>

      {requirement && <RequirementPanel requirement={requirement} products={productsFor(sourcing, requirement)} basketIds={sourcing.basket.filter((item) => item.requirementId === requirement.id).map((item) => item.productId)}
        searching={searching} tiles={tiles} message={message} onSearch={searchSupplier} />}

      <div className="flex gap-1 overflow-x-auto border-b border-gray-200 dark:border-slate-700" role="tablist" aria-label="Product categories">
        {categories.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={category === id} onClick={() => setCategory(id)} disabled={id !== 'All' && categoryCounts[id] === 0}
            className={`flex min-w-[88px] shrink-0 flex-col items-center gap-1 border-b-2 px-3 pb-2 pt-1 text-xs font-medium disabled:opacity-35 ${category === id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'}`}>
            <Icon className="h-5 w-5" /><span>{label}</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">Search products</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, sizes or suppliers…" className="w-full rounded-xl border-gray-200 bg-gray-50 py-2.5 pl-9 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 dark:border-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="rounded border-gray-300" /> In stock only
        </label>
        <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="rounded-xl border-gray-200 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="recommended">Sort: Recommended</option><option value="stock">Sort: In stock first</option><option value="price">Sort: Price, low to high</option>
        </select>
      </div>

      <div>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">{category === 'All' ? 'Products' : category} <span className="font-normal text-gray-500">({results.length} results)</span></h3>
        {results.length === 0 ? <EmptyResults requirement={requirement} /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((product) => {
              const linked = requirementForProduct(product);
              const inBasket = sourcing.basket.some((item) => item.productId === product.id && item.requirementId === linked?.id);
              return <ProductCard key={product.id} product={product} requirement={linked} showRequirement={!requirement} inBasket={inBasket} disabled={isReadOnly}
                onOpen={() => setDetailId(product.id)} onAdd={() => addToBasket(product, product.note || product.stock !== 'IN_STOCK' ? 'ask_fitter' : 'review')} />;
            })}
          </div>
        )}
      </div>

      {detail && <ProductDetail product={detail} requirement={requirementForProduct(detail)} disabled={isReadOnly}
        inBasket={sourcing.basket.some((item) => item.productId === detail.id)}
        onClose={() => setDetailId(null)} onAdd={(status) => addToBasket(detail, status)} onUpdate={(updates) => updateProduct(detail.id, updates)} />}
    </div>
  );
}

function BasketPill({ count, total }: { count: number; total: number }) {
  return <div className="rounded-xl bg-gray-50 px-4 py-2.5 text-right dark:bg-slate-800">
    <div className="flex items-center justify-end gap-2 text-sm font-medium text-gray-700 dark:text-slate-200"><ShoppingBasket className="h-4 w-4" /> {count} basket items</div>
    <div className="text-lg font-semibold text-gray-900 dark:text-white">{money.format(total)}</div>
  </div>;
}

function StockBadge({ stock, compact = false }: { stock: SourcingStock; compact?: boolean }) {
  const style = stockStyles[stock];
  return <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${style.text} ${compact ? 'rounded-full bg-white/95 px-2 py-0.5 shadow-sm dark:bg-slate-900/90' : ''}`}>
    <span className={`h-2 w-2 rounded-full ${style.dot}`} />{style.label}
  </span>;
}

function MaterialsOverview({ sourcing, basketTotal, isReadOnly, onOpenRoom, onUpdateBasket }: {
  sourcing: ProjectSourcing; basketTotal: number; isReadOnly: boolean; onOpenRoom: (id: SourcingRoomId) => void; onUpdateBasket: (basket: ProjectSourcing['basket']) => void;
}) {
  const estimates = rooms.map((room) => {
    const items = sourcing.requirements.filter((item) => item.roomId === room.id);
    return { room, items, estimate: items.reduce((total, item) => total + estimateFor(sourcing, item), 0), hero: sourcing.products.find((product) => product.id === room.heroProductId) };
  });
  const byCategory = categories.slice(1).map((item) => ({
    label: item.label,
    total: sourcing.requirements.reduce((total, requirement) => total + (productsFor(sourcing, requirement)[0]?.category === item.id ? estimateFor(sourcing, requirement) : 0), 0),
  })).filter((item) => item.total > 0);
  const estimate = estimates.reduce((total, item) => total + item.estimate, 0);
  const inStock = sourcing.products.filter((product) => product.stock === 'IN_STOCK').length;
  const toOrder = sourcing.products.filter((product) => product.stock === 'TO_ORDER').length;
  const unmatched = sourcing.requirements.filter((item) => item.category !== 'Fitter check' && productsFor(sourcing, item).length === 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">Quote items · product fit · stock</p>
          <h2 className="mt-1 text-xl font-semibold text-gray-900 dark:text-white">Materials sourcing</h2>
          <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-slate-400">Every item from the bathroom quote, matched to supplier products with direct links, photos and live stock. Prices and stock can change; check before ordering.</p>
        </div>
        <BasketPill count={sourcing.basket.length} total={basketTotal} />
      </div>

      <section>
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">Rooms in this project</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          {estimates.map(({ room, items, estimate: roomEstimate, hero }) => (
            <button key={room.id} onClick={() => onOpenRoom(room.id)} aria-label={`Open ${room.label}`} className="group overflow-hidden rounded-2xl border border-gray-200 bg-white text-left shadow-sm transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
              <div className="aspect-[16/9] overflow-hidden bg-gray-100 dark:bg-slate-800">
                {hero && <img src={hero.imageUrl} alt={`${room.label}: ${hero.name}`} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />}
              </div>
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">{room.label}</div>
                  <div className="text-sm text-gray-500 dark:text-slate-400">{items.length} quote items · {money.format(roomEstimate)} est.</div>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600" />
              </div>
            </button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="font-semibold text-gray-900 dark:text-white">Stock at a glance</h3>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30"><div className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{inStock}</div><div className="text-xs text-emerald-800 dark:text-emerald-200">products in stock</div></div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30"><div className="text-2xl font-semibold text-amber-700 dark:text-amber-300">{toOrder}</div><div className="text-xs text-amber-800 dark:text-amber-200">available to order (longer delivery)</div></div>
            <div className="rounded-xl bg-gray-50 p-3 dark:bg-slate-800"><div className="text-2xl font-semibold text-gray-700 dark:text-slate-200">{unmatched.length}</div><div className="text-xs text-gray-600 dark:text-slate-300">quote items with no supplier match</div></div>
          </div>
          {unmatched.length > 0 && <p className="mt-3 text-xs text-gray-500 dark:text-slate-400">Not sold by Stonewater: {unmatched.map((item) => `${item.name} (${roomLabel(item.roomId)})`).join(', ')}.</p>}
        </div>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="text-sm text-gray-500 dark:text-slate-400">Estimated materials</div>
          <div className="text-3xl font-semibold text-gray-900 dark:text-white">{money.format(estimate)}</div>
          <p className="mt-1 text-xs text-gray-500">Cheapest top pick for each part of each quote item.</p>
          <dl className="mt-3 space-y-1.5 text-sm">{byCategory.map((item) => <div key={item.label} className="flex justify-between"><dt className="text-gray-600 dark:text-slate-300">{item.label}</dt><dd className="font-medium text-gray-900 dark:text-white">{money.format(item.total)}</dd></div>)}</dl>
        </div>
      </section>

      {sourcing.basket.length > 0 && <BasketTable sourcing={sourcing} total={basketTotal} isReadOnly={isReadOnly} onUpdate={onUpdateBasket} />}
    </div>
  );
}

const roomLabel = (id: SourcingRoomId) => rooms.find((room) => room.id === id)?.label ?? id;

function BasketTable({ sourcing, total, isReadOnly, onUpdate }: { sourcing: ProjectSourcing; total: number; isReadOnly: boolean; onUpdate: (basket: ProjectSourcing['basket']) => void }) {
  return <section className="overflow-hidden rounded-2xl border border-gray-200 dark:border-slate-700">
    <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-slate-900"><div><h3 className="font-semibold text-gray-900 dark:text-white">Project basket</h3><p className="text-xs text-gray-500 dark:text-slate-400">Review before ordering. No orders are placed from here.</p></div><span className="font-semibold text-gray-900 dark:text-white">{money.format(total)}</span></div>
    <div className="divide-y divide-gray-100 dark:divide-slate-800">{sourcing.basket.map((item) => {
      const product = sourcing.products.find((candidate) => candidate.id === item.productId);
      const linked = sourcing.requirements.find((candidate) => candidate.id === item.requirementId);
      if (!product) return null;
      return <div key={item.id} className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 dark:bg-slate-900">
        <img src={product.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg bg-gray-100 object-cover" />
        <div className="min-w-0 flex-1"><a href={product.url} target="_blank" rel="noreferrer" className="block truncate text-sm font-medium text-gray-900 hover:text-blue-700 dark:text-white">{product.name}</a>
          <div className="text-xs text-gray-500">{linked?.name} · {linked ? roomLabel(linked.roomId) : ''} · {product.supplier} · <StockBadge stock={product.stock} /></div></div>
        <span className="text-sm font-semibold text-gray-800 dark:text-slate-200">{money.format(lineCost(linked, product))}</span>
        <select aria-label={`Status for ${product.name}`} disabled={isReadOnly} value={item.status} onChange={(event) => onUpdate(sourcing.basket.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as SourcingBasketStatus } : entry))} className="rounded-lg border-gray-200 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"><option value="review">Review</option><option value="ask_fitter">Ask fitter</option><option value="approved">Approved</option><option value="ordered">Ordered</option></select>
        {!isReadOnly && <button aria-label={`Remove ${product.name} from basket`} onClick={() => onUpdate(sourcing.basket.filter((entry) => entry.id !== item.id))} className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>}
      </div>;
    })}</div>
  </section>;
}

function RequirementPanel({ requirement, products, basketIds, searching, tiles, message, onSearch }: {
  requirement: SourcingRequirement; products: SourcedProduct[]; basketIds: string[]; searching: boolean; tiles: boolean; message: string; onSearch: () => void;
}) {
  const parts = coverage(requirement, products.filter((product) => basketIds.includes(product.id)));
  return <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-slate-700 dark:bg-slate-800/50">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{requirement.name}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${requirement.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{requirement.status === 'confirmed' ? 'Confirmed in quote' : 'Fitter check'}</span></div>
        <p className="mt-1 text-sm text-gray-700 dark:text-slate-200"><span className="font-medium">Size:</span> {requirement.size ?? 'Not stated'}{requirement.unit === 'm²' && requirement.category === 'Tiles' ? '' : ` · Qty ${requirement.quantity}`}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{requirement.specification}</p>
        {requirement.notes && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{requirement.notes}</p>}
        {requirement.referenceProduct && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Reference product outside Topps Tiles: <strong>{requirement.referenceProduct.name}</strong> by {requirement.referenceProduct.supplier}. {requirement.recommendationNote}</p>}
        {parts.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{parts.map(({ part, covered }) => <span key={part} className={`rounded-full px-2 py-0.5 text-xs ${covered ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'}`}>{covered ? '✓ ' : ''}{part.replace(/-/g, ' ')}</span>)}</div>}
      </div>
      {requirement.category !== 'Fitter check' && <button onClick={onSearch} disabled={searching} className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
        {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{searching ? 'Searching…' : tiles ? 'Search Topps Tiles' : 'Search Stonewater'}</button>}
    </div>
    {message && <p role="status" className="mt-3 text-sm text-gray-600 dark:text-slate-300">{message}</p>}
  </div>;
}

function marketLinks(requirement: SourcingRequirement) {
  const query = encodeURIComponent(`${requirement.name} ${requirement.size ?? ''}`);
  return [
    { name: 'Victorian Plumbing', url: `https://www.victorianplumbing.co.uk/search?search=${query}` },
    { name: 'Easy Bathrooms', url: `https://www.easybathrooms.com/search?q=${query}` },
    { name: 'Screwfix', url: `https://www.screwfix.com/search?search=${query}` },
    { name: 'Wickes', url: `https://www.wickes.co.uk/search?text=${query}` },
  ];
}

function EmptyResults({ requirement }: { requirement?: SourcingRequirement }) {
  return <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
    <p className="text-sm text-gray-600 dark:text-slate-300">{requirement ? `No products matched yet for ${requirement.name}.` : 'No products match these filters.'}</p>
    {requirement && requirement.category !== 'Fitter check' && <div className="mt-3 flex flex-wrap justify-center gap-2">{marketLinks(requirement).map((link) => <a key={link.name} href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 hover:border-blue-300 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><ExternalLink className="h-3 w-3" />{link.name}</a>)}</div>}
  </div>;
}

function ProductImage({ product, className }: { product: SourcedProduct; className: string }) {
  const [failed, setFailed] = useState(false);
  if (!product.imageUrl || failed) {
    return <div className={`${className} flex items-center justify-center bg-gray-100 p-3 text-center text-xs text-gray-500 dark:bg-slate-800`}>Photo on supplier page</div>;
  }
  return <img src={product.imageUrl} alt={product.name} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className={`${className} bg-white object-contain`} />;
}

function ProductCard({ product, requirement, showRequirement, inBasket, disabled, onOpen, onAdd }: {
  product: SourcedProduct; requirement?: SourcingRequirement; showRequirement: boolean; inBasket: boolean; disabled: boolean; onOpen: () => void; onAdd: () => void;
}) {
  return <article className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
    <button onClick={onOpen} className="relative block text-left" aria-label={`View details for ${product.name}`}>
      <ProductImage product={product} className="aspect-[4/3] w-full" />
      {product.topPick && <span className="absolute left-2 top-2 rounded-md bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">Top pick</span>}
      <span className="absolute right-2 top-2"><StockBadge stock={product.stock} compact /></span>
    </button>
    <div className="flex flex-1 flex-col p-3">
      {showRequirement && requirement && <span className="text-[11px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">For: {requirement.name}</span>}
      <button onClick={onOpen} className="text-left"><h4 className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-700 dark:text-white">{product.name}</h4></button>
      {product.size && <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{product.size}</p>}
      <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{money.format(product.price)}{product.priceUnit && <span className="text-sm font-normal text-gray-500"> {product.priceUnit.replace('per ', '/ ')}</span>}</div>
      <a href={product.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs text-gray-500 hover:text-blue-700 dark:text-slate-400">{product.supplier} <ExternalLink className="h-3 w-3" /></a>
      {product.note && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{product.note}</p>}
      <div className="mt-auto pt-3">
        <button disabled={disabled || inBasket} onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent dark:hover:bg-blue-950/40">
          {inBasket ? <><Check className="h-4 w-4" /> In basket</> : <><Plus className="h-4 w-4" /> Add</>}
        </button>
      </div>
    </div>
  </article>;
}

function ProductDetail({ product, requirement, inBasket, disabled, onClose, onAdd, onUpdate }: {
  product: SourcedProduct; requirement?: SourcingRequirement; inBasket: boolean; disabled: boolean; onClose: () => void;
  onAdd: (status: SourcingBasketStatus) => void; onUpdate: (updates: Partial<SourcedProduct>) => void;
}) {
  const gallery = product.gallery?.length ? product.gallery : [product.imageUrl];
  const [image, setImage] = useState(gallery[0]);
  const [tab, setTab] = useState<'details' | 'specs' | 'supplier'>('details');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const canCheck = /stonewaterbathrooms\.com|tradebase\.com/.test(product.url);
  const needsFitter = Boolean(product.note) || requirement?.status === 'fitter_check';

  useEffect(() => { setImage(gallery[0]); setTab('details'); setCheckError(''); }, [product.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  async function checkStock() {
    setChecking(true);
    setCheckError('');
    try {
      const response = await fetch('/api/property/sourcing/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stock', url: product.url }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Stock check failed.');
      onUpdate({ stock: data.stock, stockEvidence: data.stockEvidence, lastChecked: data.lastChecked });
    } catch (reason) {
      setCheckError(reason instanceof Error ? reason.message : 'Stock check failed.');
    } finally {
      setChecking(false);
    }
  }

  const specs: [string, string][] = [
    ...Object.entries(product.specs ?? {}),
    ...(product.sku ? [['Supplier code', product.sku] as [string, string]] : []),
    ...(product.components.length ? [['Includes', product.components.map((part) => part.replace(/-/g, ' ')).join(', ')] as [string, string]] : []),
  ];

  return <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-label={product.name} onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-300"><ArrowLeft className="h-4 w-4" /> Back to results</button>
        <button onClick={onClose} aria-label="Close product details" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div>
            <img src={image} alt={product.name} referrerPolicy="no-referrer" className="aspect-square w-full rounded-xl border border-gray-100 bg-white object-contain dark:border-slate-800" />
            {gallery.length > 1 && <div className="mt-2 grid grid-cols-5 gap-1.5">{gallery.map((src, index) => <button key={src} onClick={() => setImage(src)} aria-label={`Photo ${index + 1}`} className={`overflow-hidden rounded-lg border-2 ${src === image ? 'border-blue-600' : 'border-transparent'}`}><img src={src} alt="" referrerPolicy="no-referrer" className="aspect-square w-full bg-white object-cover" /></button>)}</div>}
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-white">{product.name}</h3>
            {product.size && <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{product.size}</p>}
            <div className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{money.format(product.price)}{product.priceUnit && <span className="text-base font-normal text-gray-500"> {product.priceUnit.replace('per ', '/ ')}</span>}</div>
            {product.priceUnit === 'per m²' && requirement && <p className="text-xs text-gray-500">{money.format(lineCost(requirement, product))} for {requirement.quantity}m² (before waste)</p>}
            <a href={product.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{product.supplier} product page <ExternalLink className="h-3.5 w-3.5" /></a>
            <div className="mt-3 rounded-lg bg-gray-50 p-2.5 dark:bg-slate-800">
              <StockBadge stock={product.stock} />
              <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-600 dark:text-slate-300"><Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{product.stockEvidence}</p>
              <p className="mt-1 text-[11px] text-gray-400">Checked {new Date(product.lastChecked).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              {canCheck && <button onClick={checkStock} disabled={checking} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-600 disabled:opacity-60 dark:text-blue-400"><RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />{checking ? 'Checking…' : 'Check live stock'}</button>}
              {checkError && <p className="mt-1 text-xs text-red-600">{checkError}</p>}
            </div>
          </div>
        </div>

        {requirement && <div className={`rounded-xl border p-3 text-sm ${needsFitter ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30'}`}>
          <div className={`font-semibold ${needsFitter ? 'text-amber-800 dark:text-amber-200' : 'text-emerald-800 dark:text-emerald-200'}`}>{needsFitter ? 'Fitter check' : 'Matches the quote'}</div>
          <p className="mt-0.5 text-gray-700 dark:text-slate-200">For <strong>{requirement.name}</strong> ({requirement.size}).</p>
          {product.note && <p className="mt-1 text-gray-700 dark:text-slate-200">{product.note}</p>}
        </div>}

        <div className="grid grid-cols-2 gap-2">
          <button disabled={disabled || inBasket} onClick={() => onAdd(needsFitter ? 'ask_fitter' : 'review')} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-gray-300 dark:disabled:bg-slate-700">
            {inBasket ? <><Check className="h-4 w-4" /> In basket</> : <><Plus className="h-4 w-4" /> Add to basket</>}</button>
          <button disabled={disabled || inBasket} onClick={() => onAdd('ask_fitter')} className="rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600 disabled:border-gray-300 disabled:text-gray-400">Ask fitter</button>
        </div>

        <div>
          <div className="flex gap-4 border-b border-gray-200 text-sm dark:border-slate-700" role="tablist">
            {([['details', 'Details'], ['specs', 'Specifications'], ['supplier', 'Supplier info']] as const).map(([id, label]) => <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`border-b-2 pb-2 font-medium ${tab === id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500'}`}>{label}</button>)}
          </div>
          {tab === 'details' && <p className="pt-3 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{product.description || 'See the supplier page for the full description.'}</p>}
          {tab === 'specs' && <dl className="divide-y divide-gray-100 pt-1 text-sm dark:divide-slate-800">{specs.map(([key, value]) => <div key={key} className="grid grid-cols-2 gap-3 py-2.5"><dt className="text-gray-500 dark:text-slate-400">{key}</dt><dd className="text-gray-900 dark:text-white">{value}</dd></div>)}</dl>}
          {tab === 'supplier' && <dl className="divide-y divide-gray-100 pt-1 text-sm dark:divide-slate-800">
            <div className="grid grid-cols-2 gap-3 py-2.5"><dt className="text-gray-500">Supplier</dt><dd className="text-gray-900 dark:text-white">{product.supplier}</dd></div>
            <div className="grid grid-cols-2 gap-3 py-2.5"><dt className="text-gray-500">Product page</dt><dd><a href={product.url} target="_blank" rel="noreferrer" className="break-all text-blue-600 hover:underline dark:text-blue-400">{product.url.replace(/^https:\/\/(www\.)?/, '')}</a></dd></div>
            <div className="grid grid-cols-2 gap-3 py-2.5"><dt className="text-gray-500">Stock source</dt><dd className="text-gray-900 dark:text-white">{product.stockEvidence}</dd></div>
          </dl>}
        </div>
      </div>
    </aside>
  </div>;
}
