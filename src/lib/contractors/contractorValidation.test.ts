/** @jest-environment node */

import { NextRequest } from 'next/server';
import {
  createContractorSchema,
  isSameOriginRequest,
  readBoundedJson,
  updateContractorSchema,
} from './contractorValidation';

const validContractor = {
  name: 'South London Roofing',
  specialty: 'roofer',
  website: 'https://roofing.example/',
  profile: {
    evidence: [{
      kind: 'website',
      title: 'Company website',
      url: 'https://roofing.example/',
      fetchedAt: '2026-10-16T10:00:00.000Z',
    }],
  },
};

test('accepts bounded contractor profiles with HTTPS evidence', () => {
  expect(createContractorSchema.parse(validContractor)).toMatchObject(validContractor);
});

test('accepts survey specialist trades and preserves linked survey actions', () => {
  const parsed = createContractorSchema.parse({
    ...validContractor,
    specialty: 'structural_engineer',
    profile: {
      ...validContractor.profile,
      taskIds: ['task-tremaine-05'],
    },
  });

  expect(parsed).toMatchObject({
    specialty: 'structural_engineer',
    profile: { taskIds: ['task-tremaine-05'] },
  });
});

test.each([
  ['javascript:alert(1)', 'website'],
  ['data:text/html,unsafe', 'imageUrl'],
])('rejects active-content URLs in %s', (url, field) => {
  expect(() => createContractorSchema.parse({ ...validContractor, [field]: url })).toThrow();
});

test('rejects unsafe nested evidence and oversized profile arrays', () => {
  expect(() => createContractorSchema.parse({
    ...validContractor,
    profile: { evidence: [{ ...validContractor.profile.evidence[0], url: 'javascript:alert(1)' }] },
  })).toThrow();
  expect(() => updateContractorSchema.parse({
    profile: { previousWork: Array.from({ length: 21 }, (_, index) => ({ title: String(index), url: 'https://example.com' })) },
  })).toThrow();
});

test('rejects unknown trade and workflow values', () => {
  expect(() => createContractorSchema.parse({ ...validContractor, specialty: 'administrator' })).toThrow();
  expect(() => updateContractorSchema.parse({ status: 'approved_without_review' })).toThrow();
});

test('bounds JSON bodies even when content-length is absent', async () => {
  const request = new NextRequest('https://family.example/api', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ notes: 'x'.repeat(200) }),
  });
  await expect(readBoundedJson(request, 100)).rejects.toThrow('too large');
});

test('checks browser origins using the deployment host', () => {
  const allowed = new NextRequest('https://family.example/api', {
    method: 'POST',
    headers: { origin: 'https://family.example', host: 'family.example' },
  });
  const blocked = new NextRequest('https://family.example/api', {
    method: 'POST',
    headers: { origin: 'https://attacker.example', host: 'family.example' },
  });
  expect(isSameOriginRequest(allowed)).toBe(true);
  expect(isSameOriginRequest(blocked)).toBe(false);
});
