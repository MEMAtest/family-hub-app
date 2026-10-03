import { migrate } from '../ProjectMaterialsView';
import { createBathroomSourcingSeed } from '@/lib/sourcing/seed';
import type { ProjectSourcing, SourcedProduct } from '@/types/sourcing.types';
import { basketTotal, roomName } from '../bathroomProject.helpers';

const seed = createBathroomSourcingSeed();
const seedProduct = seed.products[0];
const requirementId = seed.requirements[0].id;
const found = (id: string, requirementIds = [requirementId]): SourcedProduct => ({
  id, supplier: 'Stonewater Bathrooms', name: id, url: `https://www.stonewaterbathrooms.com/products/${id}`, imageUrl: '', price: 100,
  stock: 'IN_STOCK', stockEvidence: 'In stock', dimensions: {}, components: [], requirementIds, lastChecked: '2026-10-02T09:00:00.000Z',
});

test('a catalogue update keeps searched products, their basket entries and fresher stock checks', () => {
  const saved: ProjectSourcing = {
    version: 1,
    rooms: { 'main-bathroom': { name: 'Family Bathroom', sizeNotes: 'Check the door clearance' } },
    requirements: seed.requirements,
    products: [
      { ...seedProduct, stock: 'OUT_OF_STOCK', stockEvidence: 'Out of stock', lastChecked: '2099-01-01T00:00:00.000Z' },
      found('sw-fairford-bath'),
      found('capietra-101'),
      found('placeholder-bath'), // an old placeholder, not from a search
      found('sw-orphan', ['req-deleted']), // searched, but its quote item is gone
    ],
    basket: [
      { id: 'b1', requirementId, productId: 'sw-fairford-bath', quantity: 1, status: 'approved' },
      { id: 'b2', requirementId, productId: 'capietra-101', quantity: 1, status: 'ask_fitter' },
      { id: 'b3', requirementId, productId: 'placeholder-bath', quantity: 1, status: 'review' },
      { id: 'b4', requirementId, productId: seedProduct.id, quantity: 1, status: 'ordered' },
    ],
  };
  const next = migrate(saved);
  const ids = next.products.map((p) => p.id);
  expect(ids).toEqual(expect.arrayContaining(['sw-fairford-bath', 'capietra-101', seedProduct.id]));
  expect(ids).not.toContain('placeholder-bath');
  expect(ids).not.toContain('sw-orphan');
  expect(next.basket.map((b) => [b.id, b.status])).toEqual([['b1', 'approved'], ['b2', 'ask_fitter'], ['b4', 'ordered']]);
  // The household's newer stock check beats the catalogue's
  expect(next.products.find((p) => p.id === seedProduct.id)).toMatchObject({ stock: 'OUT_OF_STOCK', stockEvidence: 'Out of stock' });
  expect(next.version).toBe(seed.version);
  expect(next.rooms).toEqual(saved.rooms);
});

test('refresh preserves the existing Laurel WC selection, GBP 239 subtotal and real room names', () => {
  const saved: ProjectSourcing = {
    ...createBathroomSourcingSeed(), version: 1,
    rooms: { 'main-bathroom': { name: 'Main Bathroom' }, 'shower-room': { name: 'Shower Room' } },
    basket: [{ id: 'existing-laurel', requirementId: 'main-wc-unit', productId: 'sw-614103150', quantity: 1, status: 'ask_fitter' }],
  };
  const next = migrate(saved);
  expect(next.basket).toEqual(saved.basket);
  expect(basketTotal(next)).toBe(239);
  expect(roomName(next, 'main-bathroom')).toBe('Main Bathroom');
  expect(roomName(next, 'shower-room')).toBe('Shower Room');
});
