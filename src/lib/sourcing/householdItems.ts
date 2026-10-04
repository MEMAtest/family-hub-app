import { z } from 'zod';
import type { ProjectSourcing, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { fixtureFit } from './fixtureFit';

export const sourcingCategories = ['Tiles', 'Sanitaryware', 'Furniture', 'Showers', 'Heating', 'Fittings', 'Lighting', 'Ventilation', 'Accessories', 'Other'] as const;
const room = z.enum(['main-bathroom', 'shower-room']);
const https = z.string().max(1500).refine((value) => { if (!value) return true; try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } }, 'Use an HTTPS link or leave it blank.');
export const householdItemSchema = z.object({
  roomId: room, name: z.string().trim().min(1).max(200), category: z.enum(sourcingCategories), quantity: z.number().finite().positive().max(10000),
  size: z.string().max(300), specification: z.string().max(1000), unit: z.string().max(30), relatedToId: z.string().max(100).optional(),
});
export const householdProductSchema = z.object({
  requirementId: z.string().min(1).max(100), name: z.string().trim().min(1).max(200), supplier: z.string().max(100), url: https, imageUrl: https,
  price: z.number().finite().min(0).max(100000), priceUnit: z.enum(['each', 'per box', 'per m²', 'per tile']), size: z.string().max(300),
  components: z.array(z.string().max(80)).max(30), notes: z.string().max(1000),
  sku: z.string().max(100).optional(), gallery: z.array(https).max(8).optional(),
});
export function addHouseholdItem(sourcing: ProjectSourcing, raw: z.input<typeof householdItemSchema>, id: string): { sourcing: ProjectSourcing; item: SourcingRequirement } {
  const input = householdItemSchema.parse(raw);
  if (!id.startsWith('req-') || sourcing.requirements.some((item) => item.id === id)) throw new Error('This item already exists.');
  if (input.relatedToId && !sourcing.requirements.some((item) => item.id === input.relatedToId && item.roomId === input.roomId)) throw new Error('Choose a related item in the same bathroom.');
  const item: SourcingRequirement = { ...input, id, source: 'household', status: 'fitter_check', constraints: {}, requiredComponents: [] };
  return { item, sourcing: { ...sourcing, requirements: [...sourcing.requirements, item] } };
}
export function addHouseholdProduct(sourcing: ProjectSourcing, raw: z.input<typeof householdProductSchema>, id: string): { sourcing: ProjectSourcing; product: SourcedProduct } {
  const input = householdProductSchema.parse(raw);
  const requirement = sourcing.requirements.find((item) => item.id === input.requirementId);
  if (!requirement) throw new Error('Choose the item this option is for.');
  if (!id.startsWith('manual-') || sourcing.products.some((item) => item.id === id)) throw new Error('This option already exists.');
  if (input.components.some((component) => !requirement.requiredComponents.includes(component))) throw new Error('Check which quoted parts this product includes.');
  const product: SourcedProduct = { id, name: input.name, supplier: input.supplier || 'Your supplier', source: 'household', category: requirement.category,
    requirementIds: [requirement.id], url: input.url, imageUrl: input.imageUrl, price: input.price, priceUnit: requirement.category === 'Tiles' && input.priceUnit === 'each' ? 'per tile' : input.priceUnit,
    size: input.size, sku: input.sku, gallery: input.gallery ? [...new Set([input.imageUrl, ...input.gallery].filter(Boolean))].slice(0, 8) : undefined, components: input.components, description: input.notes, dimensions: {}, stock: 'UNKNOWN', stockEvidence: 'Entered by you; price, stock and fit need confirmation.', lastChecked: new Date().toISOString(),
  };
  return { product, sourcing: { ...sourcing, products: [...sourcing.products, product] } };
}

export function optionConflicts(sourcing: ProjectSourcing, requirement: SourcingRequirement, product: SourcedProduct) {
  const primary = requirement.requiredComponents[0];
  if (primary && !product.components.includes(primary)) return [];
  return sourcing.basket.filter((entry) => entry.requirementId === requirement.id && entry.productId !== product.id &&
    (!primary || sourcing.products.find((candidate) => candidate.id === entry.productId)?.components.includes(primary)));
}

export function chooseSourcingOption(sourcing: ProjectSourcing, requirementId: string, productId: string, status: ProjectSourcing['basket'][number]['status']): ProjectSourcing {
  const requirement = sourcing.requirements.find((item) => item.id === requirementId);
  const product = sourcing.products.find((item) => item.id === productId && item.requirementIds?.includes(requirementId));
  if (!requirement || !product) throw new Error('Choose an option for this item.');
  if (fixtureFit(requirement, product).status === 'no_fit') throw new Error('This product exceeds the measured space. Check the product or space measurements before choosing it.');
  const conflicts = optionConflicts(sourcing, requirement, product);
  if (conflicts.some((entry) => entry.status === 'ordered')) throw new Error('An existing choice is marked ordered. Resolve that order before replacing it.');
  const replaced = new Set(conflicts.map((entry) => entry.id));
  const previous = conflicts.map((entry) => sourcing.products.find((candidate) => candidate.id === entry.productId)).filter((item): item is SourcedProduct => !!item);
  const history = { id: `choice-${requirementId}-${Date.now()}`, requirementId, at: new Date().toISOString(), selected: { id: product.id, name: product.name, price: product.price }, replaced: previous.map((item) => ({ id: item.id, name: item.name, price: item.price })) };
  return { ...sourcing, choiceHistory: [...(sourcing.choiceHistory ?? []), history].slice(-100), basket: [...sourcing.basket.filter((entry) => !replaced.has(entry.id) && !(entry.requirementId === requirementId && entry.productId === productId)),
    { id: `basket-${requirementId}-${productId}`, requirementId, productId, quantity: requirement.quantity, status }] };
}
