import { createBathroomSourcingSeed } from '../seed';
import { fixtureFit, saveFixtureSpace } from '../fixtureFit';
import { chooseSourcingOption } from '../householdItems';
import { migrate } from '@/components/property/projects/ProjectMaterialsView';
const source = createBathroomSourcingSeed();
const requirement = source.requirements.find((item) => item.id === 'main-bath')!;
const original = source.products.find((item) => item.requirementIds?.includes(requirement.id) && item.components.includes('bath'))!;
const product = { ...original, dimensions: { widthMm: 900, lengthMm: 1700 } };
const space = { widthMm: 950, lengthMm: 1750, clearanceMm: 50, source: 'Fitter measured bath alcove', confirmedAt: '2026-10-04T12:00:00.000Z' };
test('does not treat quote dimensions or tile areas as confirmed space', () => {
  expect(fixtureFit(requirement, product).status).toBe('unknown');
});
test('checks labelled dimensions with required clearance and exact boundaries', () => {
  expect(fixtureFit({ ...requirement, fitSpace: space }, product).status).toBe('fits');
  expect(fixtureFit({ ...requirement, fitSpace: { ...space, widthMm: 949 } }, product).status).toBe('no_fit');
});
test('unknown and unlabelled dimensions never invent fit or silently rotate', () => {
  expect(fixtureFit({ ...requirement, fitSpace: space }, { ...product, size: '900 x 1700mm', dimensions: {}, specs: {} }).status).toBe('unknown');
  expect(fixtureFit({ ...requirement, fitSpace: space }, { ...product, dimensions: { widthMm: 1700, lengthMm: 900 } }).status).toBe('no_fit');
  expect(fixtureFit({ ...requirement, fitSpace: { ...space, widthMm: undefined } }, product).status).toBe('unknown');
});
test('changed measurements invalidate approval, preserve orders and other room, survive migration', () => {
  const selected = { ...source, products: source.products.map((item) => item.id === product.id ? product : item), basket: [{ id: 'a', requirementId: requirement.id, productId: product.id, quantity: 1, status: 'approved' as const }, { id: 'b', requirementId: 'shower-tray', productId: 'x', quantity: 1, status: 'ordered' as const }] };
  const saved = saveFixtureSpace(selected, requirement.id, space);
  expect(saved.basket[0].status).toBe('ask_fitter'); expect(saved.basket[1]).toEqual(selected.basket[1]);
  const refreshed = migrate(saved); expect(refreshed.requirements.find((item) => item.id === requirement.id)?.fitSpace).toEqual(space);
  expect(refreshed.products.find((item) => item.id === product.id)?.dimensions).toEqual(product.dimensions);
});
test('prevents choosing an oversized product and logs a permitted choice', () => {
  const saved = saveFixtureSpace({ ...source, products: source.products.map((item) => item.id === product.id ? product : item) }, requirement.id, space);
  const chosen = chooseSourcingOption(saved, requirement.id, product.id, 'review');
  expect(chosen.choiceHistory?.[0].selected.name).toBe(product.name);
  const tooSmall = saveFixtureSpace(saved, requirement.id, { ...space, widthMm: 800 });
  expect(() => chooseSourcingOption(tooSmall, requirement.id, product.id, 'review')).toThrow('exceeds');
});
test('invalid measurements are rejected', () => {
  expect(() => saveFixtureSpace(source, requirement.id, { ...space, widthMm: -1 })).toThrow();
  expect(() => saveFixtureSpace(source, requirement.id, { ...space, source: '' })).toThrow();
});
test('supporting parts are not incorrectly judged against the fixture envelope', () => {
  expect(fixtureFit({ ...requirement, fitSpace: space }, { ...product, components: ['screen'], dimensions: { widthMm: 5000, lengthMm: 5000 } }).status).toBe('unknown');
});
