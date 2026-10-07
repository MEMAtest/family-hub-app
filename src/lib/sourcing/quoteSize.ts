import type { SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { isDimensionedFixture } from './selection';

export type QuoteSizeAssessment = { status: 'within' | 'different' | 'unknown' | 'not_applicable'; label: string };
export function quoteSizeAssessment(requirement: SourcingRequirement | undefined, product: SourcedProduct): QuoteSizeAssessment {
  if (!requirement) return { status: 'not_applicable', label: 'No quote dimensions to compare' };
  if (!isDimensionedFixture(product, requirement)) return { status: 'not_applicable', label: 'Supporting part - compatibility not confirmed' };
  const quoted = { ...requirement.constraints };
  for (const match of (requirement.size ?? '').matchAll(/(\d+(?:\.\d+)?)\s*mm\s*(wide|width|high|height|long|length|deep|depth|thick|thickness)/gi)) {
    const dimension = /wid/i.test(match[2]) ? 'widthMm' : /high|height/i.test(match[2]) ? 'heightMm' : /long|length/i.test(match[2]) ? 'lengthMm' : /deep|depth/i.test(match[2]) ? 'depthMm' : 'thicknessMm';
    if (quoted[dimension] === undefined && quoted[`max${dimension[0].toUpperCase()}${dimension.slice(1)}`] === undefined && quoted[`min${dimension[0].toUpperCase()}${dimension.slice(1)}`] === undefined) quoted[dimension] = Number(match[1]);
  }
  const constraints = Object.entries(quoted).filter(([key, value]) => /^(max|min)?(width|length|depth|height|projection|thickness)Mm$/i.test(key) && typeof value === 'number');
  if (!constraints.length) return { status: 'not_applicable', label: 'No quote dimensions to compare' };
  let unknown = false;
  for (const [key, expected] of constraints) {
    const dimension = key.replace(/^(max|min)/, '');
    const normal = dimension[0].toLowerCase() + dimension.slice(1);
    const spec = Object.entries(product.specs ?? {}).find(([name]) => name.toLowerCase() === normal.replace(/Mm$/, '').toLowerCase())?.[1];
    const raw = product.dimensions[normal] ?? spec;
    const actual = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\s*\d+(\.\d+)?\s*mm\s*$/i.test(raw) ? parseFloat(raw) : undefined;
    if (actual === undefined || !Number.isFinite(actual) || actual <= 0) { unknown = true; continue; }
    const target = expected as number;
    const tolerance = typeof requirement.constraints.tileToleranceMm === 'number' ? requirement.constraints.tileToleranceMm : 0;
    if (key.startsWith('max') ? actual > target : key.startsWith('min') ? actual < target : Math.abs(actual - target) > tolerance) return { status: 'different', label: 'Different from quote - Check measurements' };
  }
  return unknown ? { status: 'unknown', label: 'Supplier dimensions missing - quote comparison incomplete' } : { status: 'within', label: 'Within checked quote sizes - Confirm room measurements' };
}
