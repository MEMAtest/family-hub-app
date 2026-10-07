'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog } from '@headlessui/react';
import type { LucideIcon } from 'lucide-react';
import {
  Armchair, ArrowLeft, Bath, Check, ExternalLink, Grid2x2, Heater, LayoutGrid, LoaderCircle, Plus, RefreshCw,
  Search, ShoppingBasket, ShowerHead, Trash2, Truck, Wrench, X,
} from 'lucide-react';
import type {
  ProjectSourcing, SourcedProduct, SourcingBasketStatus, SourcingRequirement, SourcingRoomId, SourcingStock,
} from '@/types/sourcing.types';
import type { PropertyProject } from '@/types/property.types';
import { useFamilyStore } from '@/store/familyStore';
import { SOURCING_SEED_VERSION, createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import BathroomProjectOverview from './BathroomProjectOverview';
import TilePlanner from './TilePlanner';
import SourcingEntryDialog from './SourcingEntryDialog';
import FixtureFitPanel from './FixtureFitPanel';
import ProductRefresh from './ProductRefresh';
import IncludedPartsEditor from './IncludedPartsEditor';
import QuoteSizeStatus from './QuoteSizeStatus';
import SelectedChoiceSummary from './SelectedChoiceSummary';
import { migrate } from '@/lib/sourcing/migrate';
import { demandFor, evaluateSelection } from '@/lib/sourcing/selection';
import { productComponentEvidence } from '@/lib/sourcing/productMatching';
import { fixtureFit, saveFixtureSpace } from '@/lib/sourcing/fixtureFit';
import { addHouseholdItem, addHouseholdProduct, chooseSourcingOption, optionConflicts, linkRelatedItemAsReplacement } from '@/lib/sourcing/householdItems';
import { plannedTileCalculation } from '@/lib/sourcing/tilePlanner';
import { bathroomRooms, basketStatuses, basketTotal as sourcingBasketTotal, basketLineCost, excludedBasketPrice, isBathroomProject as bathroomProject, isUncountedPrice, productLineCost, productSize, roomName } from './bathroomProject.helpers';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

const rooms = bathroomRooms;

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
  IN_STOCK: { label: 'In stock', dot: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-300' },
  LOW_STOCK: { label: 'Low stock', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  TO_ORDER: { label: 'Available to order', dot: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-300' },
  OUT_OF_STOCK: { label: 'Out of stock', dot: 'bg-red-500', text: 'text-red-700 dark:text-red-300' },
  UNKNOWN: { label: 'Check stock', dot: 'bg-gray-400', text: 'text-gray-600 dark:text-slate-300' },
};

type Props = {
  project: PropertyProject;
  onUpdateProject: (updates: Partial<PropertyProject>) => void;
  isReadOnly?: boolean;
  view?: 'overview' | 'room' | 'products';
  selectedRoomId?: SourcingRoomId;
  selectedRequirementId?: string;
  selectedPart?: string;
  onNavigate?: (roomId: SourcingRoomId | null, requirementId?: string, part?: string) => void;
  onBack?: () => void;
};
type SortOrder = 'recommended' | 'price' | 'stock';

const productsFor = (sourcing: ProjectSourcing, requirement: SourcingRequirement) =>
  sourcing.products.filter((product) => product.requirementIds?.includes(requirement.id));

// Suppliers whose live stock the app can read (Topps Tiles blocks it).
const canCheckStock = (url: string) => /stonewaterbathrooms\.com|tradebase\.com|capietra\.com|tilesahead\.co\.uk|walltiles\.co\.uk|bertandmay\.com/.test(url);
const STOCK_MAX_AGE_MS = 24 * 60 * 60 * 1000;

// A box or single-tile price can't be totalled without knowing how many are needed, so those stay
// out of totals (the basket says so) rather than counting as if one box covered the room.
const lineCost = (requirement: SourcingRequirement | undefined, product: SourcedProduct) =>
  productLineCost(product, requirement?.quantity ?? 1);




export { migrate } from '@/lib/sourcing/migrate';

export default function ProjectMaterialsView({ project, onUpdateProject, isReadOnly = false, view = 'overview', selectedRoomId, selectedRequirementId, selectedPart, onNavigate, onBack }: Props) {
  const isBathroomProject = bathroomProject(project);
  const needsSeed = isBathroomProject && (!project.sourcing || (project.sourcing.version ?? 1) < SOURCING_SEED_VERSION);
  const sourcing = useMemo<ProjectSourcing>(() => {
    if (!needsSeed) return project.sourcing ?? { requirements: [], products: [], basket: [] };
    return project.sourcing ? migrate(project.sourcing) : createBathroomSourcingSeed();
  }, [needsSeed, project.sourcing]);

  const [localRoomId, setRoomId] = useState<SourcingRoomId | null>(selectedRoomId ?? null);
  const [localRequirementId, setRequirementId] = useState<string | null>(selectedRequirementId ?? null);
  const [localPart, setPartFilter] = useState(selectedPart ?? '');
  const roomId = onNavigate ? selectedRoomId ?? null : localRoomId;
  const requirementId = onNavigate ? selectedRequirementId ?? null : localRequirementId;
  const partFilter = onNavigate ? selectedPart ?? '' : localPart;
  const [detailRequirementId, setDetailRequirementId] = useState<string | null>(null);
  const [category, setCategory] = useState('All');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOrder>('recommended');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showUnsuitable, setShowUnsuitable] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [message, setMessage] = useState('');
  const [adding, setAdding] = useState(false);
  const [entryMode, setEntryMode] = useState<'item' | 'product'>('item');
  const [selectionError, setSelectionError] = useState('');
  const [planningProduct, setPlanningProduct] = useState<SourcedProduct>();
  const pendingPlanningProduct = useRef<SourcedProduct>();
  const [plannerOpen, setPlannerOpen] = useState(false);
  const pendingPlannerOpen = useRef(false);
  const plannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRoomId(selectedRoomId ?? null);
    setRequirementId(selectedRequirementId ?? null);
    setPartFilter(selectedPart ?? '');
    setCategory('All'); setQuery(''); setMessage(''); setAdding(false); setDetailId(null);
    setPlanningProduct(pendingPlanningProduct.current); pendingPlanningProduct.current = undefined;
    setPlannerOpen(pendingPlannerOpen.current); pendingPlannerOpen.current = false;
  }, [view, selectedRoomId, selectedRequirementId, selectedPart]);

  useEffect(() => {
    if (!plannerOpen && !planningProduct) return;
    let scrollFrame = 0;
    // The parent restores item-entry scroll on the first frame. Open the planner after that.
    const frame = requestAnimationFrame(() => {
      scrollFrame = requestAnimationFrame(() => {
        const planner = plannerRef.current;
        const main = planner?.closest('main');
        if (!planner || !main) return;
        const roomBar = main.querySelector<HTMLElement>('[data-bathroom-room-bar]');
        const selection = main.querySelector<HTMLElement>('[aria-label="Current selected choice"]');
        main.scrollTo({ top: main.scrollTop + planner.getBoundingClientRect().top - main.getBoundingClientRect().top - (roomBar?.offsetHeight ?? 0) - (selection?.offsetHeight ?? 0) - 12, behavior: 'auto' });
      });
    });
    return () => { cancelAnimationFrame(frame); cancelAnimationFrame(scrollFrame); };
  }, [plannerOpen, planningProduct, requirementId]);

  useEffect(() => {
    if (needsSeed && !isReadOnly) onUpdateProject({ sourcing, updatedAt: new Date().toISOString() });
  }, [needsSeed, isReadOnly, onUpdateProject, sourcing]);

  // Supplier searches and stock checks finish after an await; always build on the latest workspace so
  // basket changes made meanwhile are not overwritten.
  const latest = useRef(sourcing);
  latest.current = sourcing;
  const readOnly = useRef(isReadOnly);
  readOnly.current = isReadOnly;
  function save(next: ProjectSourcing) {
    if (readOnly.current) return;
    latest.current = next;
    onUpdateProject({ sourcing: next, updatedAt: new Date().toISOString() });
  }
  function saveTileSourcing(next: ProjectSourcing) {
    if (readOnly.current) return;
    const savedProjects = useFamilyStore.getState().propertyProjects;
    const projects = savedProjects.some((item) => item.id === project.id) ? savedProjects.map((item) => item.id === project.id ? { ...item, sourcing: next } : item) : [{ ...project, sourcing: next }];
    if (JSON.stringify(projects).length > 2500000) throw new Error('These projects have too many large photos to sync. Use a cropped photo or enter the measurements manually.');
    save(next);
  }

  const room = rooms.find((item) => item.id === roomId);
  const roomRequirements = sourcing.requirements.filter((item) => !roomId || item.roomId === roomId);
  const requirement = roomRequirements.find((item) => item.id === requirementId);
  const detail = sourcing.products.find((product) => product.id === detailId);
  const basketTotal = sourcingBasketTotal(sourcing);

  const roomProducts = useMemo(() => {
    const ids = new Set((requirement ? [requirement] : roomRequirements).map((item) => item.id));
    return sourcing.products.filter((product) => product.requirementIds?.some((id) => ids.has(id)));
  }, [requirement, roomRequirements, sourcing.products]);

  // The AI only judged a product against the quote item it was searched for.
  const isRejected = (product: SourcedProduct) => product.aiReview?.verdict === 'not_suitable' && (!requirement || product.aiReview.requirementId === requirement.id);

  const results = useMemo(() => {
    const text = query.trim().toLowerCase();
    const rank: Record<SourcingStock, number> = { IN_STOCK: 0, LOW_STOCK: 1, TO_ORDER: 2, UNKNOWN: 3, OUT_OF_STOCK: 4 };
    return roomProducts
      .filter((product) => !partFilter || productComponentEvidence(product, [partFilter])[partFilter]?.state === 'included')
      .filter((product) => category === 'All' || product.category === category)
      .filter((product) => !inStockOnly || product.stock === 'IN_STOCK')
      .filter((product) => showUnsuitable || !isRejected(product))
      .filter((product) => !text || `${product.name} ${product.size ?? ''} ${product.supplier}`.toLowerCase().includes(text))
      .sort((a, b) => sort === 'price' ? a.price - b.price
        : sort === 'stock' ? rank[a.stock] - rank[b.stock] || a.price - b.price
          : Number(!!b.topPick) - Number(!!a.topPick) || rank[a.stock] - rank[b.stock] || a.price - b.price);
  }, [roomProducts, category, inStockOnly, query, sort, showUnsuitable, partFilter]); // eslint-disable-line react-hooks/exhaustive-deps
  const hiddenUnsuitable = roomProducts.filter((product) => isRejected(product)).length;

  const categoryCounts = useMemo(() => Object.fromEntries(categories.map((item) => [item.id,
    item.id === 'All' ? roomProducts.length : roomProducts.filter((product) => product.category === item.id).length])), [roomProducts]);

  function requirementForProduct(product: SourcedProduct) {
    if (requirement && product.requirementIds?.includes(requirement.id)) return requirement;
    return roomRequirements.find((item) => product.requirementIds?.includes(item.id))
      ?? sourcing.requirements.find((item) => product.requirementIds?.includes(item.id));
  }

  function addToBasket(product: SourcedProduct, status: SourcingBasketStatus = 'review', linked = requirementForProduct(product)) {
    if (!linked || isReadOnly) return;
    setSelectionError('');
    if (linked.category === 'Tiles') {
      setDetailId(null); setRequirementId(linked.id); setRoomId(linked.roomId); setPlanningProduct(product);
      if (onNavigate && (selectedRoomId !== linked.roomId || selectedRequirementId !== linked.id)) {
        pendingPlanningProduct.current = product;
        onNavigate?.(linked.roomId, linked.id);
      }
      return;
    }
    const current = latest.current;
    const conflicts = optionConflicts(current, demandFor(current, linked), product);
    if (conflicts.some((entry) => entry.status === 'ordered')) { setSelectionError('An existing choice is marked ordered. Resolve that order before replacing it.'); return; }
    if (conflicts.length && !window.confirm(`Replace the current choice for ${linked.name}? Supporting parts will remain. No supplier order is changed.`)) return;
    try { save(chooseSourcingOption(current, linked.id, product.id, status)); }
    catch (reason) { setSelectionError(reason instanceof Error ? reason.message : 'Could not select this option.'); }
  }

  function updateProduct(id: string, updates: Partial<SourcedProduct>) {
    const current = latest.current;
    save({ ...current, products: current.products.map((product) => product.id === id ? { ...product, ...updates } : product) });
  }

  async function searchSupplier() {
    if (!requirement || isReadOnly) return;
    const tiles = requirement.category === 'Tiles';
    setSearching(true);
    setMessage('');
    try {
      const response = await fetch('/api/property/sourcing/search', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supplierId: tiles ? 'uk-tiles' : 'stonewater', requirement: { id: requirement.id, name: partFilter ? `${requirement.name} ${partFilter.replace(/-/g, ' ')}` : requirement.name, size: partFilter ? '' : requirement.size, specification: partFilter ? `Supporting ${partFilter.replace(/-/g, ' ')} for ${requirement.name}. ${requirement.specification}` : requirement.specification, requiredComponents: partFilter ? [partFilter] : requirement.requiredComponents, constraints: partFilter ? {} : requirement.constraints } }),
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
        if (index >= 0) products[index] = { ...products[index], stock: product.stock, stockEvidence: product.stockEvidence, lastChecked: product.lastChecked, aiReview: product.aiReview ?? products[index].aiReview,
          requirementIds: Array.from(new Set([...(products[index].requirementIds ?? []), requirement.id])) };
        else products.push(product);
      });
      if (!isReadOnly) save({ ...current, products });
      setCategory('All');
      const counts = found.reduce<Record<string, number>>((total, product) => {
        if (product.aiReview) total[product.aiReview.verdict] = (total[product.aiReview.verdict] ?? 0) + 1;
        return total;
      }, {});
      const aiSummary = data.ai?.status === 'reviewed'
        ? tiles
          ? ` AI compared the shop tiles with the quote: ${counts.match ?? 0} close, ${counts.similar ?? 0} similar look, ${counts.not_suitable ?? 0} not similar (hidden).`
          : ` AI checked them against the quote: ${counts.match ?? 0} match, ${counts.needs_parts ?? 0} need extra parts, ${counts.part ?? 0} are parts, ${counts.not_suitable ?? 0} not suitable (hidden).`
        : data.ai?.status === 'unavailable' ? ' The AI check is unavailable right now, so these results are not checked against the quote.' : '';
      setShowUnsuitable(false);
      const source = tiles ? 'Topps Tiles and UK tile shop' : 'Stonewater';
      setMessage(found.length ? `${found.length} ${source} result${found.length === 1 ? '' : 's'} for ${requirement.name}.${aiSummary}` : `No ${source} results. Try the wider-market links.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : 'Supplier search failed.');
    } finally {
      setSearching(false);
    }
  }

  // Stock goes stale: refresh what the household is looking at (basket and this room's products)
  // when it was last checked over a day ago. A few at a time, once per visit, never in read-only view.
  const refreshed = useRef(new Set<string>());
  useEffect(() => {
    if (isReadOnly) return;
    const now = Date.now();
    const inBasket = new Set(sourcing.basket.map((item) => item.productId));
    const stale = [...sourcing.products.filter((product) => inBasket.has(product.id)), ...roomProducts]
      .filter((product, index, all) => all.findIndex((other) => other.id === product.id) === index)
      .filter((product) => canCheckStock(product.url) && !refreshed.current.has(product.id)
        && !(now - new Date(product.lastChecked).getTime() < STOCK_MAX_AGE_MS))
      .slice(0, 8);
    if (stale.length === 0) return;
    stale.forEach((product) => refreshed.current.add(product.id));
    let next = 0;
    const worker = async () => {
      while (next < stale.length) {
        if (readOnly.current) break;
        const product = stale[next++];
        try {
          const response = await fetch('/api/property/sourcing/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'stock', url: product.url }) });
          if (!response.ok) continue;
          const data = await response.json();
          updateProduct(product.id, { stock: data.stock, stockEvidence: data.stockEvidence, lastChecked: data.lastChecked });
        } catch {
          // Leave the old reading; "Check live stock" is still there.
        }
      }
    };
    void Promise.all([worker(), worker()]);
  }, [roomId, isReadOnly, sourcing.basket.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const startEntry = (mode: 'item' | 'product') => { setEntryMode(mode); setAdding(true); };

  const openRoom = (id: SourcingRoomId) => { setRoomId(id); setRequirementId(null); setCategory('All'); setQuery(''); setMessage(''); onNavigate?.(id); };
  const openRequirement = (item: SourcingRequirement, part?: string) => {
    const openPlan = item.category === 'Tiles' && !part;
    pendingPlannerOpen.current = openPlan;
    setPlannerOpen(openPlan);
    setRoomId(item.roomId); setRequirementId(item.id); setPartFilter(part ?? ''); setCategory('All'); setQuery(''); setMessage(''); onNavigate?.(item.roomId, item.id, part);
  };
  const editTilePlan = (linked: SourcingRequirement) => {
    if (requirementId !== linked.id || roomId !== linked.roomId) pendingPlannerOpen.current = true;
    openRequirement(linked); setPlannerOpen(true);
  };
  const openProduct = (product: SourcedProduct, linked?: SourcingRequirement) => {
    setSelectionError('');
    if (linked?.category === 'Tiles' && product.id.startsWith('tile-plan-')) {
      editTilePlan(linked); return;
    }
    setDetailId(product.id); setDetailRequirementId(linked?.id ?? null);
  };
  const detailRequirement = sourcing.requirements.find((item) => item.id === detailRequirementId) ?? (detail ? requirementForProduct(detail) : undefined);
  const detailPanel = detail && <ProductDetail product={detail} requirement={detailRequirement} disabled={isReadOnly} selectionError={selectionError}
    fitPanel={detailRequirement && detailRequirement.category !== 'Tiles' ? <FixtureFitPanel key={`${detailRequirement.id}-${detail.id}`} requirement={detailRequirement} product={detail} disabled={isReadOnly}
      onSaveSpace={(space) => save(saveFixtureSpace(latest.current, detailRequirement.id, space))}
      onSaveDimensions={(dimensions) => save({ ...latest.current, products: latest.current.products.map((item) => item.id === detail.id ? { ...item, dimensions: { ...Object.fromEntries(Object.entries(item.dimensions).filter(([key]) => !/^(width|length|depth|height)Mm$/.test(key))), ...dimensions } } : item), basket: latest.current.basket.map((entry) => entry.productId === detail.id && entry.status !== 'ordered' ? { ...entry, status: 'ask_fitter' } : entry) })} /> : undefined}
    inBasket={!!detailRequirement && evaluateSelection(sourcing, detailRequirement).selected.some(({ product }) => product.id === detail.id)}
    onClose={() => setDetailId(null)} onAdd={(status) => addToBasket(detail, status, detailRequirement)} onUpdate={(updates) => updateProduct(detail.id, updates)} />;
  const showOverview = view === 'overview' ? !room : view === 'room' && !requirement;
  const visibleBasket = roomId ? { ...sourcing, basket: sourcing.basket.filter((item) => roomRequirements.some((linked) => linked.id === item.requirementId)) } : sourcing;
  const basket = visibleBasket.basket.length > 0 && <BasketTable sourcing={visibleBasket} total={sourcingBasketTotal(visibleBasket)} isReadOnly={isReadOnly} onOpen={(product, linked) => openProduct(product, linked)} onEditPlan={editTilePlan}
    onUpdate={(entries) => save({ ...latest.current, basket: roomId ? [...latest.current.basket.filter((item) => !roomRequirements.some((linked) => linked.id === item.requirementId)), ...entries] : entries })} />;
  const entryPanel = adding && !isReadOnly && <SourcingEntryDialog mode={entryMode} sourcing={sourcing} roomId={roomId ?? undefined} requirementId={requirementId ?? undefined} onClose={() => setAdding(false)}
    onItem={(input) => { const added = addHouseholdItem(latest.current, input, `req-${crypto.randomUUID()}`); save(added.sourcing); setAdding(false); openRequirement(added.item); }}
    onProduct={(input) => { const added = addHouseholdProduct(latest.current, input, `manual-${crypto.randomUUID()}`); save(added.sourcing); setAdding(false); openProduct(added.product, added.sourcing.requirements.find((item) => item.id === input.requirementId)); }} />;

  if (showOverview) {
    return <div className="min-w-0 space-y-6"><BathroomProjectOverview sourcing={sourcing} roomId={view === 'room' ? roomId ?? undefined : undefined} isReadOnly={isReadOnly}
      onOpenRoom={openRoom} onOpenRequirement={openRequirement} onOpenProduct={openProduct}
      onAddItem={() => startEntry('item')} onAddOption={() => startEntry('product')}
      onSaveRoom={(id, metadata) => save({ ...latest.current, rooms: { ...latest.current.rooms, [id]: { ...latest.current.rooms?.[id], ...metadata } } })} />{basket}{detailPanel}{entryPanel}</div>;
  }

  const tiles = requirement?.category === 'Tiles';
  return (
    <div className="min-w-0 space-y-3">
      {requirement && <SelectedChoiceSummary sourcing={sourcing} requirement={requirement} onOpen={openProduct} onBack={onBack ?? (() => onNavigate?.(roomId))} />}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 max-w-full">
          <button onClick={() => { if (onBack) onBack(); else { setRequirementId(null); if (onNavigate) onNavigate(roomId); else setRoomId(null); } }} className="-my-2 inline-flex items-center gap-1.5 py-3 text-sm text-gray-500 hover:text-gray-800 dark:text-slate-400 dark:hover:text-white"><ArrowLeft className="h-4 w-4" /> {room ? 'Room overview' : 'Project overview'}</button>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h2 className="min-w-0 break-words text-xl font-semibold text-gray-900 dark:text-white">{room ? roomName(sourcing, room.id) : 'Products'}</h2>
            <select aria-label="Switch room" value={roomId ?? ''} onChange={(event) => { const id = event.target.value as SourcingRoomId; if (id) openRoom(id); else { setRoomId(null); setRequirementId(null); setPartFilter(''); onNavigate?.(null); } }} className="min-h-10 max-w-full rounded-lg border-gray-200 py-1 text-sm dark:border-slate-700 dark:bg-slate-800">
              <option value="">All rooms</option>
              {rooms.map((item) => <option key={item.id} value={item.id}>{roomName(sourcing, item.id)}</option>)}
            </select>
          </div>
          <p className="text-sm text-gray-500 dark:text-slate-400">Materials & products · {roomRequirements.length} items</p>
        </div>
        <BasketPill count={sourcing.basket.length} total={basketTotal} />
      </div>

      <section aria-label="Quote items">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">Project items</h3>
          {!isReadOnly && <div className="flex flex-wrap gap-3"><button onClick={() => startEntry('item')} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700"><Plus className="h-4 w-4" />Add item</button><button onClick={() => startEntry('product')} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-teal-700"><Plus className="h-4 w-4" />Add supplier option</button></div>}
        </div>
        <label className="block text-xs font-medium text-gray-600 dark:text-slate-300">Quote item
          <select aria-label="Quote item" value={requirement?.id ?? ''} onChange={(event) => { const item = sourcing.requirements.find((candidate) => candidate.id === event.target.value); if (item) openRequirement(item); else { setRequirementId(null); setPartFilter(''); setCategory('All'); setMessage(''); onNavigate?.(roomId); } }} className="mt-1 min-h-11 w-full min-w-0 rounded-lg border-gray-200 text-sm dark:border-slate-700 dark:bg-slate-800">
            <option value="">All items ({roomRequirements.length})</option>
            {roomRequirements.map((item) => <option key={item.id} value={item.id}>{!room ? `${roomName(sourcing, item.roomId)} · ` : ''}{item.name} · {item.size || 'Size not stated'}{sourcing.basket.some((entry) => entry.requirementId === item.id) ? ' · Selected' : ''}</option>)}
          </select>
        </label>
      </section>

      {partFilter && requirement && <div className="flex flex-wrap items-center justify-between gap-2 border-l-4 border-amber-500 bg-amber-50 px-3 py-2 text-sm text-amber-900"><span>Missing part: {partFilter.replace(/-/g, ' ')}</span><button className="min-h-11 font-medium" onClick={() => openRequirement(requirement)}>Show all options</button></div>}

      {requirement && <RequirementPanel sourcing={sourcing} requirement={requirement}
        searching={searching} tiles={tiles} message={message} onSearch={searchSupplier} isReadOnly={isReadOnly} />}

      {requirement?.source === 'household' && requirement.relatedToId && !requirement.replacesRequirementId && evaluateSelection(sourcing, requirement).selected.length > 0 && !isReadOnly && <div className="border-l-4 border-blue-500 py-2 pl-3 text-sm">
        <p className="text-gray-600 dark:text-slate-300">Related to {sourcing.requirements.find((entry) => entry.id === requirement.relatedToId)?.name}; not yet linked as its replacement.</p>
        <button type="button" className="mt-1 inline-flex min-h-11 items-center gap-2 font-medium text-blue-700 dark:text-blue-300" onClick={() => {
          if (!window.confirm('Use this selected item as the replacement for the related quote item? Existing purchases remain; quote differences still need review.')) return;
          try { save(linkRelatedItemAsReplacement(latest.current, requirement.id)); setSelectionError(''); }
          catch (reason) { setSelectionError(reason instanceof Error ? reason.message : 'Could not link replacement.'); }
        }}><Check className="h-4 w-4" />Use as replacement</button>
      </div>}


      {!tiles && !requirement && <div className="flex flex-wrap gap-1 border-b border-gray-200 dark:border-slate-700" role="tablist" aria-label="Product categories">
        {categories.map(({ id, label, icon: Icon }) => (
          <button key={id} role="tab" aria-selected={category === id} onClick={() => setCategory(id)} disabled={id !== 'All' && categoryCounts[id] === 0}
            className={`flex min-w-[88px] shrink-0 flex-col items-center gap-1 border-b-2 px-3 pb-2 pt-1 text-xs font-medium disabled:opacity-35 ${category === id ? 'border-blue-600 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-slate-400'}`}>
            <Icon className="h-5 w-5" /><span>{label}</span>
          </button>
        ))}
      </div>}

      <div className="flex flex-wrap items-center gap-2">
        <label className="relative min-w-[220px] flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <span className="sr-only">Search products</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products, sizes or suppliers…" className="w-full rounded-lg border-gray-200 bg-gray-50 py-2.5 pl-9 text-sm dark:border-slate-700 dark:bg-slate-800" />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-gray-700 dark:border-slate-700 dark:text-slate-200">
          <input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} className="rounded border-gray-300" /> In stock only
        </label>
        <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value as SortOrder)} className="rounded-xl border-gray-200 py-2.5 text-sm dark:border-slate-700 dark:bg-slate-800">
          <option value="recommended">Sort: Recommended</option><option value="stock">Sort: In stock first</option><option value="price">Sort: Price, low to high</option>
        </select>
      </div>

      <div>
        {!isReadOnly && <div className="mb-3 flex justify-end"><button type="button" onClick={() => startEntry('product')} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal-700 px-3 text-sm font-medium text-teal-700"><Plus className="h-4 w-4" />Add product link</button></div>}
        <h3 className="mb-3 font-semibold text-gray-900 dark:text-white">{tiles ? 'Supplier tile options' : category === 'All' ? 'Products' : category} <span className="font-normal text-gray-500">({results.length} results)</span>
          {hiddenUnsuitable > 0 && <button onClick={() => setShowUnsuitable((value) => !value)} className="ml-3 text-sm font-normal text-blue-600 hover:underline dark:text-blue-400">{showUnsuitable ? 'Hide' : 'Show'} {hiddenUnsuitable} not suitable</button>}</h3>
        {results.length === 0 ? <EmptyResults requirement={requirement} /> : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((product) => {
              const linked = requirementForProduct(product);
              const inBasket = !!linked && evaluateSelection(sourcing, linked).selected.some(({ product: choice }) => choice.id === product.id);
              return <ProductCard key={product.id} product={product} requirement={linked} showRequirement={!requirement} inBasket={inBasket} disabled={isReadOnly}
                onOpen={() => openProduct(product, linked)} onAdd={() => addToBasket(product, product.note || product.stock !== 'IN_STOCK' ? 'ask_fitter' : 'review')} />;
            })}
          </div>
        )}
      </div>

      {requirement && !tiles && <details className="border-b border-gray-200"><summary className="min-h-11 cursor-pointer text-sm text-gray-600">Measurements & room fit</summary><FixtureFitPanel key={requirement.id} requirement={requirement} disabled={isReadOnly} onSaveSpace={(space) => save(saveFixtureSpace(latest.current, requirement.id, space))} /></details>}
      {requirement && <details className="border-b border-gray-200 pb-3"><summary className="min-h-11 cursor-pointer text-sm font-medium">Choice history ({sourcing.choiceHistory?.filter((item) => item.requirementId === requirement.id).length ?? 0})</summary><ul className="space-y-2 text-xs text-gray-600">{sourcing.choiceHistory?.filter((item) => item.requirementId === requirement.id).slice().reverse().map((item) => <li key={item.id} className="break-words">{new Date(item.at).toLocaleString('en-GB')} · {item.selected.name} · {money.format(item.selected.price)}{item.replaced.length ? ` · Replaced: ${item.replaced.map((old) => old.name).join(', ')}` : ' · Selected'}</li>)}</ul></details>}

      {tiles && requirement && <details open={plannerOpen || !!planningProduct} onToggle={(event) => setPlannerOpen(event.currentTarget.open)} className="scroll-mt-24"><summary className="min-h-11 cursor-pointer text-sm text-gray-600">Tile measurements & plan</summary><div ref={plannerRef} className="scroll-mt-24"><TilePlanner key={requirement.id} sourcing={sourcing} requirement={requirement} isReadOnly={isReadOnly} candidate={planningProduct} onSave={saveTileSourcing} /></div></details>}

      {basket}
      {detailPanel}
      {entryPanel}
      {selectionError && !detail && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}
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


function BasketTable({ sourcing, total, isReadOnly, onUpdate, onOpen, onEditPlan }: { sourcing: ProjectSourcing; total: number; isReadOnly: boolean; onUpdate: (basket: ProjectSourcing['basket']) => void; onOpen: (product: SourcedProduct, requirement?: SourcingRequirement) => void; onEditPlan: (requirement: SourcingRequirement) => void }) {
  const perBox = sourcing.basket.filter((item) => excludedBasketPrice(sourcing, item)).length;
  return <section className="min-w-0 border-y border-gray-200 dark:border-slate-700">
    <div className="flex items-center justify-between bg-white px-4 py-3 dark:bg-slate-900"><div><h3 className="font-semibold text-gray-900 dark:text-white">Project basket</h3><p className="text-xs text-gray-500 dark:text-slate-400">Review before ordering. No orders are placed from here.</p></div><div className="text-right"><span className="font-semibold text-gray-900 dark:text-white">{money.format(total)}</span>{perBox > 0 && <p className="text-xs text-amber-700 dark:text-amber-300">+ {perBox} costs unconfirmed (not in total)</p>}</div></div>
    <div className="divide-y divide-gray-100 dark:divide-slate-800">{sourcing.basket.map((item) => {
      const product = sourcing.products.find((candidate) => candidate.id === item.productId);
      const linked = sourcing.requirements.find((candidate) => candidate.id === item.requirementId);
      const planned = plannedTileCalculation(sourcing, item);
      if (!product) return null;
      // On a phone the details get the whole first line and the controls drop to a second line;
      // squeezed into one row the name shrank to a single letter and the price overlapped it.
      return <div key={item.id} data-testid="basket-row" className="flex flex-wrap items-center gap-3 bg-white px-4 py-3 dark:bg-slate-900">
        <button aria-label={`View details for ${product.name}`} title={`View details for ${product.name}`} onClick={() => onOpen(product, linked)} className="shrink-0"><ProductImage product={product} className="h-12 w-12 rounded-lg" /></button>
        <div className="min-w-0 basis-[calc(100%-3.75rem)] sm:basis-0 sm:flex-1"><a href={product.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-medium text-gray-900 hover:text-blue-700 sm:block sm:truncate dark:text-white">{product.name}</a>
          <div className="text-xs text-gray-500">{linked?.name} · {linked ? roomName(sourcing, linked.roomId) : ''} · {product.supplier} · <StockBadge stock={product.stock} /></div>
          <p className="mt-1 text-xs text-gray-500">{productSize(product)}</p></div>
        <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <span className="mr-auto text-sm font-semibold text-gray-800 sm:mr-0 dark:text-slate-200">{excludedBasketPrice(sourcing, item) ? `${money.format(product.price)} ${(product.priceUnit ?? '').replace('per ', '/ ')} · excluded` : money.format(basketLineCost(sourcing, item))}</span>
          {planned && linked ? <button type="button" onClick={() => onEditPlan(linked)} className="min-h-10 text-xs text-teal-700 dark:text-teal-300">{planned.boxesNeeded !== undefined ? `${planned.boxesNeeded} boxes` : `${planned.orderQuantity} ${product.priceUnit === 'per tile' ? 'tiles' : 'm²'}`} · Edit plan</button> : <label className="flex items-center gap-1 text-xs text-gray-500">Qty
            <input type="number" aria-label={`Quantity for ${product.name}`} disabled={isReadOnly} min={product.priceUnit === 'per m²' ? 0.01 : 1} step={product.priceUnit === 'per m²' ? 'any' : 1} value={item.quantity} onChange={(event) => { const quantity = Number(event.target.value); if (Number.isFinite(quantity) && quantity > 0 && (product.priceUnit === 'per m²' || Number.isInteger(quantity))) onUpdate(sourcing.basket.map((entry) => entry.id === item.id ? { ...entry, quantity } : entry)); }} className="min-h-10 w-20 rounded-lg border-gray-200 text-xs dark:border-slate-700 dark:bg-slate-800" />
          </label>}
          <select aria-label={`Status for ${product.name}`} disabled={isReadOnly} value={item.status} onChange={(event) => onUpdate(sourcing.basket.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as SourcingBasketStatus } : entry))} className="min-h-10 rounded-lg border-gray-200 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800">{basketStatuses.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}</select>
          {!isReadOnly && <button aria-label={`Remove ${product.name} from basket`} onClick={() => onUpdate(sourcing.basket.filter((entry) => entry.id !== item.id))} className="rounded-md p-3 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"><Trash2 className="h-4 w-4" /></button>}
        </div>
      </div>;
    })}</div>
  </section>;
}

function RequirementPanel({ sourcing, requirement, searching, tiles, message, onSearch, isReadOnly }: {
  sourcing: ProjectSourcing; requirement: SourcingRequirement; searching: boolean; tiles: boolean; message: string; onSearch: () => void; isReadOnly: boolean;
}) {
  const parts = evaluateSelection(sourcing, requirement).coverage.map((entry) => ({ part: entry.component, covered: entry.quantity >= entry.required, quantity: entry.quantity, required: entry.required }));
  return <section className="border-y border-gray-200 py-4 dark:border-slate-700">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <details className="min-w-0 flex-1">
        <summary className="min-h-11 cursor-pointer text-sm font-medium text-gray-600">Quote specification & coverage</summary>
        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-semibold text-gray-900 dark:text-white">{requirement.name}</h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${requirement.status === 'confirmed' ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'}`}>{requirement.status === 'confirmed' ? 'Confirmed in quote' : 'Fitter check'}</span></div>
        <p className="mt-1 text-sm text-gray-700 dark:text-slate-200"><span className="font-medium">Size:</span> {requirement.size ?? 'Not stated'}{requirement.unit === 'm²' && requirement.category === 'Tiles' ? '' : ` · Qty ${requirement.quantity}`}</p>
        <p className="mt-0.5 text-sm text-gray-500 dark:text-slate-400">{requirement.specification}</p>
        {requirement.notes && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{requirement.notes}</p>}
        {requirement.referenceProduct && <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">Reference product outside Topps Tiles: <strong>{requirement.referenceProduct.name}</strong> by {requirement.referenceProduct.supplier}. {requirement.recommendationNote}</p>}
        {parts.length > 0 && <div className="mt-2 flex flex-wrap gap-1.5">{parts.map(({ part, covered, quantity, required }) => <span key={part} className={`rounded-full px-2 py-0.5 text-xs ${covered ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' : 'bg-white text-gray-500 ring-1 ring-gray-200 dark:bg-slate-900 dark:ring-slate-700'}`}>{covered ? '✓ ' : ''}{part.replace(/-/g, ' ')}: {quantity}/{required}</span>)}</div>}
      </details>
      {requirement.category !== 'Fitter check' && <button onClick={onSearch} disabled={searching || isReadOnly} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
        {searching ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{searching ? 'Searching…' : tiles ? 'Search UK tile shops' : 'Search Stonewater'}</button>}
    </div>
    {message && <p role="status" className="mt-3 text-sm text-gray-600 dark:text-slate-300">{message}</p>}
  </section>;
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
  return <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center dark:border-slate-700">
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
  return <article className="flex min-w-0 flex-col overflow-hidden rounded-lg border border-gray-200 bg-white transition hover:shadow-md dark:border-slate-700 dark:bg-slate-900">
    <button onClick={onOpen} className="relative block text-left" aria-label={`View details for ${product.name}`}>
      <ProductImage product={product} className="aspect-[4/3] w-full" />
      {product.topPick && <span className="absolute left-2 top-2 rounded-md bg-teal-600 px-2 py-0.5 text-xs font-semibold text-white">Top pick</span>}
      <span className="absolute right-2 top-2"><StockBadge stock={product.stock} compact /></span>
    </button>
    <div className="flex flex-1 flex-col p-3">
      {requirement && <span className={`mb-1 border-l-2 pl-2 text-xs font-medium ${requirement.roomId === 'main-bathroom' ? 'border-teal-500 text-teal-700' : 'border-blue-500 text-blue-700'}`}>{requirement.roomId === 'main-bathroom' ? 'Main Bathroom' : 'Shower Room'} · quote-linked option</span>}
      {showRequirement && requirement && <span className="text-[11px] font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">For: {requirement.name}</span>}
      <button onClick={onOpen} className="text-left"><h4 className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-blue-700 dark:text-white">{product.name}</h4></button>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-slate-400">{productSize(product)}</p>
      <QuoteSizeStatus requirement={requirement} product={product} />
      {requirement && requirement.category !== 'Tiles' && <p className={`mt-1 text-xs ${fixtureFit(requirement, product).status === 'no_fit' ? 'text-red-700' : 'text-gray-600'}`}>{fixtureFit(requirement, product).label}</p>}
      <div className="mt-2 text-lg font-semibold text-gray-900 dark:text-white">{money.format(product.price)}{product.priceUnit && <span className="text-sm font-normal text-gray-500"> {product.priceUnit.replace('per ', '/ ')}</span>}</div>
      <a href={product.url} target="_blank" rel="noreferrer" className="mt-0.5 inline-flex w-fit items-center gap-1 text-xs text-gray-500 hover:text-blue-700 dark:text-slate-400">{product.supplier} <ExternalLink className="h-3 w-3" /></a>
      {product.aiReview && (!requirement || product.aiReview.requirementId === requirement.id) && <AiBadge review={product.aiReview} />}
      {product.note && <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{product.note}</p>}
      <div className="mt-auto pt-3">
        <button disabled={disabled || inBasket} onClick={onAdd} className="inline-flex items-center gap-1 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent dark:hover:bg-blue-950/40">
          {inBasket ? <><Check className="h-4 w-4" /> In basket</> : <><Plus className="h-4 w-4" /> {requirement?.category === 'Tiles' ? 'Plan this tile' : 'Add'}</>}
        </button>
      </div>
    </div>
  </article>;
}

function ProductDetail({ product, requirement, inBasket, disabled, selectionError, fitPanel, onClose, onAdd, onUpdate }: {
  product: SourcedProduct; requirement?: SourcingRequirement; inBasket: boolean; disabled: boolean; onClose: () => void;
  onAdd: (status: SourcingBasketStatus) => void; onUpdate: (updates: Partial<SourcedProduct>) => void;
  selectionError?: string;
  fitPanel?: React.ReactNode;
}) {
  const gallery = product.gallery?.length ? product.gallery : [product.imageUrl];
  const [image, setImage] = useState(gallery[0]);
  const [tab, setTab] = useState<'details' | 'specs' | 'supplier'>('details');
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState('');
  const canCheck = canCheckStock(product.url);
  const needsFitter = Boolean(product.note) || requirement?.status === 'fitter_check';

  useEffect(() => { setImage(gallery[0]); setTab('details'); setCheckError(''); }, [product.id, product.imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [onClose]);

  async function checkStock() {
    if (disabled) return;
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

  return <Dialog open aria-label={product.name} onClose={onClose} className="fixed inset-0 z-[70] flex justify-end bg-black/40">
    <Dialog.Panel className="flex h-full w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl dark:bg-slate-900">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/95 px-5 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95">
        <button onClick={onClose} className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-slate-300"><ArrowLeft className="h-4 w-4" /> Back to results</button>
        <button onClick={onClose} aria-label="Close product details" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="space-y-5 p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <div>
            {image ? <img src={image} alt={product.name} referrerPolicy="no-referrer" className="aspect-square w-full rounded-lg border border-gray-100 bg-white object-contain dark:border-slate-800" /> : <ProductImage product={product} className="aspect-square w-full rounded-lg" />}
            {gallery.length > 1 && <div className="mt-2 grid grid-cols-5 gap-1.5">{gallery.map((src, index) => <button key={src} onClick={() => setImage(src)} aria-label={`Photo ${index + 1}`} className={`overflow-hidden rounded-lg border-2 ${src === image ? 'border-blue-600' : 'border-transparent'}`}><img src={src} alt="" referrerPolicy="no-referrer" className="aspect-square w-full bg-white object-cover" /></button>)}</div>}
          </div>
          <div>
            <h3 className="text-lg font-semibold leading-snug text-gray-900 dark:text-white">{product.name}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{productSize(product)}</p>
            <div className="mt-3 text-2xl font-semibold text-gray-900 dark:text-white">{money.format(product.price)}{product.priceUnit && <span className="text-base font-normal text-gray-500"> {product.priceUnit.replace('per ', '/ ')}</span>}</div>
            {product.priceUnit === 'per m²' && requirement && <p className="text-xs text-gray-500">{money.format(lineCost(requirement, product))} for {requirement.quantity}m² (before waste)</p>}
            <a href={product.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400">{product.supplier} product page <ExternalLink className="h-3.5 w-3.5" /></a>
            <div className="mt-3 rounded-lg bg-gray-50 p-2.5 dark:bg-slate-800">
              <StockBadge stock={product.stock} />
              <p className="mt-1 flex items-start gap-1.5 text-xs text-gray-600 dark:text-slate-300"><Truck className="mt-0.5 h-3.5 w-3.5 shrink-0" />{product.stockEvidence}</p>
              <p className="mt-1 text-[11px] text-gray-400">{product.source === 'household' ? 'Added' : 'Checked'} {new Date(product.lastChecked).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
              {canCheck && <button onClick={checkStock} disabled={checking || disabled} className="mt-1 inline-flex items-center gap-1 py-2.5 text-xs font-medium text-blue-600 disabled:opacity-60 dark:text-blue-400"><RefreshCw className={`h-3.5 w-3.5 ${checking ? 'animate-spin' : ''}`} />{checking ? 'Checking…' : 'Check live stock'}</button>}
              {checkError && <p className="mt-1 text-xs text-red-600">{checkError}</p>}
            </div>
          </div>
        </div>

        {product.aiReview && product.aiReview.requirementId === requirement?.id && <div className="rounded-xl border border-gray-200 p-3 dark:border-slate-700"><AiBadge review={product.aiReview} /><p className="mt-1 text-[11px] text-gray-400">Checked by AI ({product.aiReview.model.split('/').pop()}) from the supplier description. Confirm sizes with your fitter.</p></div>}
        {requirement && <div className="border-y border-gray-200 py-3 text-sm dark:border-slate-700">
          <QuoteSizeStatus requirement={requirement} product={product} />
          <p className="mt-0.5 text-gray-700 dark:text-slate-200">For <strong>{requirement.name}</strong> ({requirement.size}).</p>
          {product.note && <p className="mt-1 text-gray-700 dark:text-slate-200">{product.note}</p>}
        </div>}

        {requirement && <IncludedPartsEditor key={`${product.id}-${requirement.id}-${JSON.stringify(product.componentEvidence)}`} product={product} requirement={requirement} disabled={disabled} onSave={onUpdate} />}
        <details className="border-b border-gray-200"><summary className="min-h-11 cursor-pointer text-sm text-gray-600">Photo, dimensions & room fit</summary><ProductRefresh key={product.id} product={product} disabled={disabled} onUpdate={onUpdate} />{fitPanel}</details>

        <div className="grid grid-cols-2 gap-2">
          <button disabled={disabled || inBasket} onClick={() => onAdd(needsFitter ? 'ask_fitter' : 'review')} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white disabled:bg-gray-300 dark:disabled:bg-slate-700">
            {inBasket ? <><Check className="h-4 w-4" /> In basket</> : <><Plus className="h-4 w-4" /> {requirement?.category === 'Tiles' ? 'Plan this tile' : 'Add to basket'}</>}</button>
          {requirement?.category !== 'Tiles' && <button disabled={disabled || inBasket} onClick={() => onAdd('ask_fitter')} className="rounded-xl border border-blue-600 px-4 py-2.5 text-sm font-medium text-blue-600 disabled:border-gray-300 disabled:text-gray-400">Ask fitter</button>}
        </div>
        {selectionError && <p role="alert" className="text-sm text-red-700">{selectionError}</p>}

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
    </Dialog.Panel>
  </Dialog>;
}

const aiStyles: Record<NonNullable<SourcedProduct['aiReview']>['verdict'], { label: string; className: string }> = {
  match: { label: 'AI: matches the quote', className: 'text-teal-700 dark:text-teal-300' },
  needs_parts: { label: 'AI: needs extra parts', className: 'text-amber-700 dark:text-amber-300' },
  part: { label: 'AI: a part for this item', className: 'text-blue-700 dark:text-blue-300' },
  similar: { label: 'AI: similar look', className: 'text-amber-700 dark:text-amber-300' },
  not_suitable: { label: 'AI: not suitable', className: 'text-red-700 dark:text-red-300' },
};

function AiBadge({ review }: { review: NonNullable<SourcedProduct['aiReview']> }) {
  const style = aiStyles[review.verdict];
  return <div className="mt-2 text-xs">
    <span className={`font-semibold ${style.className}`}>{style.label}</span>
    {review.reason && <span className="text-gray-600 dark:text-slate-300"> · {review.reason}</span>}
    {review.missingParts.length > 0 && <span className="block text-gray-500 dark:text-slate-400">Missing: {review.missingParts.join(', ')}</span>}
  </div>;
}
