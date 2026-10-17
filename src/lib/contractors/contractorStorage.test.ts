/** @jest-environment node */

import { contractorResponse, readContractorMetadata, writeContractorMetadata } from './contractorStorage';

const contractor = {
  id: 'contractor-1',
  familyId: 'family-1',
  name: 'Acme Roofing',
  company: 'Acme Roofing Ltd',
  phone: null,
  email: null,
  address: null,
  specialty: 'roofer',
  notes: null,
  rating: null,
  createdAt: new Date('2026-10-16T08:00:00Z'),
  updatedAt: new Date('2026-10-16T08:00:00Z'),
};

test('preserves legacy plain-text contractor notes', () => {
  expect(readContractorMetadata('Call after 6pm')).toEqual({ notes: 'Call after 6pm' });
  expect(contractorResponse({ ...contractor, notes: 'Call after 6pm' })).toMatchObject({
    notes: 'Call after 6pm',
    status: 'candidate',
  });
});

test('round trips extended contractor data through the existing notes column', () => {
  const stored = writeContractorMetadata({
    notes: 'Recommended by a neighbour',
    website: 'https://acme.example',
    status: 'shortlisted',
    profile: {
      projectIds: ['project-1'],
      taskIds: ['task-tremaine-05'],
      checks: { identity: 'confirmed' },
    },
  });
  expect(stored).toContain('__family_hub_contractor_v2__:');
  expect(contractorResponse({ ...contractor, notes: stored })).toMatchObject({
    notes: 'Recommended by a neighbour',
    website: 'https://acme.example',
    status: 'shortlisted',
    profile: {
      projectIds: ['project-1'],
      taskIds: ['task-tremaine-05'],
      checks: { identity: 'confirmed' },
    },
  });
});

test('does not discard malformed legacy notes', () => {
  const malformed = '__family_hub_contractor_v2__:{bad json';
  expect(readContractorMetadata(malformed)).toEqual({ notes: malformed });
});
