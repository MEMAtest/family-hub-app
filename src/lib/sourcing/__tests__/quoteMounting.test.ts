import { quoteMountingAssessment } from '../quoteSize';
import { createBathroomSourcingSeed } from '../seed';

const seed = createBathroomSourcingSeed();
const requirement = seed.requirements.find((entry) => entry.id === 'main-bath-filler')!;
const filler = { ...seed.products[0], name: 'Fairford Una Bath Filler', components: [], specs: {}, description: 'Designed for deck mounting, with installation components.' };

test('deck filler remains selected but has an explicit wall mounting quote difference', () => {
  expect(quoteMountingAssessment(requirement, filler)).toMatchObject({ status: 'different', label: expect.stringContaining('deck-mounted filler selected; quote asks for wall-mounted') });
});

test('missing or ambiguous mounting is not reported as a match', () => {
  expect(quoteMountingAssessment(requirement, { ...filler, description: '' })?.status).toBe('unknown');
  expect(quoteMountingAssessment(requirement, { ...filler, description: 'Wall-mounted and deck-mounted options' })?.status).toBe('unknown');
});

test('matching mount is distinct from plumbing and room fit', () => {
  expect(quoteMountingAssessment(requirement, { ...filler, description: 'Wall-mounted bath filler' })).toMatchObject({ status: 'within', label: expect.stringContaining('plumbing fit not confirmed') });
  expect(quoteMountingAssessment(undefined, filler)).toBeUndefined();
});
