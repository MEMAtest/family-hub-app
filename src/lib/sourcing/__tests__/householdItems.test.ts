import { createBathroomSourcingSeed, SOURCING_SEED_VERSION } from '../seed';
import { addHouseholdItem, addHouseholdProduct, chooseSourcingOption } from '../householdItems';
import { quoteLineSelected } from '../quoteInventory';
import { migrate } from '@/components/property/projects/ProjectMaterialsView';

const item = { roomId: 'main-bathroom' as const, name: 'LED mirror', category: 'Accessories' as const, quantity: 1, size: '600mm', specification: 'LED mirror', unit: 'each', relatedToId: 'main-vanity' };
const product = { requirementId: 'req-mirror', name: 'Round LED mirror', supplier: 'Your shop', url: 'https://example.com/mirror', imageUrl: '', price: 149, priceUnit: 'each' as const, size: '600mm', components: [], notes: '' };
test('Union WC quote has its stated width and two linked supplier options after migration', () => {
  const saved = createBathroomSourcingSeed();
  saved.version = 4;
  saved.products = saved.products.filter((entry) => !entry.requirementIds?.includes('shower-wc-unit'));
  saved.basket.push({ id: 'existing', requirementId: 'main-wc-unit', productId: 'sw-614103150', quantity: 1, status: 'ask_fitter' });
  const refreshed = migrate(saved);
  expect(refreshed.version).toBe(SOURCING_SEED_VERSION);
  const requirement = refreshed.requirements.find((entry) => entry.id === 'shower-wc-unit')!;
  expect(requirement.size).toBe('500mm wide');
  expect(requirement.constraints.maxWidthMm).toBe(500);
  const options = refreshed.products.filter((entry) => entry.requirementIds?.includes(requirement.id));
  expect(options).toHaveLength(2);
  expect(options.map((entry) => entry.dimensions.depthMm)).toEqual([255, 355]);
  expect(options.every((entry) => entry.imageUrl.startsWith('https://') && entry.components.length === 1)).toBe(true);
  expect(refreshed.basket).toEqual(saved.basket);
});
test('every supply-of-goods line from both quotations has an accessible requirement', () => {
  const seed = createBathroomSourcingSeed();
  expect(seed.quoteLines).toHaveLength(28);
  for (const line of seed.quoteLines!) expect(seed.requirements.some((requirement) => requirement.id === line.requirementId && requirement.roomId === line.roomId)).toBe(true);
  expect(seed.requirements.find((requirement) => requirement.id === 'main-downlights')?.quantity).toBe(6);
  expect(seed.requirements.find((requirement) => requirement.id === 'shower-downlights')?.quantity).toBe(4);
  expect(seed.quoteLines!.filter((line) => line.roomId === 'shower-room')).toHaveLength(14);
});
test('bundle parts appear as separate quote lines without duplicate basket entries', () => {
  const seed = createBathroomSourcingSeed();
  seed.products.push({ id: 'manual-bath', name: 'Complete bath', supplier: 'Shop', price: 300, url: '', imageUrl: '', stock: 'UNKNOWN', stockEvidence: '', dimensions: {}, lastChecked: '', components: ['bath', 'waste', 'screen', 'front-panel', 'end-panel'] });
  seed.basket.push({ id: 'chosen-bath', requirementId: 'main-bath', productId: 'manual-bath', quantity: 1, status: 'review' });
  expect(seed.quoteLines!.filter((line) => line.requirementId === 'main-bath').every((line) => quoteLineSelected(seed, line))).toBe(true);
  expect(seed.basket).toHaveLength(1);
});
test('one downlight is not treated as the six quoted downlights', () => {
  const seed = createBathroomSourcingSeed();
  seed.products.push({ id: 'manual-light', name: 'Light', supplier: 'Shop', price: 20, url: '', imageUrl: '', stock: 'UNKNOWN', stockEvidence: '', dimensions: {}, lastChecked: '', components: ['downlight', 'led-bulb'] });
  seed.basket.push({ id: 'chosen-light', requirementId: 'main-downlights', productId: 'manual-light', quantity: 1, status: 'review' });
  const line = seed.quoteLines!.find((entry) => entry.requirementId === 'main-downlights')!;
  expect(quoteLineSelected(seed, line)).toBe(false);
  seed.basket[0].quantity = 6;
  expect(quoteLineSelected(seed, line)).toBe(true);
});
test('household items and linked supplier options survive catalogue migration without auto-ordering', () => {
  const seed = createBathroomSourcingSeed();
  const added = addHouseholdItem(seed, item, 'req-mirror');
  const saved = addHouseholdProduct(added.sourcing, product, 'manual-mirror').sourcing;
  const restored = migrate(JSON.parse(JSON.stringify({ ...saved, version: 3 })));
  expect(restored.requirements.find((entry) => entry.id === 'req-mirror')).toMatchObject({ relatedToId: 'main-vanity', source: 'household', quantity: 1 });
  expect(restored.products.find((entry) => entry.id === 'manual-mirror')).toMatchObject({ source: 'household', stock: 'UNKNOWN', price: 149 });
  expect(restored.basket).toHaveLength(0);
  expect(seed.requirements.some((entry) => entry.id === 'req-mirror')).toBe(false);
});
test('bad quantities, wrong-room relationships, unknown items and unsafe links are rejected', () => {
  const seed = createBathroomSourcingSeed();
  expect(() => addHouseholdItem(seed, { ...item, quantity: 0 }, 'req-bad')).toThrow();
  expect(() => addHouseholdItem(seed, { ...item, relatedToId: 'shower-vanity' }, 'req-bad')).toThrow('same bathroom');
  expect(() => addHouseholdProduct(seed, product, 'manual-bad')).toThrow('Choose the item');
  const added = addHouseholdItem(seed, item, 'req-mirror').sourcing;
  for (const url of ['javascript:alert(1)', 'http://example.com', 'https://user:password@example.com']) expect(() => addHouseholdProduct(added, { ...product, url }, 'manual-bad')).toThrow();
  expect(() => addHouseholdProduct(added, { ...product, price: NaN }, 'manual-bad')).toThrow();
  expect(() => addHouseholdProduct(added, { ...product, components: ['invented-part'] }, 'manual-bad')).toThrow('quoted parts');
});

