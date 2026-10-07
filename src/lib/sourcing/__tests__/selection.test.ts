import type { ProjectSourcing, SourcedProduct } from '@/types/sourcing.types';
import { createBathroomSourcingSeed } from '../seed';
import { evaluateSelection, quoteSelection, requiredDemands } from '../selection';
import { chooseSourcingOption, addHouseholdItem, addHouseholdProduct } from '../householdItems';
import { inferComponentEvidence } from '../productMatching';
import { productFromRecord } from '../stonewaterProduct';
import { quoteReferenceSpend, selectedSpend } from '../spend';
import { migrate } from '../migrate';
import { checklistCsv } from '../downloads';
import { quoteSizeAssessment } from '../quoteSize';
import { fixtureFit } from '../fixtureFit';

const option = (id: string, requirementId: string, name: string, components: string[] = [], price = 12.34): SourcedProduct => ({
  id, name, components, price, requirementIds: [requirementId], supplier: 'Fixture', imageUrl: '', url: '',
  dimensions: {}, stock: 'UNKNOWN', stockEvidence: '', lastChecked: '',
});
function add(sourcing: ProjectSourcing, product: SourcedProduct, requirementId: string, quantity = 1) {
  sourcing.products.push(product);
  sourcing.basket.push({ id: product.id, productId: product.id, requirementId, quantity, status: 'review' });
}

test('actual supplier parser recognises vanity WITH basin, filler and cistern with labelled width', () => {
  const record = (title: string, body = '') => productFromRecord({ title, body, url: '/products/test', price: 123 });
  expect(record('600mm vanity WITH basin')).toMatchObject({ components: expect.arrayContaining(['vanity', 'basin']), dimensions: { widthMm: 600 } });
  expect(record('Element Five bath filler')).toMatchObject({ components: ['bath-filler'] });
  expect(record('Fluid Master concealed cistern')).toMatchObject({ components: ['cistern'] });
  expect(record('Vanity without basin')?.componentEvidence?.basin.state).toBe('excluded');
});

test.each([
  ['Vanity with basin; waste not included', ['vanity', 'basin'], ['waste']],
  ['Vanity without basin and waste', ['vanity'], ['basin', 'waste']],
  ['Vanity; basin and waste sold separately', ['vanity'], ['basin', 'waste']],
  ['Vanity; not included: basin', ['vanity'], ['basin']],
  ['Vanity with basin (not included)', ['vanity'], ['basin']],
  ['2 x downlights with 2 LED bulbs', ['downlight', 'led-bulb'], []],
])('inference scopes negation and quantities: %s', (text, included, excluded) => {
  const evidence = inferComponentEvidence(text);
  for (const part of included) expect(evidence[part].state).toBe('included');
  for (const part of excluded) expect(evidence[part].state).toBe('excluded');
  if (text.startsWith('2')) expect(evidence.downlight.quantity).toBe(2);
});

test('basket quantity and per-unit component evidence agree for demand and quote, not presence alone', () => {
  const sourcing = createBathroomSourcingSeed();
  const product = option('manual-lights', 'main-downlights', 'Lighting pack', []);
  product.componentEvidence = {
    downlight: { quantity: 2, state: 'included', source: 'user' },
    'led-bulb': { quantity: 2, state: 'included', source: 'user' },
  };
  add(sourcing, product, 'main-downlights', 1);
  const req = sourcing.requirements.find((item) => item.id === 'main-downlights')!;
  const line = sourcing.quoteLines!.find((item) => item.requirementId === req.id)!;
  expect(evaluateSelection(sourcing, req)).toMatchObject({ complete: false, coverage: [{ quantity: 2, required: 6 }, { quantity: 2, required: 6 }] });
  expect(quoteSelection(sourcing, line).complete).toBe(false);
  sourcing.basket[0].quantity = 3;
  expect(evaluateSelection(sourcing, req).complete).toBe(true);
  expect(quoteSelection(sourcing, line).complete).toBe(true);
  expect(selectedSpend(sourcing).totalPence).toBe(3702);
});

