import type { ProjectSourcing, SourcedProduct, SourcingRoomId } from '@/types/sourcing.types';
import { plannedTileCalculation } from './tilePlanner';
import { demandFor } from './selection';

export const spendCategories = ['Tiles', 'Sanitaryware', 'Furniture', 'Showers', 'Heating', 'Fittings', 'Lighting', 'Ventilation', 'Accessories', 'Other'] as const;
export const isUncountedPrice = (product: SourcedProduct) => product.priceUnit === 'per box' || product.priceUnit === 'per tile';
export function productCostPence(product: SourcedProduct, quantity: number): number | undefined {
  if (isUncountedPrice(product) || !Number.isFinite(product.price) || product.price < 0 || !Number.isFinite(quantity) || quantity <= 0) return undefined;
  return Math.round(Math.round(product.price * 100) * quantity);
}
export function basketCostPence(sourcing: ProjectSourcing, item: ProjectSourcing['basket'][number]) {
  const calculation = plannedTileCalculation(sourcing, item);
  const product = sourcing.products.find((entry) => entry.id === item.productId);
  return calculation?.totalPence ?? (product ? productCostPence(product, item.quantity) : undefined);
}
export function selectedSpend(sourcing: ProjectSourcing, roomId?: SourcingRoomId, status?: ProjectSourcing['basket'][number]['status']) {
  const categories = spendCategories.map((category) => ({ category, pence: 0, unknown: 0, purchases: 0, percent: 0 }));
  for (const item of sourcing.basket) {
    if (status && item.status !== status) continue;
    const requirement = sourcing.requirements.find((entry) => entry.id === item.requirementId);
    if (!requirement || roomId && demandFor(sourcing, requirement).roomId !== roomId) continue;
    const category = categories.find((entry) => entry.category === demandFor(sourcing, requirement).category) ?? categories[categories.length - 1];
    const pence = basketCostPence(sourcing, item);
    category.purchases++;
    if (pence === undefined) category.unknown++; else category.pence += pence;
  }
  const totalPence = categories.reduce((sum, entry) => sum + entry.pence, 0);
  const unknown = categories.reduce((sum, entry) => sum + entry.unknown, 0);
  for (const category of categories) category.percent = totalPence ? category.pence / totalPence * 100 : 0;
  return { totalPence, unknown, categories };
}

export function quoteReferenceSpend(sourcing: ProjectSourcing, roomId?: SourcingRoomId) {
  const reference = sourcing.quoteCostReference;
  const rooms = roomId ? [roomId] : ['main-bathroom', 'shower-room'] as const;
  const sum = (field: 'labourPence' | 'goodsPence' | 'totalPence' | 'deliveryPence') => {
    const amounts = rooms.map((id) => reference?.rooms[id as SourcingRoomId]?.[field]);
    return amounts.every((amount) => typeof amount === 'number' && Number.isSafeInteger(amount) && amount >= 0) ? amounts.reduce<number>((total, amount) => total + amount!, 0) : undefined;
  };
  return { reference, labourPence: sum('labourPence'), goodsPence: sum('goodsPence'), totalPence: sum('totalPence'), deliveryPence: sum('deliveryPence') };
}
