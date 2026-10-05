'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ClipboardPaste, History, LoaderCircle, Plus, Ruler, Trash2 } from 'lucide-react';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement, TileChoice, TileMeasurement } from '@/types/sourcing.types';
import { calculateTiles, initialTileMeasurement, measurementArea, saveTilePlan, tileChoiceSchema, tilePlanProductId, tileSourceImage } from '@/lib/sourcing/tilePlanner';
import type { MeasurementRead, TileRead } from '@/lib/sourcing/tileDocument';
import { roomName } from './bathroomProject.helpers';

const money = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const area = (value: number) => `${Number(value.toFixed(3))} m²`;
const field = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border-gray-300 bg-white text-sm dark:border-slate-700 dark:bg-slate-900';
const emptyChoice = (): TileChoice => ({ name: '', supplier: '', url: '', widthMm: 0, lengthMm: 0, price: NaN, priceBasis: 'box' });

async function resizePhoto(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 20 * 1024 * 1024) throw new Error('Choose a JPEG, PNG or WebP photo under 20MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('This browser could not prepare the photo.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.8, 0.65, 0.5]) {
      const result = canvas.toDataURL('image/jpeg', quality);
      if (result.length <= 590000) return result;
    }
    throw new Error('Crop the photo to the measurements or tile label and try again.');
  } finally { URL.revokeObjectURL(url); }
}

function candidateChoice(product: SourcedProduct, sourcing: ProjectSourcing): TileChoice {
  const saved = sourcing.requirements.find((item) => tilePlanProductId(item.id) === product.id)?.tilePlan?.choice;
  if (saved) return { ...saved };
  const numeric = (key: string) => typeof product.dimensions[key] === 'number' ? product.dimensions[key] as number : 0;
  const tileSize = (product.specs?.Size || product.size || '').match(/(\d+(?:\.\d+)?)\s*(?:x|×)\s*(\d+(?:\.\d+)?)\s*(mm|cm)\b/i);
  const multiplier = tileSize?.[3].toLowerCase() === 'cm' ? 10 : 1;
  return {
    ...emptyChoice(), name: product.name, supplier: product.supplier, url: product.url,
    imageUrl: product.imageUrl?.startsWith('https:') ? product.imageUrl : undefined,
    widthMm: numeric('widthMm') || (tileSize ? Number(tileSize[1]) * multiplier : 0), lengthMm: numeric('lengthMm') || (tileSize ? Number(tileSize[2]) * multiplier : 0), price: product.price,
    priceBasis: product.priceUnit === 'per m²' ? 'm2' : product.priceUnit === 'per tile' ? 'tile' : 'box',
  };
}

type Props = { sourcing: ProjectSourcing; requirement: SourcingRequirement; isReadOnly: boolean; candidate?: SourcedProduct; onSave: (next: ProjectSourcing) => void };

