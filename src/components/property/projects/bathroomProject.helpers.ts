import type { ProjectSourcing, SourcedProduct, SourcingBasketItem, SourcingRequirement, SourcingRoomId } from '@/types/sourcing.types';

export const bathroomRooms: { id: SourcingRoomId; label: string }[] = [
  { id: 'main-bathroom', label: 'Main Bathroom' },
  { id: 'shower-room', label: 'Shower Room' },
];

export const isBathroomProject = (project: { title: string; category: string; description?: string }) =>
  /bath|shower/i.test(`${project.category} ${project.title} ${project.description ?? ''}`);

export const roomName = (sourcing: ProjectSourcing | undefined, id: SourcingRoomId) =>
  sourcing?.rooms?.[id]?.name?.trim() || bathroomRooms.find((room) => room.id === id)!.label;

export const isUncountedPrice = (product: SourcedProduct) =>
  product.priceUnit === 'per box' || product.priceUnit === 'per tile';

export function productLineCost(product: SourcedProduct, quantity: number) {
  return isUncountedPrice(product) ? 0 : product.price * (Number.isFinite(quantity) && quantity > 0 ? quantity : 0);
}

export function basketTotal(sourcing: ProjectSourcing, roomId?: SourcingRoomId) {
  return sourcing.basket.reduce((total, item) => {
    const requirement = sourcing.requirements.find((candidate) => candidate.id === item.requirementId);
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return total + (product && (!roomId || requirement?.roomId === roomId) ? productLineCost(product, item.quantity) : 0);
  }, 0);
}

export function requirementSelection(sourcing: ProjectSourcing, requirement: SourcingRequirement) {
  const entries = sourcing.basket.filter((item) => item.requirementId === requirement.id);
  const selected = entries.flatMap((item) => {
    const product = sourcing.products.find((candidate) => candidate.id === item.productId);
    return product ? [{ item, product }] : [];
  });
  const components = new Set(selected.flatMap(({ product }) => product.components));
  const missing = requirement.requiredComponents.filter((part) => !components.has(part));
  return { selected, missing, complete: selected.length > 0 && missing.length === 0 };
}

/** The quote's first component is the fixture; remaining components are supporting parts. */
export function leadingRequirementOption(candidates: SourcedProduct[], requirement: SourcingRequirement) {
  const primary = requirement.requiredComponents[0];
  const fixtures = primary ? candidates.filter((product) => product.components.includes(primary)) : candidates;
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

/** Only compare labelled supplier dimensions with structured quote constraints, never infer room fit. */
export function quoteSizeCheck(requirement: SourcingRequirement | undefined, product: SourcedProduct) {
  if (!requirement) return 'Check measurements';
  const constraints = Object.entries(requirement.constraints).filter(([key, value]) =>
    /^(max|min)?(width|length|depth|height|projection|thickness)Mm$/i.test(key) && typeof value === 'number');
  if (!constraints.length) return 'Check measurements';
  let unknown = false;
  for (const [key, expected] of constraints) {
    const dimension = key.replace(/^(max|min)/, '');
    const normal = dimension[0].toLowerCase() + dimension.slice(1);
    const spec = Object.entries(product.specs ?? {}).find(([name]) => name.toLowerCase() === normal.replace(/Mm$/, '').toLowerCase())?.[1];
    const raw = product.dimensions[normal] ?? spec;
    const actual = typeof raw === 'number' ? raw : typeof raw === 'string' && /^\s*\d+(\.\d+)?\s*mm\s*$/i.test(raw) ? parseFloat(raw) : undefined;
    if (actual === undefined || !Number.isFinite(actual)) { unknown = true; continue; }
    const target = expected as number;
    const tolerance = typeof requirement.constraints.tileToleranceMm === 'number' ? requirement.constraints.tileToleranceMm : 0;
    const differs = key.startsWith('max') ? actual > target : key.startsWith('min') ? actual < target : Math.abs(actual - target) > tolerance;
    if (differs) return 'Different from quote · Check measurements';
  }
  return unknown ? 'Check measurements' : 'Within checked quote sizes · Confirm room measurements';
}
