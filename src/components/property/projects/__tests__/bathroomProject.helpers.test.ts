import type { ProjectSourcing, SourcedProduct, SourcingRequirement } from '@/types/sourcing.types';
import { basketTotal, isBathroomProject, leadingRequirementOption, productLineCost, productSize, quoteSizeAssessment, quoteSizeCheck, requirementSelection, roomName } from '../bathroomProject.helpers';
import { fixtureFit } from '@/lib/sourcing/fixtureFit';

const requirement: SourcingRequirement = {
  id: 'vanity', roomId: 'main-bathroom', name: 'Vanity', category: 'Furniture', specification: 'Vanity and basin',
  size: '600mm wide', quantity: 2, status: 'confirmed', constraints: { maxWidthMm: 600 }, requiredComponents: ['vanity', 'basin'],
};
const product: SourcedProduct = {
  id: 'real-vanity', name: 'Supplier vanity', supplier: 'Supplier', url: 'https://example.com/vanity', imageUrl: '', price: 120,
  requirementIds: [requirement.id], stock: 'UNKNOWN', stockEvidence: 'Check stock', dimensions: {}, components: ['vanity'], lastChecked: '',
};
const sourcing: ProjectSourcing = {
  requirements: [requirement, { ...requirement, id: 'shower-vanity', roomId: 'shower-room' }], products: [product],
  basket: [{ id: 'selected', requirementId: requirement.id, productId: product.id, quantity: 3, status: 'review' }],
};

test('the toilet fixture ranks ahead of a top-picked supporting cistern', () => {
  const toilet = { ...requirement, requiredComponents: ['toilet-pan', 'cistern'] };
  const cistern = { ...product, id: 'cistern', components: ['cistern'], topPick: true };
  const pan = { ...product, id: 'pan', components: ['toilet-pan'], topPick: false };
  expect(leadingRequirementOption([cistern, pan], toilet)).toBe(pan);
  expect(leadingRequirementOption([cistern], toilet)).toBeUndefined();
});

test('top pick breaks ties only among fixture candidates; tiles keep their top pick', () => {
  const preferred = { ...product, id: 'preferred', topPick: true };
  expect(leadingRequirementOption([product, preferred], requirement)).toBe(preferred);
  expect(leadingRequirementOption([product, preferred], { ...requirement, requiredComponents: [] })).toBe(preferred);
});

test('real room names and size notes use optional metadata without renaming legacy rooms', () => {
  expect(roomName(undefined, 'main-bathroom')).toBe('Main Bathroom');
  expect(roomName(sourcing, 'shower-room')).toBe('Shower Room');
  expect(roomName({ ...sourcing, rooms: { 'main-bathroom': { name: ' Family Bathroom ', sizeNotes: 'Measure door clearance' } } }, 'main-bathroom')).toBe('Family Bathroom');
  expect(roomName({ ...sourcing, rooms: { 'shower-room': { name: ' ' } } }, 'shower-room')).toBe('Shower Room');
});

test('bathroom default is restricted to bathroom or shower projects', () => {
  expect(isBathroomProject({ title: 'Renovation', category: 'bathroom' })).toBe(true);
  expect(isBathroomProject({ title: 'Shower upgrade', category: 'Other' })).toBe(true);
  expect(isBathroomProject({ title: 'Kitchen', category: 'kitchen' })).toBe(false);
});

test('fixture totals use actual basket quantities, not quote quantities or one unit', () => {
  expect(productLineCost(product, 2)).toBe(240);
  expect(basketTotal(sourcing)).toBe(360);
  expect(basketTotal(sourcing, 'main-bathroom')).toBe(360);
  expect(basketTotal(sourcing, 'shower-room')).toBe(0);
});

test('tile area prices use the edited area; box and single-tile prices remain excluded', () => {
  expect(productLineCost({ ...product, priceUnit: 'per m²' }, 5.5)).toBe(660);
  expect(productLineCost({ ...product, priceUnit: 'per box' }, 8)).toBe(0);
  expect(productLineCost({ ...product, priceUnit: 'per tile' }, 10)).toBe(0);
  expect(basketTotal({ ...sourcing, products: [{ ...product, priceUnit: 'per box' }] })).toBe(0);
});

test.each([0, -1, NaN, Infinity])('invalid quantity %s cannot add a misleading cost', (quantity) => {
  expect(productLineCost(product, quantity)).toBe(0);
});

test('orphaned basket products do not invent a price or selection', () => {
  const orphaned = { ...sourcing, products: [] };
  expect(basketTotal(orphaned)).toBe(0);
  expect(requirementSelection(orphaned, requirement)).toMatchObject({ selected: [], complete: false });
});

test('selection completeness is based on required parts, not simply having one basket item', () => {
  expect(requirementSelection(sourcing, requirement)).toMatchObject({ missing: ['basin'], complete: false });
  const basin = { ...product, id: 'basin', components: ['basin'] };
  const complete = { ...sourcing, products: [product, basin], basket: [...sourcing.basket, { ...sourcing.basket[0], id: 'b2', productId: basin.id }] };
  expect(requirementSelection(complete, requirement)).toMatchObject({ missing: [], complete: true });
});

test('a tile requirement without components still requires a real selection', () => {
  const tile = { ...requirement, requiredComponents: [] };
  expect(requirementSelection({ ...sourcing, basket: [] }, tile).complete).toBe(false);
  expect(requirementSelection(sourcing, tile).complete).toBe(true);
});

