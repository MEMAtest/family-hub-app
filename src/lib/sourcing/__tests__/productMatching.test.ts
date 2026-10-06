import { inferIncludedComponents } from '../productMatching';

test('recognises common bathroom products and parts from supplier copy', () => {
  expect(inferIncludedComponents('Concealed cistern with flush plate', ['cistern', 'wc-unit', 'toilet'])).toEqual(['cistern']);
  expect(inferIncludedComponents('Bathroom extractor fan with LED bulbs', ['extractor-fan', 'led-bulb', 'downlight'])).toEqual(['extractor-fan', 'led-bulb']);
  expect(inferIncludedComponents('500mm WC furniture unit with cistern', ['wc-unit', 'cistern', 'toilet'])).toEqual(['wc-unit', 'cistern']);
});

test('does not infer unrelated parts from a broad product title', () => {
  expect(inferIncludedComponents('Bathroom ceiling light', ['downlight', 'led-bulb', 'extractor-fan'])).toEqual([]);
});
