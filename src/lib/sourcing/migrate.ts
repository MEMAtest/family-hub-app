import type { ProjectSourcing } from '@/types/sourcing.types';
import { createBathroomSourcingSeed } from './seed';

const searchedProduct = /^(sw|capietra|tilesahead|walltiles|bertandmay|tile-plan|manual)-/;
export function migrate(saved: ProjectSourcing): ProjectSourcing {
  const seed = createBathroomSourcingSeed();
  const seedIds = new Set(seed.requirements.map((item) => item.id));
  const custom = saved.requirements.filter((item) => !seedIds.has(item.id) && item.id.startsWith('req-') && ['main-bathroom', 'shower-room'].includes(item.roomId));
  const ids = new Set([...seedIds, ...custom.map((item) => item.id)]);
  const savedProducts = new Map(saved.products.map((product) => [product.id, product]));
  const catalogue = seed.products.map((product) => {
    const old = savedProducts.get(product.id);
    const preserved = old ? { ...product, dimensions: old.dimensions, specs: old.specs ?? product.specs, componentEvidence: old.componentEvidence, components: old.componentEvidence ? old.components : product.components } : product;
    return old && old.lastChecked > product.lastChecked ? { ...preserved, stock: old.stock, stockEvidence: old.stockEvidence, lastChecked: old.lastChecked } : preserved;
  });
  const catalogueIds = new Set(catalogue.map((product) => product.id));
  const products = [...catalogue, ...saved.products.filter((product) => !catalogueIds.has(product.id) && searchedProduct.test(product.id) && product.requirementIds?.some((id) => ids.has(id)))];
  const productIds = new Set(products.map((product) => product.id));
  return { ...seed, quoteCostReference: saved.quoteCostReference ?? seed.quoteCostReference, rooms: saved.rooms, tileDocuments: saved.tileDocuments, choiceHistory: saved.choiceHistory,
    requirements: [...seed.requirements.map((item) => { const old = saved.requirements.find((entry) => entry.id === item.id); return { ...item, tilePlan: old?.tilePlan, fitSpace: old?.fitSpace }; }), ...custom],
    products, basket: saved.basket.filter((item) => productIds.has(item.productId) && ids.has(item.requirementId)) };
}
