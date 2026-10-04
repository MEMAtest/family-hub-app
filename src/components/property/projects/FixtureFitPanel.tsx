'use client';
import { useState } from 'react';
import { Check, Ruler } from 'lucide-react';
import type { FixtureSpace, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { fitAxes, fixtureFit, fixtureSpaceSchema, productDimensionsSchema } from '@/lib/sourcing/fixtureFit';

type Props = { requirement: SourcingRequirement; product?: SourcedProduct; disabled: boolean; onSaveSpace: (space: FixtureSpace) => void; onSaveDimensions?: (dimensions: Record<string, number>) => void };
const field = 'mt-1 min-h-11 w-full min-w-0 rounded-lg border-gray-300 text-sm dark:bg-slate-800';
export default function FixtureFitPanel({ requirement, product, disabled, onSaveSpace, onSaveDimensions }: Props) {
  const [editing, setEditing] = useState(false); const [error, setError] = useState(''); const [saved, setSaved] = useState('');
  const [unit, setUnit] = useState<'mm' | 'cm' | 'm'>('mm');
  const [values, setValues] = useState<Record<string, string>>(Object.fromEntries(fitAxes.map((axis) => [axis, String(requirement.fitSpace?.[axis] ?? '')])));
  const [productValues, setProductValues] = useState<Record<string, string>>(Object.fromEntries(fitAxes.map((axis) => [axis, typeof product?.dimensions[axis] === 'number' ? String(product.dimensions[axis]) : ''])));
  const [clearance, setClearance] = useState(String(requirement.fitSpace?.clearanceMm ?? 0));
  const [source, setSource] = useState(requirement.fitSpace?.source ?? ''); const [confirmed, setConfirmed] = useState(false);
  const fit = product ? fixtureFit(requirement, product) : null;
  const dimensions = (input: Record<string, string>, factor: number) => Object.fromEntries(fitAxes.filter((axis) => input[axis].trim()).map((axis) => [axis, Number(input[axis]) * factor]));
  return <section aria-label="Measurement fit check" className="border-y border-gray-200 py-3 dark:border-slate-700">
    <h4 className="flex items-center gap-2 text-sm font-semibold"><Ruler className="h-4 w-4" />{fit?.label ?? 'Space for this item'}</h4>
    <p className={`mt-1 break-words text-xs ${fit?.status === 'no_fit' ? 'text-red-700' : 'text-gray-500'}`}>{fit?.detail ?? (requirement.fitSpace ? fitAxes.filter((axis) => requirement.fitSpace?.[axis]).map((axis) => `${axis.replace('Mm', '')}: ${requirement.fitSpace?.[axis]} mm`).join(' · ') : 'Measurements not confirmed')}</p>
    {requirement.fitSpace && <p className="mt-1 text-xs text-gray-500">Source: {requirement.fitSpace.source} · {new Date(requirement.fitSpace.confirmedAt).toLocaleDateString('en-GB')}</p>}
    {!disabled && <button type="button" className="min-h-11 text-sm font-medium text-emerald-700" onClick={() => { setEditing(!editing); setConfirmed(false); setSaved(''); }}>{editing ? 'Close measurements' : 'Edit fit measurements'}</button>}
    {editing && !disabled && <div className="space-y-3">
      <form onSubmit={(event) => { event.preventDefault(); setError(''); try { if (!confirmed) throw new Error('Confirm these are measurements of the space for this item.');
        const factor = unit === 'm' ? 1000 : unit === 'cm' ? 10 : 1;
        const next = fixtureSpaceSchema.parse({ ...dimensions(values, factor), clearanceMm: Number(clearance) * factor, source, confirmedAt: new Date().toISOString() });
        onSaveSpace(next); setSaved('Space measurements saved.'); setConfirmed(false);
      } catch (reason) { setError(reason instanceof Error && !('issues' in reason) ? reason.message : 'Check the dimensions and measurement source.'); } }} className="space-y-3">
        <label className="block text-xs">Measurement unit<select aria-label="Measurement unit" className={field} value={unit} onChange={(event) => { const next = event.target.value as typeof unit; const oldFactor = unit === 'm' ? 1000 : unit === 'cm' ? 10 : 1; const factor = next === 'm' ? 1000 : next === 'cm' ? 10 : 1;
          setValues(Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value ? String(Number(value) * oldFactor / factor) : '']))); setClearance(String(Number(clearance) * oldFactor / factor)); setUnit(next); setConfirmed(false); }}><option>mm</option><option>cm</option><option>m</option></select></label>
        <div className="grid grid-cols-2 gap-3">{fitAxes.map((axis) => <label key={axis} className="block text-xs capitalize">Available {axis.replace('Mm', '')} ({unit})<input aria-label={`Available ${axis.replace('Mm', '')}`} type="number" min="0.001" step="any" className={field} value={values[axis]} onChange={(event) => { setValues({ ...values, [axis]: event.target.value }); setConfirmed(false); }} /></label>)}</div>
        <label className="block text-xs">Required free space per checked dimension ({unit})<input aria-label="Required free space" type="number" min="0" step="any" required className={field} value={clearance} onChange={(event) => { setClearance(event.target.value); setConfirmed(false); }} /></label>
        <label className="block text-xs">Measurement source<input aria-label="Measurement source" required maxLength={300} className={field} value={source} onChange={(event) => { setSource(event.target.value); setConfirmed(false); }} /></label>
        <label className="flex min-h-11 items-start gap-2 text-xs"><input aria-label="Confirm measured item space" className="mt-1 rounded" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />These are the measured limits for this item, not the whole room or quoted tile area.</label>
        <button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-3 text-sm text-white"><Check className="h-4 w-4" />Save measured space</button>
      </form>
      {product && onSaveDimensions && <form className="space-y-3 border-t border-gray-200 pt-3" onSubmit={(event) => { event.preventDefault(); setError(''); try { const next = productDimensionsSchema.parse(dimensions(productValues, 1)); onSaveDimensions(Object.fromEntries(Object.entries(next).filter((entry): entry is [string, number] => entry[1] !== undefined))); setSaved('Product dimensions saved.'); } catch { setError('Use positive product dimensions in mm.'); } }}>
        <h5 className="text-sm font-medium">Product dimensions</h5>
        <div className="grid grid-cols-2 gap-3">{fitAxes.map((axis) => <label key={axis} className="block text-xs capitalize">Product {axis.replace('Mm', '')} (mm)<input aria-label={`Product ${axis.replace('Mm', '')}`} type="number" min="0.001" step="any" className={field} value={productValues[axis]} onChange={(event) => setProductValues({ ...productValues, [axis]: event.target.value })} /></label>)}</div>
        <button className="min-h-11 rounded-lg border border-emerald-700 px-3 text-sm text-emerald-700">Save product dimensions</button>
      </form>}
    </div>}
    {error && <p role="alert" className="mt-2 text-xs text-red-700">{error}</p>}{saved && <p role="status" className="mt-2 text-xs text-emerald-700">{saved}</p>}
  </section>;
}
