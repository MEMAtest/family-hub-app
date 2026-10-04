import { z } from 'zod';
import type { FixtureSpace, ProjectSourcing, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';

export const fitAxes = ['widthMm', 'lengthMm', 'depthMm', 'heightMm'] as const;
const dimension = z.number().finite().positive().max(20000).optional();
export const productDimensionsSchema = z.object({ widthMm: dimension, lengthMm: dimension, depthMm: dimension, heightMm: dimension });
export const fixtureSpaceSchema = productDimensionsSchema.extend({ clearanceMm: z.number().finite().min(0).max(5000), source: z.string().trim().min(1).max(300), confirmedAt: z.string().datetime() })
  .refine((value) => fitAxes.some((axis) => value[axis] !== undefined), 'Enter at least one measured dimension.');

export function fixtureFit(requirement: SourcingRequirement, product: SourcedProduct) {
  const primary = requirement.requiredComponents[0];
  if (primary && !product.components.includes(primary)) return { status: 'unknown' as const, label: 'Supporting part - needs checking', detail: 'Check this part against the chosen fixture, not the room-space limits.' };
  const parsed = fixtureSpaceSchema.safeParse(requirement.fitSpace);
  if (!parsed.success) return { status: 'unknown' as const, label: 'Needs checking', detail: 'No confirmed space measurements for this item.' };
  const space = parsed.data;
  const checked: string[] = []; const unknown: string[] = []; const failed: string[] = [];
  for (const axis of fitAxes) {
    if (space[axis] === undefined) continue;
    const label = axis.replace('Mm', '');
    const spec = Object.entries(product.specs ?? {}).find(([key]) => key.toLowerCase() === label)?.[1];
    const raw = product.dimensions[axis] ?? spec;
    const actual = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\d+(\.\d+)?\s*mm$/i.test(raw.trim()) ? parseFloat(raw) : undefined;
    if (actual === undefined || !Number.isFinite(actual) || actual <= 0) { unknown.push(label); continue; }
    const line = `${label}: ${actual} + ${space.clearanceMm} clearance / ${space[axis]} mm available`;
    if (actual + space.clearanceMm > space[axis]!) failed.push(line); else checked.push(line);
  }
  if (failed.length) return { status: 'no_fit' as const, label: 'Does not fit measured space', detail: failed.join(' · ') };
  if (unknown.length || checked.length < 2) return { status: 'unknown' as const, label: 'Needs checking', detail: [...checked, unknown.length ? `Missing product ${unknown.join(', ')}` : 'At least two labelled dimensions needed'].join(' · ') };
  return { status: 'fits' as const, label: 'Within measured limits', detail: `${checked.join(' · ')}. Only these dimensions checked; fitter must confirm layout, handedness and connections.` };
}

export function saveFixtureSpace(sourcing: ProjectSourcing, requirementId: string, raw: FixtureSpace): ProjectSourcing {
  const fitSpace = fixtureSpaceSchema.parse(raw);
  if (!sourcing.requirements.some((item) => item.id === requirementId && item.category !== 'Tiles')) throw new Error('Choose a fixture item.');
  return { ...sourcing, requirements: sourcing.requirements.map((item) => item.id === requirementId ? { ...item, fitSpace } : item),
    basket: sourcing.basket.map((item) => item.requirementId === requirementId && item.status !== 'ordered' ? { ...item, status: 'ask_fitter' } : item) };
}
