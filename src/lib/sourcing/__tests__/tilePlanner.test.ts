import type { TileChoice, TileMeasurement } from '@/types/sourcing.types';
import { createBathroomSourcingSeed } from '../seed';
import { calculateTiles, measurementArea, plannedTileCalculation, saveTilePlan } from '../tilePlanner';
import { basketTotal } from '@/components/property/projects/bathroomProject.helpers';
import { migrate } from '@/components/property/projects/ProjectMaterialsView';

const measurement: TileMeasurement = {
  method: 'area', unit: 'm', areaM2: 5, sections: [], deductionsM2: 0,
  wasteIncluded: 'excluded', wastePercent: 10, source: { kind: 'manual', label: 'Measured floor' },
};
const choice: TileChoice = { name: 'Test porcelain', supplier: 'Test shop', url: 'https://example.com/tile', widthMm: 600, lengthMm: 600, coveragePerBoxM2: 1.44, price: 42, priceBasis: 'box' };

test('5m² plus 10% rounds to four boxes and £168, not a fractional box', () => {
  expect(calculateTiles(measurement, choice)).toMatchObject({ netAreaM2: 5, orderAreaM2: 5.5, tilesNeeded: 16, boxesNeeded: 4, purchasedCoverageM2: 5.76, totalPence: 16800 });
});
test('an exact box boundary does not round up due to floating point noise', () => {
  expect(calculateTiles({ ...measurement, areaM2: 4.32, wasteIncluded: 'included' }, choice).boxesNeeded).toBe(3);
});
test('waste already included is not added again', () => {
  expect(calculateTiles({ ...measurement, areaM2: 5.5, wasteIncluded: 'included', wastePercent: 50 }, choice).orderAreaM2).toBe(5.5);
  expect(() => calculateTiles({ ...measurement, wasteIncluded: 'unknown' }, choice)).toThrow('Confirm whether');
});
test.each(['m', 'cm', 'mm'] as const)('dimensions in %s convert to m² and subtract openings', (unit) => {
  const multiplier = { m: 1, cm: 100, mm: 1000 }[unit];
  expect(measurementArea({ ...measurement, method: 'dimensions', unit, sections: [{ label: 'Wall 1', length: 3 * multiplier, width: 2 * multiplier }, { label: 'Wall 2', length: 2 * multiplier, width: 2 * multiplier }], deductionsM2: 1.5 })).toBe(8.5);
});
test.each([NaN, Infinity, -1, 0])('invalid area %s cannot produce an order', (areaM2) => {
  expect(() => calculateTiles({ ...measurement, areaM2 }, choice)).toThrow();
});
test('empty dimensions and excessive deductions fail closed', () => {
  expect(() => measurementArea({ ...measurement, method: 'dimensions', sections: [] })).toThrow();
  expect(() => measurementArea({ ...measurement, deductionsM2: 6 })).toThrow();
});
test('box prices require box coverage; conflicting coverage must be corrected', () => {
  expect(() => calculateTiles(measurement, { ...choice, coveragePerBoxM2: undefined })).toThrow('coverage');
  expect(() => calculateTiles(measurement, { ...choice, tilesPerBox: 3 })).toThrow('disagree');
  expect(calculateTiles(measurement, { ...choice, coveragePerBoxM2: undefined, tilesPerBox: 4 }).boxesNeeded).toBe(4);
});
test('per m² and per tile pricing use the rounded order, not the raw room area', () => {
  expect(calculateTiles(measurement, { ...choice, priceBasis: 'm2', price: 30 }).totalPence).toBe(17280);
  expect(calculateTiles(measurement, { ...choice, priceBasis: 'tile', price: 10, tilesPerBox: 4 }).totalPence).toBe(16000);
  expect(() => calculateTiles(measurement, { ...choice, priceBasis: 'tile' })).toThrow('tiles per box');
  expect(calculateTiles(measurement, { ...choice, priceBasis: 'm2', coveragePerBoxM2: undefined }).purchasedCoverageM2).toBe(5.76);
});
test('unsafe links and invalid pack values are rejected', () => {
  expect(() => calculateTiles(measurement, { ...choice, url: 'javascript:alert(1)' })).toThrow();
  expect(() => calculateTiles(measurement, { ...choice, tilesPerBox: 2.5 })).toThrow();
  expect(() => calculateTiles(measurement, { ...choice, price: -1 })).toThrow();
});
test('saved choices update a surface without replacing the quote or other rooms', () => {
  const seed = createBathroomSourcingSeed();
  const saved = saveTilePlan(seed, 'main-floor-tiles', measurement, choice);
  expect(saved.requirements.find((item) => item.id === 'main-floor-tiles')).toMatchObject({ quantity: 5, tilePlan: { measurement: { areaM2: 5 }, choice } });
  expect(saved.requirements.filter((item) => item.roomId === 'shower-room')).toEqual(seed.requirements.filter((item) => item.roomId === 'shower-room'));
  expect(basketTotal(saved, 'main-bathroom')).toBe(168);
  expect(basketTotal(saved, 'shower-room')).toBe(0);
  const revised = saveTilePlan(saved, 'main-floor-tiles', { ...measurement, areaM2: 8 }, choice);
  expect(revised.basket).toHaveLength(1);
  expect(revised.requirements.find((item) => item.id === 'main-floor-tiles')!.tilePlan!.history[0].areaM2).toBe(5);
  expect(plannedTileCalculation(revised, revised.basket[0])?.boxesNeeded).toBe(7);
});
test('replacing a tile keeps only the new active selection and preserves fixtures', () => {
  const seed = createBathroomSourcingSeed();
  seed.basket.push({ id: 'fixture', productId: 'sw-614103150', requirementId: 'main-wc-unit', quantity: 1, status: 'ask_fitter' });
  const saved = saveTilePlan(seed, 'main-floor-tiles', measurement, choice);
  const revised = saveTilePlan(saved, 'main-floor-tiles', measurement, { ...choice, name: 'Different tile', price: 50 });
  expect(revised.basket).toHaveLength(2);
  expect(revised.basket.find((item) => item.id === 'fixture')).toEqual(seed.basket[0]);
  expect(basketTotal(revised)).toBe(439);
});
test('serialization and catalogue migration preserve original sources and tile plans', () => {
  const saved = saveTilePlan(createBathroomSourcingSeed(), 'main-floor-tiles', measurement, choice);
  const restored = migrate(JSON.parse(JSON.stringify({ ...saved, version: 1 })));
  expect(restored.requirements.find((item) => item.id === 'main-floor-tiles')!.tilePlan).toEqual(saved.requirements.find((item) => item.id === 'main-floor-tiles')!.tilePlan);
  expect(basketTotal(restored)).toBe(168);
});
test('source images are deduplicated across surfaces and revisions, not copied into every basket entry', () => {
  const photo = 'data:image/jpeg;base64,/9j/2Q==';
  const withPhoto = { ...measurement, source: { kind: 'photo' as const, label: 'Measurement photo', imageDataUrl: photo } };
  const saved = saveTilePlan(createBathroomSourcingSeed(), 'main-floor-tiles', withPhoto, { ...choice, sourceImageDataUrl: photo });
  const revised = saveTilePlan(saved, 'main-floor-tiles', { ...saved.requirements.find((item) => item.id === 'main-floor-tiles')!.tilePlan!.measurement, areaM2: 8 });
  expect(revised.tileDocuments).toHaveLength(1);
  expect(JSON.stringify(revised).split(photo)).toHaveLength(2);
  expect(revised.products.find((item) => item.id === 'tile-plan-main-floor-tiles')?.imageUrl).toBe('');
});
test('an ordered tile choice is not silently replaced or repriced', () => {
  const saved = saveTilePlan(createBathroomSourcingSeed(), 'main-floor-tiles', measurement, choice);
  saved.basket[0].status = 'ordered';
  expect(() => saveTilePlan(saved, 'main-floor-tiles', { ...measurement, areaM2: 8 }, { ...choice, name: 'Alternative tile' })).toThrow('marked ordered');
  expect(saved.basket[0].status).toBe('ordered');
  expect(saved.requirements.find((item) => item.id === 'main-floor-tiles')?.tilePlan?.choice?.name).toBe(choice.name);
});