test('quote-size checks never infer a room fit from supplier marketing or room names', () => {
  expect(quoteSizeCheck(requirement, { ...product, size: 'Compact, ideal for a small room' })).toBe('Supplier dimensions missing · quote comparison incomplete');
  expect(quoteSizeCheck({ ...requirement, constraints: {} }, product)).toBe('Supplier dimensions missing · quote comparison incomplete');
  expect(quoteSizeCheck(undefined, product)).toBe('No quote dimensions to compare');
});

test('known supplier specs compare against quote limits and retain measurement caution', () => {
  expect(quoteSizeCheck(requirement, { ...product, specs: { Width: '600mm' } })).toBe('Within checked quote sizes · Confirm room measurements');
  expect(quoteSizeCheck(requirement, { ...product, dimensions: { widthMm: 650 } })).toBe('Different from quote · Check measurements');
  expect(quoteSizeCheck(requirement, { ...product, specs: { Width: '60cm' } })).toBe('Supplier dimensions missing · quote comparison incomplete');
});

test('unknown dimensions remain unknown even when one constraint is met', () => {
  expect(quoteSizeCheck({ ...requirement, constraints: { maxWidthMm: 600, depthMm: 400 } }, { ...product, dimensions: { widthMm: 600 } })).toBe('Supplier dimensions missing · quote comparison incomplete');
});

test('exact sizes and explicit tile tolerance are respected', () => {
  const tile = { ...requirement, constraints: { widthMm: 596, lengthMm: 596, tileToleranceMm: 1 } };
  expect(quoteSizeCheck(tile, { ...product, dimensions: { widthMm: 595, lengthMm: 595 } })).toBe('Within checked quote sizes · Confirm room measurements');
  expect(quoteSizeCheck(tile, { ...product, dimensions: { widthMm: 600, lengthMm: 600 } })).toBe('Different from quote · Check measurements');
});
test('labelled quote dimensions compare automatically even without preloaded constraints', () => {
  expect(quoteSizeCheck({ ...requirement, constraints: {}, size: '500mm wide' }, { ...product, dimensions: { widthMm: 500 } })).toContain('Within checked quote sizes');
  expect(quoteSizeCheck({ ...requirement, constraints: {}, size: '500mm wide' }, { ...product, dimensions: { widthMm: 600 } })).toContain('Different from quote');
  expect(quoteSizeCheck({ ...requirement, constraints: {}, size: '500 × 1000mm' }, product)).toBe('No quote dimensions to compare');
});
test('supporting parts do not get compared against the main fixture dimensions', () => {
  expect(quoteSizeCheck(requirement, { ...product, components: ['basin'], dimensions: { widthMm: 650 } })).toBe('Supporting part · compatibility not confirmed');
});

test('size presentation preserves supplier size or labelled specs and identifies unknowns', () => {
  expect(productSize({ ...product, size: '600W x 445D mm' })).toBe('600W x 445D mm');
  expect(productSize({ ...product, specs: { Width: '600mm', Finish: 'White' } })).toBe('Width: 600mm');
  expect(productSize({ ...product, dimensions: { widthMm: 400 } })).toBe('width: 400mm');
  expect(productSize(product)).toBe('Size not stated');
});

test('Sophia vanity title supplies a bounded quote-width inference, never a confirmed room fit', () => {
  const sophia = { ...product, name: 'Sophia 600mm Wall Hung Vanity Unit with Basin' };
  expect(quoteSizeAssessment(requirement, sophia)).toMatchObject({ status: 'within', label: expect.stringContaining('Width inferred from vanity title') });
  expect(quoteSizeCheck(requirement, sophia)).toContain('confirm supplier and room measurements');
  expect(productSize(sophia)).toBe('600mm in supplier title; confirm dimension axis');
  expect(fixtureFit(requirement, sophia).status).toBe('unknown');
  expect(fixtureFit({ ...requirement, fitSpace: { widthMm: 650, depthMm: 500, clearanceMm: 0, source: 'Measured room', confirmedAt: '2026-10-07T10:00:00.000Z' } }, sophia).status).toBe('unknown');
  expect(sophia.dimensions).toEqual({});
  expect(quoteSizeAssessment({ ...requirement, constraints: { maxWidthMm: 600, depthMm: 400 } }, sophia).status).toBe('unknown');
  expect(quoteSizeAssessment(requirement, { ...sophia, dimensions: { widthMm: 650 } }).status).toBe('different');
});

test.each([
  'Sophia 600mm High Vanity Unit with Basin',
  'Sophia 600 x 450mm Wall Hung Vanity Unit with Basin',
  'Sophia 600mm Wall Hung Vanity Unit with Basin 800mm high',
  '600mm Basin Mixer',
  '600mm Tall Cabinet',
])('unlabelled sizes outside the narrow vanity pattern remain unknown: %s', (name) => {
  expect(quoteSizeAssessment(requirement, { ...product, name }).status).toBe('unknown');
});

test('supplier-labelled title width compares without inventing room dimensions', () => {
  const labelled = { ...product, name: 'Sophia Vanity Unit 600mm wide' };
  expect(quoteSizeAssessment(requirement, labelled).status).toBe('within');
  expect(fixtureFit(requirement, labelled).status).toBe('unknown');
});
