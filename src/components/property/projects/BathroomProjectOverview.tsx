'use client';

import { useState } from 'react';
import { ArrowRight, Bath, Check, Columns2, Grid2x2, Plus, Ruler, ShowerHead, TriangleAlert } from 'lucide-react';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';
import { bathroomRooms, basketTotal, basketLineCost, excludedBasketPrice, leadingRequirementOption, productSize, requirementSelection, roomName } from './bathroomProject.helpers';
import { measurementArea, plannedTileCalculation } from '@/lib/sourcing/tilePlanner';
import QuoteChecklist from './QuoteChecklist';
import { fixtureFit } from '@/lib/sourcing/fixtureFit';
import BathroomHealthCheck from './BathroomHealthCheck';
import BathroomRoomMap from './BathroomRoomMap';
import { isPrimaryOption, requiredDemands } from '@/lib/sourcing/selection';
import QuoteSizeStatus from './QuoteSizeStatus';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });

type Props = {
  sourcing: ProjectSourcing;
  roomId?: SourcingRoomId;
  isReadOnly: boolean;
  onOpenRoom: (roomId: SourcingRoomId) => void;
  onOpenRequirement: (requirement: SourcingRequirement, part?: string) => void;
  onOpenProduct: (product: SourcedProduct, requirement: SourcingRequirement) => void;
  onSaveRoom: (id: SourcingRoomId, metadata: { name: string; sizeNotes: string }) => void;
  onAddItem: () => void;
  onAddOption: () => void;
};