test.each(['unknown', 'wrong-tag'])('direct linked %s purchase remains visibly selected without inventing coverage', (kind) => {
  const sourcing = createBathroomSourcingSeed();
  const product = option('manual-mystery', 'main-bath-filler', 'Selected supplier choice', kind === 'wrong-tag' ? ['cistern'] : []);
  add(sourcing, product, 'main-bath-filler');
  const req = sourcing.requirements.find((item) => item.id === 'main-bath-filler')!;
  const line = sourcing.quoteLines!.find((item) => item.requirementId === req.id)!;
  expect(evaluateSelection(sourcing, req)).toMatchObject({ complete: false, selected: [{ product }], missing: ['bath-filler'] });
  expect(quoteSelection(sourcing, line)).toMatchObject({ complete: false, selections: [{ product }] });
  expect(checklistCsv(sourcing)).toContain('Selected - coverage incomplete');
  expect(checklistCsv(sourcing)).toContain(product.name);
});

test('bundle counted once, room isolated and duplicate waste warning never removes a purchase', () => {
  const sourcing = createBathroomSourcingSeed();
  add(sourcing, option('manual-bath', 'main-bath', 'Bath bundle', ['bath', 'screen', 'front-panel', 'end-panel', 'waste'], 100), 'main-bath');
  add(sourcing, option('manual-waste', 'main-bath', 'Separate waste', ['waste'], 10), 'main-bath');
  const main = sourcing.requirements.find((item) => item.id === 'main-bath')!;
  expect(evaluateSelection(sourcing, main)).toMatchObject({ complete: true, warnings: [expect.stringContaining('Duplicate waste')] });
  expect(selectedSpend(sourcing, 'main-bathroom').totalPence).toBe(11000);
  expect(selectedSpend(sourcing, 'shower-room').totalPence).toBe(0);
  const support = sourcing.quoteLines!.find((line) => line.text === 'Bath pop-up waste')!;
  expect(quoteSelection(sourcing, support).complete).toBe(true);
  expect(sourcing.basket).toHaveLength(2);
  const csv = checklistCsv(sourcing);
  expect(csv.match(/"110.00"/g)).toHaveLength(1);
  const shower = sourcing.requirements.find((item) => item.id === 'shower-tray')!;
  expect(evaluateSelection(sourcing, shower).selected).toEqual([]);
});

test.each([
  ['main-rail', 'towel-rail', 'Heated towel rail', 'Towel rail valves pair', 'valves'],
  ['shower-tray', 'shower-tray', 'Rectangular shower tray with waste', 'Fast flow shower tray waste', 'waste'],
])('accessories do not create false multiple fixtures for %s', (id, primary, fixtureName, accessoryName, accessory) => {
  const sourcing = createBathroomSourcingSeed();
  add(sourcing, option('fixture', id, fixtureName), id);
  add(sourcing, option('accessory', id, accessoryName), id);
  if (accessory === 'valves') add(sourcing, option('second-accessory', id, accessoryName), id);
  const result = evaluateSelection(sourcing, sourcing.requirements.find((entry) => entry.id === id)!);
  expect(result.coverage.find((entry) => entry.component === primary)?.quantity).toBe(1);
  expect(result.warnings).toEqual([expect.stringContaining(`Duplicate ${accessory}`)]);
  expect(sourcing.basket).toHaveLength(accessory === 'valves' ? 3 : 2);
});

test('related replacement stays under original demand and is not another required item', () => {
  let sourcing = createBathroomSourcingSeed();
  sourcing = addHouseholdItem(sourcing, { roomId: 'main-bathroom', name: 'Different vanity', category: 'Furniture', quantity: 1, size: '550mm wide', specification: 'Vanity with basin', unit: 'each', relatedToId: 'main-vanity', replacement: true }, 'req-replacement').sourcing;
  sourcing = addHouseholdProduct(sourcing, { requirementId: 'req-replacement', name: 'Replacement vanity with basin', supplier: 'Fixture', url: '', imageUrl: '', price: 150, priceUnit: 'each', size: '550mm wide', components: [], notes: '' }, 'manual-replacement').sourcing;
  sourcing = chooseSourcingOption(sourcing, 'req-replacement', 'manual-replacement', 'review');
  sourcing = chooseSourcingOption(sourcing, 'req-replacement', 'manual-replacement', 'approved');
  expect(sourcing.basket).toHaveLength(1);
  expect(sourcing.basket[0]).toMatchObject({ requirementId: 'main-vanity', optionRequirementId: 'req-replacement' });
  const req = sourcing.requirements.find((item) => item.id === 'main-vanity')!;
  expect(evaluateSelection(sourcing, req)).toMatchObject({ complete: true, deviation: true });
  expect(quoteSelection(sourcing, sourcing.quoteLines!.find((line) => line.requirementId === req.id)!)).toMatchObject({ complete: true, deviation: true });
  expect(requiredDemands(sourcing).map((item) => item.id)).not.toContain('req-replacement');
  expect(requiredDemands(sourcing).map((item) => item.id)).not.toContain('tile-kapital-grey');
});

