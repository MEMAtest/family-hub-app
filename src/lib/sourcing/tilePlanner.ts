import { z } from 'zod';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement, TileChoice, TileMeasurement, TilePlan } from '@/types/sourcing.types';

const dimension = z.number().finite().positive().max(100000);
const image = z.string().max(600000).regex(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/);
export const tileMeasurementSchema = z.object({
  method: z.enum(['area', 'dimensions']), unit: z.enum(['m', 'cm', 'mm']),
  areaM2: z.number().finite().min(0).max(10000),
  sections: z.array(z.object({ label: z.string().max(80), length: dimension, width: dimension })).max(20),
  deductionsM2: z.number().finite().min(0).max(10000),
  wasteIncluded: z.enum(['unknown', 'included', 'excluded']),
  wastePercent: z.number().finite().min(0).max(50),
  source: z.object({ kind: z.enum(['quote', 'manual', 'photo', 'text']), label: z.string().max(150), text: z.string().max(6000).optional(), imageDataUrl: image.optional(), imageId: z.string().max(100).optional() }),
  confirmedAt: z.string().datetime().optional(),
});

const safeUrl = z.string().max(1500).refine((value) => {
  if (!value) return true;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
}, 'Use an https product link, or leave it blank.');

export const tileChoiceSchema = z.object({
  name: z.string().trim().min(1).max(200), supplier: z.string().max(100), url: safeUrl,
  widthMm: dimension.max(3000), lengthMm: dimension.max(3000),
  coveragePerBoxM2: z.number().finite().positive().max(100).optional(),
  tilesPerBox: z.number().int().positive().max(1000).optional(),
  price: z.number().finite().min(0).max(100000), priceBasis: z.enum(['box', 'm2', 'tile']), sourceImageDataUrl: image.optional(), sourceImageId: z.string().max(100).optional(), imageUrl: z.string().url().refine((value) => new URL(value).protocol === 'https:').optional(),
});

export type TileCalculation = {
  netAreaM2: number; orderAreaM2: number; tileAreaM2: number; tilesNeeded: number;
  boxesNeeded?: number; purchasedCoverageM2: number; orderQuantity: number; totalPence: number;
};

const roundArea = (value: number) => Math.round(value * 1e6) / 1e6;
const ceil = (value: number) => Math.ceil(value - 1e-9);

export function measurementArea(raw: TileMeasurement): number {
  const measurement = tileMeasurementSchema.parse(raw);
  const divisor = { m: 1, cm: 100, mm: 1000 }[measurement.unit];
  const gross = measurement.method === 'area' ? measurement.areaM2
    : measurement.sections.reduce((sum, section) => sum + section.length * section.width / divisor ** 2, 0);
  const net = roundArea(gross - measurement.deductionsM2);
  if (!Number.isFinite(net) || net <= 0 || net > 10000) throw new Error('Enter a positive area; deductions must be smaller than the tiled area.');
  return net;
}

export function calculateTiles(rawMeasurement: TileMeasurement, rawChoice: TileChoice): TileCalculation {
  const measurement = tileMeasurementSchema.parse(rawMeasurement);
  const choice = tileChoiceSchema.parse(rawChoice);
  if (measurement.wasteIncluded === 'unknown') throw new Error('Confirm whether the area already includes waste.');
  const netAreaM2 = measurementArea(measurement);
  const orderAreaM2 = roundArea(netAreaM2 * (measurement.wasteIncluded === 'excluded' ? 1 + measurement.wastePercent / 100 : 1));
  const tileAreaM2 = choice.widthMm * choice.lengthMm / 1e6;
  const tilesNeeded = ceil(orderAreaM2 / tileAreaM2);
  const derivedBoxCoverage = choice.tilesPerBox ? tileAreaM2 * choice.tilesPerBox : undefined;
  if (choice.coveragePerBoxM2 && derivedBoxCoverage && Math.abs(choice.coveragePerBoxM2 - derivedBoxCoverage) > Math.max(0.005, derivedBoxCoverage * 0.02)) {
    throw new Error('Box coverage and tiles per box disagree. Check the supplier label.');
  }
  const boxCoverage = choice.coveragePerBoxM2 ?? derivedBoxCoverage;
  if (choice.priceBasis === 'box' && !boxCoverage) throw new Error('Enter coverage per box or tiles per box.');
  if (choice.priceBasis === 'tile' && boxCoverage && !choice.tilesPerBox) throw new Error('Enter tiles per box to price whole boxes by tile.');
  const boxesNeeded = boxCoverage ? ceil(orderAreaM2 / boxCoverage) : undefined;
  const purchasedCoverageM2 = roundArea(boxCoverage && boxesNeeded ? boxCoverage * boxesNeeded : tileAreaM2 * tilesNeeded);
  const orderQuantity = choice.priceBasis === 'box' ? boxesNeeded! : choice.priceBasis === 'tile'
    ? choice.tilesPerBox && boxesNeeded ? boxesNeeded * choice.tilesPerBox : tilesNeeded : purchasedCoverageM2;
  const totalPence = Math.round(Math.round(choice.price * 100) * orderQuantity);
  return { netAreaM2, orderAreaM2, tileAreaM2, tilesNeeded, boxesNeeded, purchasedCoverageM2, orderQuantity, totalPence };
}