test('choosing an alternative replaces the current fixture but retains supporting parts and protects ordered choices', () => {
  const seed = createBathroomSourcingSeed();
  const first = { ...product, requirementId: 'main-bath', components: ['bath'] };
  let saved = addHouseholdProduct(seed, first, 'manual-first').sourcing;
  saved = addHouseholdProduct(saved, { ...first, name: 'Alternative bath' }, 'manual-second').sourcing;
  saved = addHouseholdProduct(saved, { ...first, name: 'Bath waste', components: ['waste'] }, 'manual-waste').sourcing;
  saved = chooseSourcingOption(saved, 'main-bath', 'manual-first', 'approved');
  saved = chooseSourcingOption(saved, 'main-bath', 'manual-waste', 'review');
  const replaced = chooseSourcingOption(saved, 'main-bath', 'manual-second', 'review');
  expect(replaced.basket.map((entry) => entry.productId)).toEqual(['manual-waste', 'manual-second']);
  saved.basket[0].status = 'ordered';
  expect(() => chooseSourcingOption(saved, 'main-bath', 'manual-second', 'review')).toThrow('marked ordered');
  expect(saved.basket.map((entry) => entry.productId)).toEqual(['manual-first', 'manual-waste']);
});
test('a manually entered price per individual tile stays per tile, not per box', () => {
  const seed = createBathroomSourcingSeed();
  const added = addHouseholdProduct(seed, { ...product, requirementId: 'main-floor-tiles' }, 'manual-tile');
  expect(added.product.priceUnit).toBe('per tile');
});
test('selected variant photo leads the saved gallery rather than the generic product image', () => {
  const seed = addHouseholdItem(createBathroomSourcingSeed(), item, 'req-mirror').sourcing;
  const selected = addHouseholdProduct(seed, { ...product, imageUrl: 'https://cdn.shopify.com/selected.jpg', gallery: ['https://cdn.shopify.com/generic.jpg', 'https://cdn.shopify.com/selected.jpg'] }, 'manual-variant');
  expect(selected.product.gallery).toEqual(['https://cdn.shopify.com/selected.jpg', 'https://cdn.shopify.com/generic.jpg']);
});