test('all categories use integer pence and unknown box prices do not dilute percentages', () => {
  const sourcing = createBathroomSourcingSeed();
  for (const [id, category] of [['req-light', 'Lighting'], ['req-fan', 'Ventilation'], ['req-hook', 'Accessories'], ['req-other', 'Other']] as const) {
    sourcing.requirements.push({ ...sourcing.requirements[0], id, category, requiredComponents: [], primaryComponent: undefined });
    add(sourcing, option('manual-' + id, id, id, [], 10.015), id, 2);
  }
  const unpriced = option('manual-box', 'req-other', 'Box', [], 80); unpriced.priceUnit = 'per box';
  add(sourcing, unpriced, 'req-other');
  const spend = selectedSpend(sourcing);
  expect(spend).toMatchObject({ totalPence: 8016, unknown: 1 });
  for (const category of ['Lighting', 'Ventilation', 'Accessories', 'Other']) expect(spend.categories.find((row) => row.category === category)).toMatchObject({ pence: 2004, percent: 25 });
  expect(spend.categories).toHaveLength(10);
});

test('quote-size positive state is distinct from room-fit unknown; known supporting basin is not a vanity', () => {
  const req = createBathroomSourcingSeed().requirements.find((item) => item.id === 'main-vanity')!;
  const vanity = { ...option('manual-v', req.id, 'Vanity with basin', ['vanity', 'basin']), dimensions: { widthMm: 600 } };
  expect(quoteSizeAssessment(req, vanity).status).toBe('within');
  expect(fixtureFit(req, vanity).status).toBe('unknown');
  const basin = { ...option('manual-b', req.id, 'Supporting basin', ['basin']), dimensions: { widthMm: 650 } };
  expect(quoteSizeAssessment(req, basin)).toMatchObject({ status: 'not_applicable', label: 'Supporting part - compatibility not confirmed' });
});

test('dated labour/goods quote reference is separate from selected and ordered goods and preserves edits', () => {
  const sourcing = createBathroomSourcingSeed();
  expect(quoteReferenceSpend(sourcing)).toMatchObject({ labourPence: 1392000, goodsPence: 773000, totalPence: 2165000, deliveryPence: undefined });
  expect(quoteReferenceSpend(sourcing, 'main-bathroom')).toMatchObject({ labourPence: 775000, goodsPence: 371000, totalPence: 1146000 });
  add(sourcing, option('manual-order', 'main-vanity', 'Vanity WITH basin', [], 120), 'main-vanity');
  add(sourcing, option('manual-review', 'main-bath-filler', 'Bath filler', [], 50), 'main-bath-filler');
  sourcing.basket[0].status = 'ordered';
  expect(selectedSpend(sourcing).totalPence).toBe(17000);
  expect(selectedSpend(sourcing, undefined, 'ordered').totalPence).toBe(12000);
  sourcing.quoteCostReference!.rooms['main-bathroom']!.labourPence = 800000;
  sourcing.quoteCostReference!.rooms['main-bathroom']!.deliveryPence = 4500;
  expect(migrate({ ...sourcing, version: 4 }).quoteCostReference).toEqual(sourcing.quoteCostReference);
  expect(quoteReferenceSpend(migrate(sourcing), 'main-bathroom')).toMatchObject({ labourPence: 800000, deliveryPence: 4500 });
});
