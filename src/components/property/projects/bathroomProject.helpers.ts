import type { ProjectSourcing, SourcedProduct, SourcingBasketItem, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';

import { evaluateSelection, isPrimaryOption } from '@/lib/sourcing/selection';
import { basketCostPence, productCostPence, selectedSpend } from '@/lib/sourcing/spend';
export { isUncountedPrice } from '@/lib/sourcing/spend';

export const bathroomRooms: { id: SourcingRoomId; label: string }[] = [
  { id: 'main-bathroom', label: 'Main Bathroom' },
  { id: 'shower-room', label: 'Shower Room' },
];

export const isBathroomProject = (project: { title: string; category: string; description?: string }) =>
  /bath|shower/i.test(`${project.category} ${project.title} ${project.description ?? ''}`);

export const roomName = (sourcing: ProjectSourcing | undefined, id: SourcingRoomId) =>
  sourcing?.rooms?.[id]?.name?.trim() || bathroomRooms.find((room) => room.id === id)!.label;

export function productLineCost(product: SourcedProduct, quantity: number) {
  return (productCostPence(product, quantity) ?? 0) / 100;
}

export function basketTotal(sourcing: ProjectSourcing, roomId?: SourcingRoomId) {
  return selectedSpend(sourcing, roomId).totalPence / 100;
}

export function basketLineCost(sourcing: ProjectSourcing, item: SourcingBasketItem) {
  return (basketCostPence(sourcing, item) ?? 0) / 100;
}

export function excludedBasketPrice(sourcing: ProjectSourcing, item: SourcingBasketItem) {
  return basketCostPence(sourcing, item) === undefined;
}

export function requirementSelection(sourcing: ProjectSourcing, requirement: SourcingRequirement) {
  return evaluateSelection(sourcing, requirement);
}

/** The quote's first component is the fixture; remaining components are supporting parts. */
export function leadingRequirementOption(candidates: SourcedProduct[], requirement: SourcingRequirement) {
  const fixtures = candidates.filter((product) => isPrimaryOption(product, requirement));
  return fixtures.find((product) => product.topPick) ?? fixtures[0];
}

export const basketStatuses: { value: SourcingBasketItem['status']; label: string }[] = [
  { value: 'review', label: 'Review' }, { value: 'ask_fitter', label: 'Ask fitter' },
  { value: 'approved', label: 'Approved' }, { value: 'ordered', label: 'Ordered' },
];

export function productSize(product: SourcedProduct) {
  if (product.size?.trim()) return product.size;
  const sizes = Object.entries(product.specs ?? {}).filter(([key]) => /^(width|length|height|depth|projection|thickness)$/i.test(key));
  if (sizes.length) return sizes.map(([key, value]) => `${key}: ${value}`).join(' · ');
  const dimensions = Object.entries(product.dimensions).filter(([key]) => /Mm$/.test(key));
  return dimensions.length ? dimensions.map(([key, value]) => `${key.replace(/Mm$/, '')}: ${value}mm`).join(' · ') : 'Size not stated';
}

export { quoteSizeAssessment } from '@/lib/sourcing/quoteSize';
import { quoteSizeAssessment } from '@/lib/sourcing/quoteSize';
export function quoteSizeCheck(requirement: SourcingRequirement | undefined, product: SourcedProduct) {
  return quoteSizeAssessment(requirement, product).label.replace(/ - /g, ' · ');
}