export const tilePlanProductId = (requirementId: string) => `tile-plan-${requirementId}`;
export const tileSourceImage = (sourcing: ProjectSourcing, id?: string, draft?: string) => draft ?? sourcing.tileDocuments?.find((document) => document.id === id)?.imageDataUrl;

export function initialTileMeasurement(requirement: SourcingRequirement): TileMeasurement {
  return requirement.tilePlan?.measurement ?? {
    method: 'area', unit: 'm', areaM2: requirement.unit === 'm²' ? requirement.quantity : 0, sections: [], deductionsM2: 0,
    wasteIncluded: 'unknown', wastePercent: 10,
    source: { kind: 'quote', label: 'Original quote area', text: `${requirement.name}: ${requirement.quantity} ${requirement.unit ?? ''}` },
  };
}

export function saveTilePlan(sourcing: ProjectSourcing, requirementId: string, rawMeasurement: TileMeasurement, rawChoice?: TileChoice): ProjectSourcing {
  const requirement = sourcing.requirements.find((item) => item.id === requirementId);
  if (!requirement || requirement.category !== 'Tiles') throw new Error('Choose a tile surface first.');
  if (sourcing.basket.some((item) => item.requirementId === requirementId && item.status === 'ordered')) throw new Error('This tile choice is marked ordered. Resolve the order before changing the tile plan.');
  const now = new Date().toISOString();
  const measurement = { ...tileMeasurementSchema.parse(rawMeasurement), confirmedAt: now };
  measurementArea(measurement);
  if (measurement.wasteIncluded === 'unknown') throw new Error('Confirm whether the area already includes waste.');
  const choice = rawChoice ? tileChoiceSchema.parse(rawChoice) : requirement.tilePlan?.choice ? { ...requirement.tilePlan.choice } : undefined;
  const calculation = choice ? calculateTiles(measurement, choice) : undefined;
  const previous = requirement.tilePlan;
  const history = previous ? [...previous.history, previous.measurement] : [initialTileMeasurement(requirement)];
  const plan: TilePlan = { measurement, choice, history: history.length > 10 ? [history[0], ...history.slice(-9)] : history, updatedAt: now };
  const documents = [...(sourcing.tileDocuments ?? [])];
  const keepImage = (imageDataUrl: string, label: string) => {
    let document = documents.find((entry) => entry.imageDataUrl === imageDataUrl);
    if (!document) { document = { id: `tile-photo-${now}-${documents.length}`, label, imageDataUrl }; documents.push(document); }
    return document.id;
  };
  if (measurement.source.imageDataUrl) {
    measurement.source.imageId = keepImage(measurement.source.imageDataUrl, measurement.source.label);
    delete measurement.source.imageDataUrl;
  }
  if (choice?.sourceImageDataUrl) {
    choice.sourceImageId = keepImage(choice.sourceImageDataUrl, choice.name);
    delete choice.sourceImageDataUrl;
  }
  const next: ProjectSourcing = { ...sourcing, tileDocuments: documents, requirements: sourcing.requirements.map((item) => item.id === requirementId ? { ...item, tilePlan: plan } : item) };
  if (!choice || !calculation) return next;
  const id = tilePlanProductId(requirementId);
  const product: SourcedProduct = {
    id, name: choice.name, category: 'Tiles', supplier: choice.supplier || 'Your tile choice', requirementIds: [requirementId], url: choice.url,
    imageUrl: choice.imageUrl || '', price: choice.price, priceUnit: { box: 'per box', m2: 'per m²', tile: 'per tile' }[choice.priceBasis],
    size: `${choice.widthMm} x ${choice.lengthMm}mm`, stock: 'UNKNOWN', stockEvidence: 'Confirm price and stock with supplier',
    dimensions: { widthMm: choice.widthMm, lengthMm: choice.lengthMm }, components: [], lastChecked: now,
  };
  next.products = [...sourcing.products.filter((item) => item.id !== id), product];
  // One active tile choice per surface; previous choices remain in the catalogue, not double-counted.
  next.basket = [...sourcing.basket.filter((item) => item.requirementId !== requirementId), {
    id: `basket-${id}`, requirementId, productId: id, quantity: calculation.orderQuantity, status: 'review',
  }];
  return next;
}

export function plannedTileCalculation(sourcing: ProjectSourcing, item: ProjectSourcing['basket'][number]): TileCalculation | undefined {
  const plan = sourcing.requirements.find((requirement) => requirement.id === item.requirementId)?.tilePlan;
  if (!plan?.choice || item.productId !== tilePlanProductId(item.requirementId)) return undefined;
  try { return calculateTiles(plan.measurement, plan.choice); } catch { return undefined; }
}