export default function BathroomProjectOverview({ sourcing, roomId, isReadOnly, onOpenRoom, onOpenRequirement, onOpenProduct, onSaveRoom, onAddItem, onAddOption }: Props) {
  const [comparing, setComparing] = useState(false);
  const [search, setSearch] = useState('');
  const searching = !!search.trim();
  const visibleRooms = bathroomRooms.filter((room) => !roomId || room.id === roomId);
  const requirements = requiredDemands(sourcing, roomId);
  const selected = requirements.filter((item) => requirementSelection(sourcing, item).selected.length > 0);
  const incomplete = requirements.filter((item) => !requirementSelection(sourcing, item).complete);
  const fitterChecks = requirements.filter((item) => item.status === 'fitter_check');
  const excluded = sourcing.basket.filter((item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return product && excludedBasketPrice(sourcing, item) && requirements.some((requirement) => requirement.id === item.requirementId);
  }).length;

  return <div className="min-w-0 space-y-6">
    <header className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className={`text-[11px] font-semibold uppercase tracking-wide ${roomId === 'shower-room' ? 'text-blue-700' : 'text-teal-700'}`}>{roomId ? (roomId === 'shower-room' ? 'Shower fit-out' : 'Bath fit-out') : 'Bathroom project'}</p>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{roomId ? roomName(sourcing, roomId) : 'Project overview'}</h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-slate-400">{selected.length} of {requirements.length} items have selections · {incomplete.length} incomplete · {fitterChecks.length} fitter checks</p>
      </div>
      {!roomId && <button onClick={() => setComparing((value) => !value)} aria-label={comparing ? 'Close comparison' : 'Compare rooms'} title={comparing ? 'Close comparison' : 'Compare rooms'} aria-pressed={comparing} className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-teal-600 px-3 text-sm font-medium text-teal-700 dark:text-teal-300"><Columns2 className="h-4 w-4" /><span className="hidden sm:inline">{comparing ? 'Close comparison' : 'Compare rooms'}</span></button>}
    </header>
    {!isReadOnly && <div className="flex flex-wrap gap-3 border-b border-gray-200 pb-3 dark:border-slate-700"><button onClick={onAddItem} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white"><Plus className="h-4 w-4" />Add item</button><button onClick={onAddOption} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal-700 px-3 text-sm font-medium text-teal-700 dark:text-teal-300"><Plus className="h-4 w-4" />Add supplier option</button></div>}
    <div className="grid min-w-0 gap-3 sm:grid-cols-2">
      <label className="min-w-0 text-xs font-medium">Find an item<input aria-label="Search project items" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tiles, mirror, valves..." className="mt-1 min-h-11 w-full rounded-md border-gray-200 text-sm dark:bg-slate-800" /></label>
      <label className="min-w-0 text-xs font-medium">Jump to item<select aria-label="Jump to project item" value="" onChange={(event) => { const item = requirements.find((entry) => entry.id === event.target.value); if (item) onOpenRequirement(item); }} className="mt-1 min-h-11 w-full rounded-md border-gray-200 text-sm dark:bg-slate-800"><option value="">Choose an item</option>{requirements.map((item) => <option key={item.id} value={item.id}>{!roomId ? `${roomName(sourcing, item.roomId)} · ` : ''}{item.name}</option>)}</select></label>
    </div>

    {searching && <section aria-label="Project search results" className="min-w-0 space-y-4">
      {visibleRooms.map((room) => <div key={room.id} className="min-w-0">
        <h3 className={`mb-2 text-sm font-semibold ${room.id === 'shower-room' ? 'text-blue-700' : 'text-teal-700'}`}>{roomName(sourcing, room.id)}</h3>
        <QuoteChecklist sourcing={sourcing} roomId={room.id} search={search} onOpenRequirement={onOpenRequirement} onOpenProduct={onOpenProduct} />
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">{requirements.filter((item) => item.roomId === room.id && !sourcing.quoteLines?.some((line) => line.requirementId === item.id) && `${item.name} ${item.specification} ${requirementSelection(sourcing, item).selected.map(({ product }) => product.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())).map((item) => <ChoiceCard key={item.id} sourcing={sourcing} requirement={item} onOpen={(part) => onOpenRequirement(item, part)} onOpenProduct={(product) => onOpenProduct(product, item)} />)}</div>
      </div>)}
    </section>}

    <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 border-y border-gray-200 py-3 dark:border-slate-700">
      <span className="text-sm text-gray-600 dark:text-slate-300">Selected subtotal <strong className="ml-2 text-lg text-gray-900 dark:text-white">{money.format(basketTotal(sourcing, roomId))}</strong></span>
      <span className="text-xs text-gray-500">{excluded ? `${excluded} box/tile-priced selections excluded. ` : ''}Tiles with a saved plan include allowance and pack rounding. Delivery and unselected items excluded.</span>
    </div>

    <BathroomHealthCheck sourcing={sourcing} roomId={roomId} onOpenRequirement={onOpenRequirement} />

    {!roomId && <nav aria-label="Bathroom quick view" className="grid min-w-0 grid-cols-2 gap-3">
      {bathroomRooms.map((room, index) => {
        const items = requiredDemands(sourcing, room.id);
        const selectedCount = items.filter((item) => requirementSelection(sourcing, item).selected.length > 0).length;
        const Icon = room.id === 'main-bathroom' ? Bath : ShowerHead;
        return <button key={room.id} type="button" onClick={() => onOpenRoom(room.id)} className={`min-w-0 border-l-4 py-2 pl-3 text-left ${index === 0 ? 'border-teal-500' : 'border-blue-500'}`}>
          <span className="flex items-start gap-2 text-sm font-semibold text-gray-900 dark:text-white"><Icon className="h-5 w-5 shrink-0" /><span className="break-words">{roomName(sourcing, room.id)}</span></span>
          <span className="mt-2 block text-xs text-gray-500 dark:text-slate-400">{selectedCount}/{items.length} choices · {money.format(basketTotal(sourcing, room.id))}</span>
          <span className="mt-1 block text-xs font-medium text-teal-700 dark:text-teal-300">Open room <ArrowRight className="inline h-3.5 w-3.5" /></span>
        </button>;
      })}
    </nav>}

    <div className={`grid min-w-0 gap-3 ${roomId ? '' : 'sm:grid-cols-2'}`}>
      {visibleRooms.map((room) => <BathroomRoomMap key={room.id} sourcing={sourcing} roomId={room.id} onOpenRequirement={onOpenRequirement} />)}
    </div>

    {comparing && !roomId && <RoomComparison sourcing={sourcing} onOpenRequirement={onOpenRequirement} onOpenProduct={onOpenProduct} />}

    {!searching && <div className={`grid min-w-0 gap-6 ${!roomId ? 'xl:grid-cols-2' : ''}`}>
      {visibleRooms.map((room, index) => {
        const items = requiredDemands(sourcing, room.id);
        const completed = items.filter((item) => requirementSelection(sourcing, item).complete).length;
        const Icon = room.id === 'main-bathroom' ? Bath : ShowerHead;
        return <section key={room.id} className="min-w-0" aria-label={`${roomName(sourcing, room.id)} choices`}>
          {!roomId && <div className={`mb-3 flex items-start justify-between gap-3 border-l-4 pl-3 ${index === 0 ? 'border-teal-500' : 'border-blue-500'}`}>
            <div className="min-w-0">
              <h3 className="flex items-start gap-2 font-semibold text-gray-900 dark:text-white"><Icon className="mt-0.5 h-5 w-5 shrink-0" />{roomName(sourcing, room.id)}</h3>
              <p className="mt-1 text-xs text-gray-500">{completed}/{items.length} items complete · {money.format(basketTotal(sourcing, room.id))} selected</p>
            </div>
            <button aria-label={`Open ${roomName(sourcing, room.id)}`} onClick={() => onOpenRoom(room.id)} title={`Open ${roomName(sourcing, room.id)}`} className="shrink-0 rounded-lg p-3 text-teal-700 hover:bg-teal-50 dark:text-teal-300"><ArrowRight className="h-5 w-5" /></button>
          </div>}
          <RoomNotes key={`${room.id}-${sourcing.rooms?.[room.id]?.name}-${sourcing.rooms?.[room.id]?.sizeNotes}`} sourcing={sourcing} roomId={room.id} isReadOnly={isReadOnly} onSave={onSaveRoom} />
          <QuoteChecklist sourcing={sourcing} roomId={room.id} search={search} onOpenRequirement={onOpenRequirement} onOpenProduct={onOpenProduct} />
          <section aria-label={`${roomName(sourcing, room.id)} tile plans`} className="mt-4 border-y border-gray-200 py-3 dark:border-slate-700">
            <h4 className="flex items-center gap-2 text-sm font-semibold"><Grid2x2 className="h-4 w-4 text-teal-700" />Tiles & measurements</h4>
            <div className="divide-y divide-gray-100 dark:divide-slate-800">{items.filter((item) => /^(wall tiles|floor tiles)/i.test(item.name)).map((item) => {
              let measured: number | undefined;
              try { if (item.tilePlan) measured = measurementArea(item.tilePlan.measurement); } catch { /* Invalid older drafts remain unconfirmed. */ }
              return <button key={item.id} type="button" onClick={() => onOpenRequirement(item)} className="flex min-h-14 w-full items-center justify-between gap-3 py-2 text-left">
                <span className="min-w-0"><span className="block text-sm font-medium">{item.name}</span><span className="block break-words text-xs text-gray-500">{measured !== undefined ? `${measured} m² confirmed` : `${item.quantity} ${item.unit ?? ''} from quote · confirm area`}{item.tilePlan?.choice ? ` · ${item.tilePlan.choice.name}` : ' · choose a tile'}</span>{!item.tilePlan && item.unit === 'm²' && <span className="mt-1 block text-xs font-medium text-blue-700">Order estimate: {Number((item.quantity * 1.1).toFixed(3))} m² with provisional 10% allowance · Calculate tiles</span>}</span><ArrowRight className="h-4 w-4 shrink-0 text-teal-700" />
              </button>;
            })}</div>
          </section>
          <div className={`mt-3 grid min-w-0 gap-3 ${roomId ? 'sm:grid-cols-2 lg:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {items.filter((item) => !search.trim() || `${item.name} ${item.size} ${item.specification} ${sourcing.products.filter((product) => product.requirementIds?.includes(item.id)).map((product) => product.name).join(' ')}`.toLowerCase().includes(search.trim().toLowerCase())).map((item) => <ChoiceCard key={item.id} sourcing={sourcing} requirement={item} onOpen={(part) => onOpenRequirement(item, part)} onOpenProduct={(product) => onOpenProduct(product, item)} />)}
          </div>
          {items.length === 0 && <p className="py-4 text-sm text-gray-500">No quote items in this room.</p>}
        </section>;
      })}
    </div>}
  </div>;
}

function RoomNotes({ sourcing, roomId, isReadOnly, onSave }: {
  sourcing: ProjectSourcing; roomId: SourcingRoomId; isReadOnly: boolean;
  onSave: Props['onSaveRoom'];
}) {
  const [name, setName] = useState(roomName(sourcing, roomId));
  const [notes, setNotes] = useState(sourcing.rooms?.[roomId]?.sizeNotes ?? '');
  const [editing, setEditing] = useState(false);
  return <div className="text-sm">
    <p className="flex items-start gap-2 text-gray-600 dark:text-slate-300"><Ruler className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" /><span className="break-words">{sourcing.rooms?.[roomId]?.sizeNotes || 'Room measurements not recorded. Check measurements with your fitter.'}</span></p>
    {!isReadOnly && <button onClick={() => setEditing((value) => !value)} className="mt-1 min-h-10 text-xs font-medium text-teal-700 dark:text-teal-300">{editing ? 'Cancel' : 'Edit room name & size notes'}</button>}
    {editing && !isReadOnly && <form onSubmit={(event) => { event.preventDefault(); onSave(roomId, { name: name.trim(), sizeNotes: notes.trim() }); setEditing(false); }} className="mt-2 space-y-2 border-l-2 border-teal-200 pl-3">
      <label className="block text-xs text-gray-600 dark:text-slate-300">Room name<input maxLength={80} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-slate-800" /></label>
      <label className="block text-xs text-gray-600 dark:text-slate-300">Size & layout notes<textarea maxLength={1000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1 w-full rounded-lg border-gray-300 text-sm dark:bg-slate-800" /></label>
      <button disabled={!name.trim()} className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-teal-700 px-3 text-xs font-medium text-white disabled:opacity-50"><Check className="h-4 w-4" /> Save room</button>
    </form>}
  </div>;
}

function ChoiceCard({ sourcing, requirement, onOpen, onOpenProduct }: {
  sourcing: ProjectSourcing; requirement: SourcingRequirement; onOpen: (part?: string) => void; onOpenProduct: (product: SourcedProduct) => void;
}) {
  const { selected, missing, complete, unknown, warnings, deviation } = requirementSelection(sourcing, requirement);
  const candidates = sourcing.products.filter((product) => product.requirementIds?.includes(requirement.id));
  const option = leadingRequirementOption(candidates, requirement);
  const supporting = candidates.filter((product) => !isPrimaryOption(product, requirement));
  return <article className="min-w-0 rounded-lg border border-gray-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
    <button onClick={() => onOpen()} className="flex min-h-10 w-full items-start justify-between gap-2 text-left text-sm font-semibold text-gray-900 hover:text-teal-700 dark:text-white">
      <span className="min-w-0 break-words">{requirement.name}</span><ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
    </button>
    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">{requirement.source === 'household' ? 'Added item' : 'Quote'}: {requirement.size || 'Size not stated'} · Qty {requirement.quantity}{requirement.unit ? ` ${requirement.unit}` : ''}</p>
    {requirement.relatedToId && <p className="mt-1 text-xs text-gray-500">Related to: {sourcing.requirements.find((item) => item.id === requirement.relatedToId)?.name}</p>}
    {selected.length === 0 ? <div className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-500 dark:border-slate-800">
      <p>No selection · {candidates.length} products</p>
      {option && <button onClick={() => onOpenProduct(option)} aria-label={`View option for ${requirement.name}: ${option.name}`} className="mt-2 flex w-full items-start gap-2 text-left"><SelectionImage product={option} /><span className="min-w-0"><span className="line-clamp-2 text-xs">Option: {option.name}</span><span className="block text-xs">{productSize(option)}</span></span></button>}
      {supporting.length > 0 && <p className="mt-2">{supporting.length} supporting part{supporting.length === 1 ? '' : 's'} available separately</p>}
    </div> :
      <div className="mt-2 space-y-2">{selected.map(({ item, product }) => <div key={item.id} className="border-t border-gray-100 pt-2 dark:border-slate-800">
        <button onClick={() => onOpenProduct(product)} aria-label={`View details for ${product.name}`} className="flex w-full items-start gap-2 text-left">
          <SelectionImage product={product} />
          <span className="min-w-0"><span className="line-clamp-2 text-xs font-medium text-gray-800 dark:text-slate-200">{product.name}</span><span className="mt-0.5 block text-xs text-gray-500">{productSize(product)}</span></span>
        </button>
        <p className="mt-1 text-xs text-gray-600 dark:text-slate-300">{excludedBasketPrice(sourcing, item) ? `${money.format(product.price)} ${product.priceUnit} · excluded` : `${money.format(basketLineCost(sourcing, item))} · Qty ${item.quantity}`} · {item.status.replace(/_/g, ' ')}</p>
        {plannedTileCalculation(sourcing, item) ? <p className="mt-1 text-xs text-teal-700">{plannedTileCalculation(sourcing, item)!.purchasedCoverageM2} m² purchased coverage</p> : <QuoteSizeStatus requirement={requirement} product={product} />}
        {requirement.category !== 'Tiles' && <p className={`mt-1 text-xs ${fixtureFit(requirement, product).status === 'no_fit' ? 'text-red-700' : 'text-gray-600'}`}>{fixtureFit(requirement, product).label}</p>}
      </div>)}</div>}
    <p className={`mt-2 flex items-start gap-1 text-xs ${complete ? 'text-teal-700 dark:text-teal-300' : 'text-amber-700 dark:text-amber-300'}`}>
      {complete ? <Check className="h-3.5 w-3.5 shrink-0" /> : <TriangleAlert className="h-3.5 w-3.5 shrink-0" />}
      <span>{complete ? 'All required parts selected' : unknown ? 'Selected - included contents unconfirmed' : missing.length ? `Still needed: ${missing.map((part) => part.replace(/-/g, ' ')).join(', ')}` : 'Selection needed'}{requirement.status === 'fitter_check' ? ' · Fitter check' : ''}</span>
    </p>
    {deviation && <p className="mt-2 text-xs text-blue-700">Replacement selected - quote deviation needs review</p>}
    {warnings.map((warning) => <p key={warning} role="status" className="mt-2 text-xs text-amber-800">{warning}</p>)}
    {!complete && <div className="mt-1 flex flex-wrap gap-2">{missing.map((part) => <button key={part} onClick={() => onOpen(unknown ? undefined : part)} className="min-h-11 text-xs font-medium text-blue-700 underline underline-offset-2">{unknown ? 'Confirm' : 'Find'} {part.replace(/-/g, ' ')}<ArrowRight className="ml-1 inline h-3 w-3" /></button>)}</div>}
  </article>;
}

function SelectionImage({ product }: { product: SourcedProduct }) {
  const [failed, setFailed] = useState(false);
  return product.imageUrl && !failed ? <img src={product.imageUrl} alt="" onError={() => setFailed(true)} loading="lazy" referrerPolicy="no-referrer" className="h-14 w-14 shrink-0 rounded-md bg-white object-contain" /> : <Grid2x2 className="h-14 w-14 shrink-0 bg-gray-50 p-4 text-gray-400 dark:bg-slate-800" />;
}

function RoomComparison({ sourcing, onOpenRequirement, onOpenProduct }: Pick<Props, 'sourcing' | 'onOpenRequirement' | 'onOpenProduct'>) {
  const categories = Array.from(new Set(sourcing.requirements.map((item) => item.category)));
  return <section aria-label="Room comparison" className="min-w-0 border-y border-gray-200 py-4 dark:border-slate-700">
    <h3 className="font-semibold text-gray-900 dark:text-white">Compare rooms</h3>
    <p className="mt-1 text-xs text-gray-500">Quoted sizes and actual selections. Room clearance, connections and layout still need fitter confirmation.</p>
    {categories.map((category) => <div key={category} className="mt-4">
      <h4 className="border-b border-gray-100 pb-2 text-sm font-semibold text-teal-700 dark:border-slate-800 dark:text-teal-300">{category}</h4>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">{bathroomRooms.map((room) => {
        const items = sourcing.requirements.filter((item) => item.roomId === room.id && item.category === category);
        return <div key={room.id} className="min-w-0 pt-2">
          <p className="mb-2 text-xs font-semibold text-gray-500">{roomName(sourcing, room.id)}</p>
          {items.length === 0 && <p className="text-xs text-gray-400">Not in quote</p>}
          {items.map((item) => <div key={item.id} className="mb-3 min-w-0">
            <button onClick={() => onOpenRequirement(item)} className="text-left text-sm font-medium text-gray-900 hover:text-teal-700 dark:text-white">{item.name} <ArrowRight className="inline h-3.5 w-3.5" /></button>
            <p className="text-xs text-gray-500">Quote: {item.size || 'Size not stated'} · Qty {item.quantity}{item.unit ? ` ${item.unit}` : ''}</p>
            {requirementSelection(sourcing, item).selected.length === 0 && <p className="mt-1 text-xs text-amber-700">No selection</p>}
            {requirementSelection(sourcing, item).selected.map(({ item: entry, product }) => <button key={entry.id} onClick={() => onOpenProduct(product, item)} className="mt-2 flex w-full items-start gap-2 text-left">
              <SelectionImage product={product} /><span className="min-w-0 break-words text-xs text-gray-700 dark:text-slate-200">{product.name}<span className="block text-gray-500">{productSize(product)} · {entry.status.replace(/_/g, ' ')}</span><span className="block">{excludedBasketPrice(sourcing, entry) ? `${money.format(product.price)} ${product.priceUnit} · excluded` : `${money.format(basketLineCost(sourcing, entry))} · Qty ${entry.quantity}`}</span><QuoteSizeStatus requirement={item} product={product} /></span>
            </button>)}
          </div>)}
        </div>;
      })}</div>
    </div>)}
  </section>;
}
