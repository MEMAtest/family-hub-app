import { inferComponentEvidence, inferIncludedComponents, productComponentEvidence } from '../productMatching';
import { createBathroomSourcingSeed } from '../seed';
import { evaluateSelection, quoteSelection } from '../selection';

const basinParts = ['basin-tap', 'basin-waste', 'basin'];

test('recognises common bathroom products and parts from supplier copy', () => {
  expect(inferIncludedComponents('Concealed cistern with flush plate', ['cistern', 'wc-unit', 'toilet'])).toEqual(['cistern']);
  expect(inferIncludedComponents('Bathroom extractor fan with LED bulbs', ['extractor-fan', 'led-bulb', 'downlight'])).toEqual(['extractor-fan', 'led-bulb']);
  expect(inferIncludedComponents('500mm WC furniture unit with cistern', ['wc-unit', 'cistern', 'toilet'])).toEqual(['wc-unit', 'cistern']);
});

test('does not infer unrelated parts from a broad product title', () => {
  expect(inferIncludedComponents('Bathroom ceiling light', ['downlight', 'led-bulb', 'extractor-fan'])).toEqual([]);
});

test.each([
  ['Fairford Icon1 Basin Mixer with Push Button Waste', 'main-basin-tap'],
  ['Fairford Element 5 Basin Mixer with Push Button Waste', 'shower-basin-tap'],
])('real supplier title supplies basin mixer and its push-button waste: %s', (name, requirementId) => {
  const sourcing = createBathroomSourcingSeed();
  const product = { ...sourcing.products[0], id: 'manual-regression', name, components: [], componentEvidence: {}, description: '', size: '', specs: {}, requirementIds: [requirementId] };
  const evidence = productComponentEvidence(product, basinParts);
  expect(evidence).toMatchObject({
    'basin-tap': { quantity: 1, state: 'included', source: 'supplier', text: name },
    'basin-waste': { quantity: 1, state: 'included', source: 'supplier', text: name },
  });
  expect(evidence.basin).toBeUndefined();
  sourcing.products.push(product);
  sourcing.basket.push({ id: 'chosen', productId: product.id, requirementId, quantity: 1, status: 'review' });
  expect(evaluateSelection(sourcing, sourcing.requirements.find((item) => item.id === requirementId)!)).toMatchObject({ complete: true, unknown: false, missing: [] });
  expect(quoteSelection(sourcing, sourcing.quoteLines!.find((line) => line.requirementId === requirementId)!)).toMatchObject({ complete: true, coverage: [{ quantity: 1, required: 1 }, { quantity: 1, required: 1 }] });
});

test.each([
  'Bath Mixer Tap with Push Button Waste',
  'Shower Mixer Tap with Push Button Waste',
  'Shower Tray with Push Button Waste',
  'Push Button Waste',
  'Click Waste',
  'Mixer Tap',
  'Basin mixer compatible with shower tray push button waste',
])('generic or other-fixture copy does not invent basin parts: %s', (name) => {
  const evidence = inferComponentEvidence(name, basinParts);
  expect(evidence['basin-waste']).toBeUndefined();
  if (!name.startsWith('Basin mixer')) expect(evidence['basin-tap']).toBeUndefined();
});

test.each(['without Push Button Waste', 'with Push Button Waste not included', 'with Push Button Waste sold separately'])('contextual waste negation stays excluded: %s', (suffix) => {
  const evidence = inferComponentEvidence('Fairford Basin Mixer ' + suffix, basinParts);
  expect(evidence['basin-tap'].state).toBe('included');
  expect(evidence['basin-waste']).toMatchObject({ state: 'excluded', quantity: 0 });
});

test('explicit household evidence still overrides newly recognised supplier copy', () => {
  const product = { ...createBathroomSourcingSeed().products[0], name: 'Fairford Basin Mixer with Push Button Waste', components: [], componentEvidence: { 'basin-waste': { state: 'excluded' as const, quantity: 0, source: 'user' as const } } };
  expect(productComponentEvidence(product, basinParts)['basin-waste']).toMatchObject({ state: 'excluded', quantity: 0, source: 'user' });
});