export default function TilePlanner({ sourcing, requirement, isReadOnly, candidate, onSave }: Props) {
  const [measurement, setMeasurement] = useState<TileMeasurement>(() => initialTileMeasurement(requirement));
  const [choice, setChoice] = useState<TileChoice>(() => requirement.tilePlan?.choice ?? emptyChoice());
  const [confirmed, setConfirmed] = useState(false);
  const [choiceConfirmed, setChoiceConfirmed] = useState(false);
  const [message, setMessage] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  useEffect(() => {
    if (candidate) { setChoice(candidateChoice(candidate, sourcing)); setChoiceConfirmed(false); setMessage(''); }
  }, [candidate]);
  const latest = useRef(sourcing); latest.current = sourcing;
  const plan = requirement.tilePlan;
  const measurementPhoto = tileSourceImage(sourcing, measurement.source.imageId, measurement.source.imageDataUrl);
  const tilePhoto = tileSourceImage(sourcing, choice.sourceImageId, choice.sourceImageDataUrl) || choice.imageUrl;
  const surface = /floor/i.test(requirement.name) ? 'floor' : 'walls';
  const editMeasurement = (update: Partial<TileMeasurement>) => {
    setMeasurement((current) => ({ ...current, source: current.source.kind === 'quote' ? { ...current.source, kind: 'manual', label: 'Edited quote measurements' } : current.source, ...update, confirmedAt: undefined }));
    setConfirmed(false); setMessage('');
  };
  const editChoice = (update: Partial<TileChoice>) => { setChoice((current) => ({ ...current, ...update })); setChoiceConfirmed(false); setMessage(''); };
  let netArea: number | undefined;
  let result: ReturnType<typeof calculateTiles> | undefined;
  let error = '';
  try { netArea = measurementArea(measurement); result = calculateTiles(measurement, choice); }
  catch (reason) { error = reason instanceof Error && !('issues' in reason) ? reason.message : 'Complete the measurements and tile details.'; }

  function persist(withChoice: boolean) {
    if (isReadOnly || !confirmed || (withChoice && !choiceConfirmed)) return;
    try {
      const next = saveTilePlan(latest.current, requirement.id, measurement, withChoice ? tileChoiceSchema.parse(choice) : undefined);
      onSave(next);
      setConfirmed(false); setChoiceConfirmed(false);
      setMessage(withChoice ? `Tile choice saved for ${roomName(sourcing, requirement.roomId)}. No order placed.` : 'Measurements saved.');
    } catch (reason) { setMessage(reason instanceof Error ? reason.message : 'Check the measurements and tile details.'); }
  }

  return <section aria-label="Tile planner" className="min-w-0 border-y border-gray-200 py-5 text-sm text-gray-900 dark:border-slate-700 dark:text-white">
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-lg font-semibold"><Ruler className="h-5 w-5 text-emerald-700" />Plan {surface === 'walls' ? 'wall' : 'floor'} tiles</h3>
      {plan && <span className="text-xs text-emerald-700 dark:text-emerald-300">Saved {new Date(plan.updatedAt).toLocaleDateString('en-GB')}</span>}
    </header>
    <div className="grid min-w-0 gap-6 lg:grid-cols-2">
      <div className="min-w-0 space-y-4">
        <h4 className="font-semibold">1. Measurements</h4>
        <p className="text-xs text-gray-500">Original quote area: {requirement.quantity} {requirement.unit ?? ''}. Changes below do not overwrite the quote.</p>
        {!isReadOnly && <DocumentReader kind="measurement" roomId={requirement.roomId} surface={surface} onResult={(draft, source) => {
          const read = draft as MeasurementRead;
          editMeasurement({ method: read.sections.length && read.areaM2 === null ? 'dimensions' : 'area', areaM2: read.areaM2 ?? 0, unit: read.unit, sections: read.sections, deductionsM2: read.deductionsM2 ?? 0, wasteIncluded: read.wasteIncluded, source });
        }} />}
        <fieldset disabled={isReadOnly} className="min-w-0 space-y-3">
          <div role="group" aria-label="Measurement method" className="flex border-b border-gray-200 dark:border-slate-700">
            {(['area', 'dimensions'] as const).map((method) => <button key={method} type="button" aria-pressed={measurement.method === method} onClick={() => editMeasurement({ method, sections: method === 'area' ? measurement.sections.filter((section) => Number.isFinite(section.length) && section.length > 0 && Number.isFinite(section.width) && section.width > 0) : measurement.sections.length ? measurement.sections : [{ label: surface === 'floor' ? 'Floor' : 'Wall 1', length: 0, width: 0 }] })} className={`min-h-11 flex-1 border-b-2 px-2 ${measurement.method === method ? 'border-emerald-700 text-emerald-700 dark:text-emerald-300' : 'border-transparent text-gray-500'}`}>{method === 'area' ? 'Known area' : 'Length × width'}</button>)}
          </div>
          {measurement.method === 'area' ? <NumberField label="Tiled area (m²)" value={measurement.areaM2} min={0.001} onChange={(areaM2) => editMeasurement({ areaM2 })} /> : <>
            <label className="block text-xs">Dimension unit<select className={field} value={measurement.unit} onChange={(event) => editMeasurement({ unit: event.target.value as TileMeasurement['unit'] })}><option value="m">Metres</option><option value="cm">Centimetres</option><option value="mm">Millimetres</option></select></label>
            {measurement.sections.map((section, index) => <div key={index} className="space-y-2 border-l-2 border-emerald-200 pl-3">
              <div className="flex items-center gap-2"><label className="min-w-0 flex-1 text-xs">Section name<input aria-label={`Section ${index + 1} name`} className={field} maxLength={80} value={section.label} onChange={(event) => editMeasurement({ sections: measurement.sections.map((item, i) => i === index ? { ...item, label: event.target.value } : item) })} /></label>
                <button type="button" title="Remove section" aria-label={`Remove section ${index + 1}`} className="mt-4 p-3 text-gray-500" onClick={() => editMeasurement({ sections: measurement.sections.filter((_, i) => i !== index) })}><Trash2 className="h-4 w-4" /></button></div>
              <div className="grid grid-cols-2 gap-3"><NumberField label={`Section ${index + 1} length (${measurement.unit})`} value={section.length} min={0.001} onChange={(length) => editMeasurement({ sections: measurement.sections.map((item, i) => i === index ? { ...item, length } : item) })} /><NumberField label={`Section ${index + 1} ${surface === 'walls' ? 'tiled height' : 'width'} (${measurement.unit})`} value={section.width} min={0.001} onChange={(width) => editMeasurement({ sections: measurement.sections.map((item, i) => i === index ? { ...item, width } : item) })} /></div>
            </div>)}
            <button type="button" disabled={measurement.sections.length >= 20} onClick={() => editMeasurement({ sections: [...measurement.sections, { label: `Section ${measurement.sections.length + 1}`, length: 0, width: 0 }] })} className="inline-flex min-h-11 items-center gap-1 text-emerald-700 dark:text-emerald-300"><Plus className="h-4 w-4" />Add section</button>
          </>}
          <NumberField label="Openings or untiled area to deduct (m²)" value={measurement.deductionsM2} min={0} onChange={(deductionsM2) => editMeasurement({ deductionsM2 })} />
          {requirement.unit === 'm²' && requirement.quantity > 0 && <div className="border-l-4 border-sky-500 bg-sky-50 p-3 text-sm text-sky-900"><p>Quote: {area(requirement.quantity)}. With a provisional 10% allowance: {area(requirement.quantity * 1.1)}.</p>{choice.widthMm > 0 && choice.lengthMm > 0 && <p className="mt-1 font-medium">At {choice.widthMm} × {choice.lengthMm} mm: {Math.ceil(requirement.quantity * 1.1 / (choice.widthMm * choice.lengthMm / 1000000))} tiles minimum, before box rounding.</p>}<button type="button" onClick={() => editMeasurement({ method: 'area', areaM2: requirement.quantity, deductionsM2: 0, wasteIncluded: 'excluded', wastePercent: 10, source: { kind: 'quote', label: 'Quote area with provisional 10% allowance' } })} className="mt-1 min-h-11 font-medium underline">Use quote area + 10% estimate</button><p className="text-xs">Allowance is an estimate, not fitter-approved.</p></div>}
          <label className="block text-xs">Does this area already include waste?<select className={field} value={measurement.wasteIncluded} onChange={(event) => editMeasurement({ wasteIncluded: event.target.value as TileMeasurement['wasteIncluded'] })}><option value="unknown">Not confirmed</option><option value="excluded">No — add an allowance</option><option value="included">Yes — do not add it again</option></select></label>
          {measurement.wasteIncluded === 'excluded' && <NumberField label="Waste allowance (%)" value={measurement.wastePercent} min={0} max={50} onChange={(wastePercent) => editMeasurement({ wastePercent })} />}
          {netArea !== undefined && <p className="text-sm font-medium">Area after deductions: {area(netArea)}</p>}
          <label className="flex min-h-11 items-start gap-2 py-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 rounded" /><span>I have checked these measurements and the waste allowance.</span></label>
          <button type="button" onClick={() => persist(false)} disabled={!confirmed || netArea === undefined || measurement.wasteIncluded === 'unknown'} className="min-h-11 rounded-lg border border-emerald-700 px-4 text-emerald-700 disabled:opacity-40 dark:text-emerald-300">Save measurements</button>
        </fieldset>
        <details className="text-xs text-gray-500"><summary className="min-h-8 cursor-pointer">Measurement source</summary><p className="break-words">{measurement.source.label}</p><p className="whitespace-pre-wrap break-words">{measurement.source.text}</p>{measurementPhoto && <img src={measurementPhoto} alt="Original measurement document" className="mt-2 max-h-80 max-w-full object-contain" />}</details>
        {plan && <><button type="button" onClick={() => setShowHistory(!showHistory)} aria-expanded={showHistory} className="inline-flex min-h-11 items-center gap-1 text-xs text-gray-600 dark:text-slate-300"><History className="h-4 w-4" />Original & previous measurements</button>{showHistory && <ol className="space-y-2 text-xs">{plan.history.map((entry, index) => <li key={index} className="border-l-2 border-gray-200 pl-2"><span>{entry.source.label} · {entry.confirmedAt ? new Date(entry.confirmedAt).toLocaleDateString('en-GB') : 'Original, unconfirmed'}</span><p>{entry.method === 'area' ? area(entry.areaM2) : entry.sections.map((section) => `${section.label}: ${section.length} × ${section.width} ${entry.unit}`).join('; ')}</p>{tileSourceImage(sourcing, entry.source.imageId, entry.source.imageDataUrl) && <img alt={`Measurement source ${index + 1}`} src={tileSourceImage(sourcing, entry.source.imageId, entry.source.imageDataUrl)} className="mt-1 max-h-64 max-w-full object-contain" />}</li>)}</ol>}</>}
      </div>
      <div className="min-w-0 space-y-4">
        <h4 className="font-semibold">2. Your tile choice</h4>
        {tilePhoto && <img src={tilePhoto} alt="Selected tile label" className="max-h-64 max-w-full object-contain" />}
        {!isReadOnly && <DocumentReader kind="tile" roomId={requirement.roomId} surface={surface} onResult={(draft, source) => {
          const read = draft as TileRead;
          editChoice({ name: read.name ?? '', supplier: read.supplier ?? '', widthMm: read.widthMm ?? 0, lengthMm: read.lengthMm ?? 0, coveragePerBoxM2: read.coveragePerBoxM2 ?? undefined, tilesPerBox: read.tilesPerBox ?? undefined, price: read.price ?? NaN, priceBasis: read.priceBasis ?? 'box', sourceImageDataUrl: source.imageDataUrl });
        }} />}
        <fieldset disabled={isReadOnly} className="min-w-0 space-y-3">
          {sourcing.products.some((product) => product.category === 'Tiles') && <label className="block text-xs">Existing tile option<select className={field} value="" onChange={(event) => { const product = sourcing.products.find((item) => item.id === event.target.value); if (product) { setChoice(candidateChoice(product, sourcing)); setChoiceConfirmed(false); setMessage(''); } }}><option value="">Choose an option, or enter your own</option>{sourcing.products.filter((product) => product.category === 'Tiles').map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}</select></label>}
          <label className="block text-xs">Tile name or style<input className={field} value={choice.name} maxLength={200} onChange={(event) => editChoice({ name: event.target.value })} /></label>
          <label className="block text-xs">Product link (optional)<input type="url" className={field} value={choice.url} placeholder="https://" maxLength={1500} onChange={(event) => editChoice({ url: event.target.value })} /></label>
          <label className="block text-xs">Supplier (optional)<input className={field} value={choice.supplier} maxLength={100} onChange={(event) => editChoice({ supplier: event.target.value })} /></label>
          <div className="grid grid-cols-2 gap-3"><NumberField label="Tile width (mm)" min={1} max={3000} value={choice.widthMm} onChange={(widthMm) => editChoice({ widthMm })} /><NumberField label="Tile length (mm)" min={1} max={3000} value={choice.lengthMm} onChange={(lengthMm) => editChoice({ lengthMm })} /></div>
          <div className="grid grid-cols-2 gap-3"><NumberField label="Box coverage (m²)" min={0.001} value={choice.coveragePerBoxM2} optional onChange={(coveragePerBoxM2) => editChoice({ coveragePerBoxM2: Number.isNaN(coveragePerBoxM2) ? undefined : coveragePerBoxM2 })} /><NumberField label="Tiles per box" min={1} step="1" value={choice.tilesPerBox} optional onChange={(tilesPerBox) => editChoice({ tilesPerBox: Number.isNaN(tilesPerBox) ? undefined : tilesPerBox })} /></div>
          <div className="grid grid-cols-2 gap-3"><NumberField label="Tile price (£)" min={0} step="0.01" value={choice.price} onChange={(price) => editChoice({ price })} /><label className="block text-xs">Price is per<select className={field} value={choice.priceBasis} onChange={(event) => editChoice({ priceBasis: event.target.value as TileChoice['priceBasis'] })}><option value="box">Box</option><option value="m2">m²</option><option value="tile">Tile</option></select></label></div>
          <label className="flex min-h-11 items-start gap-2 py-2"><input type="checkbox" checked={choiceConfirmed} onChange={(event) => setChoiceConfirmed(event.target.checked)} className="mt-0.5 rounded" /><span>I have checked the tile size, pack coverage and price basis.</span></label>
        </fieldset>
        <section aria-label="Tile calculation" aria-live="polite" className="border-y border-gray-200 py-4 dark:border-slate-700">
          <h4 className="font-semibold">3. Quantity & cost</h4>
          {result ? <dl className="mt-3 space-y-2">
            <ResultRow label="Area to cover" value={area(result.netAreaM2)} />
            <ResultRow label="Including allowance" value={area(result.orderAreaM2)} />
            <ResultRow label="Minimum tiles" value={String(result.tilesNeeded)} />
            {result.boxesNeeded !== undefined && <ResultRow label="Whole boxes" value={String(result.boxesNeeded)} />}
            <ResultRow label="Purchased coverage" value={area(result.purchasedCoverageM2)} />
            <ResultRow label="Estimated tile cost" value={money.format(result.totalPence / 100)} />
          </dl> : <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{error}</p>}
          <p className="mt-3 text-xs text-gray-500">Tiles only; delivery, adhesive, grout and installation are not included. Supplier pack coverage takes priority over nominal tile size.</p>
        </section>
        {!isReadOnly && <button type="button" onClick={() => persist(true)} disabled={!confirmed || !choiceConfirmed || !result} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3 font-medium text-white disabled:opacity-40"><Check className="h-4 w-4" />Choose for this bathroom</button>}
        {message && <p role="status" className="break-words text-sm text-emerald-700 dark:text-emerald-300">{message}</p>}
        <p className="text-xs text-gray-500">This selection is tracked separately from the contractor quote. It is not added on top of the quote total, and no order is placed.</p>
      </div>
    </div>
  </section>;
}

function NumberField({ label, value, min, max, step = 'any', optional = false, onChange }: { label: string; value?: number; min: number; max?: number; step?: string; optional?: boolean; onChange: (value: number) => void }) {
  return <label className="block min-w-0 text-xs">{label}<input type="number" inputMode="decimal" className={field} required={!optional} min={min} max={max} step={step} value={value === undefined || !Number.isFinite(value) ? '' : value} onChange={(event) => onChange(event.target.value === '' ? NaN : Number(event.target.value))} /></label>;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3"><dt className="min-w-0 text-gray-600 dark:text-slate-300">{label}</dt><dd className="shrink-0 font-semibold">{value}</dd></div>;
}

function DocumentReader({ kind, roomId, surface, onResult }: { kind: 'measurement' | 'tile'; roomId: SourcingRequirement['roomId']; surface: string; onResult: (draft: MeasurementRead | TileRead, source: TileMeasurement['source']) => void }) {
  const [photo, setPhoto] = useState('');
  const [fileName, setFileName] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [evidence, setEvidence] = useState('');
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  const heading = kind === 'measurement' ? 'Quote / measurement photo' : 'Tile label photo';
  async function selectPhoto(file?: File) {
    setError(''); setWarnings([]); setEvidence(''); setConsent(false); setPhoto('');
    if (!file) return;
    setBusy(true);
    try { const prepared = await resizePhoto(file); if (alive.current) { setPhoto(prepared); setFileName(file.name.slice(0, 150)); } }
    catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Could not open this photo.'); }
    finally { if (alive.current) setBusy(false); }
  }
  async function read() {
    if (!consent || busy || (!photo && !text.trim())) return;
    setBusy(true); setError(''); setWarnings([]);
    try {
      const form = new FormData();
      form.set('kind', kind); form.set('roomId', roomId); form.set('surface', surface); form.set('text', text); form.set('consent', 'yes');
      if (photo) { const blob = await (await fetch(photo)).blob(); form.set('image', blob, 'document.jpg'); }
      const response = await fetch('/api/property/tile-document', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not read the document.');
      if (!alive.current) return;
      const draft = data.draft as MeasurementRead | TileRead;
      setWarnings(draft.warnings); setEvidence(draft.evidence);
      onResult(draft, { kind: photo ? 'photo' : 'text', label: photo ? fileName : 'Pasted measurements', text: text || draft.evidence, ...(photo ? { imageDataUrl: photo } : {}) });
    } catch (reason) { if (alive.current) setError(reason instanceof Error ? reason.message : 'Could not read the document.'); }
    finally { if (alive.current) setBusy(false); }
  }
  return <details data-testid={`${kind}-document-reader`} className="min-w-0 border-b border-gray-200 pb-3 dark:border-slate-700">
    <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300"><Camera className="h-4 w-4" />{heading}</summary>
    <div className="min-w-0 space-y-3 pt-2">
      <label className="block text-xs">{heading}<input disabled={busy} type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full min-w-0 text-xs file:mr-2 file:rounded-lg file:border file:border-gray-300 file:bg-white file:p-2" onChange={(event) => { void selectPhoto(event.target.files?.[0]); event.target.value = ''; }} /></label>
      {photo && <img src={photo} alt={heading} className="max-h-64 max-w-full object-contain" />}
      <label className="block text-xs"><ClipboardPaste className="mr-1 inline h-3.5 w-3.5" />{kind === 'measurement' ? 'Or paste measurement / quote text' : 'Or paste tile label text'}<textarea maxLength={6000} rows={3} disabled={busy} className={field} value={text} onChange={(event) => { setText(event.target.value); setConsent(false); }} /></label>
      <label className="flex items-start gap-2 text-xs"><input type="checkbox" checked={consent} disabled={busy} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 rounded" /><span>Allow the configured AI provider to read this photo/text. Review the extracted figures before saving.</span></label>
      <button type="button" disabled={!consent || busy || (!photo && !text.trim())} onClick={() => void read()} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-emerald-700 px-3 text-emerald-700 disabled:opacity-40 dark:text-emerald-300">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}Read {kind === 'measurement' ? 'measurements' : 'tile label'}</button>
      {evidence && <p className="whitespace-pre-wrap break-words text-xs text-gray-600 dark:text-slate-300">Extracted, not saved: {evidence}</p>}
      {warnings.map((warning, index) => <p key={index} className="break-words text-xs text-amber-700 dark:text-amber-300">{warning}</p>)}
      {error && <p role="alert" className="text-xs text-red-700 dark:text-red-300">{error}</p>}
    </div>
  </details>;
}
