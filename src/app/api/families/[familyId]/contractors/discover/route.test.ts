/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';

let allowed = true;
const discover = jest.fn();
jest.mock('@/lib/auth-utils', () => ({
  requireFamilyAccess: (handler: any) => (request: any, context: any) => allowed
    ? handler(request, context, { dbUser: { id: 'user-1' } })
    : Promise.resolve(NextResponse.json({}, { status: 401 })),
}));
jest.mock('@/lib/contractors/businessDiscovery', () => ({ discoverBusinesses: (...args: unknown[]) => discover(...args) }));

import { POST } from './route';

const request = (body: unknown, origin = 'http://localhost') => new NextRequest('http://localhost/api/families/family-1/contractors/discover', {
  method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body),
});

beforeEach(() => {
  allowed = true;
  discover.mockReset().mockResolvedValue({ candidates: [{ candidateId: 'one', name: 'Acme' }], providers: { companiesHouse: 'ok' } });
});

test('requires household access and same-origin requests', async () => {
  allowed = false;
  expect((await POST(request({ query: 'Acme' }), { params: Promise.resolve({ familyId: 'family-1' }) })).status).toBe(401);
  allowed = true;
  expect((await POST(request({ query: 'Acme' }, 'https://other.test'), { params: Promise.resolve({ familyId: 'family-1' }) })).status).toBe(403);
  expect(discover).not.toHaveBeenCalled();
});

test('searches by name and returns private uncached candidates', async () => {
  const response = await POST(request({ query: 'Acme Roofing', location: 'SE20', specialty: 'roofer' }), { params: Promise.resolve({ familyId: 'family-1' }) });
  expect(response.status).toBe(200);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
  expect(discover).toHaveBeenCalledWith({ query: 'Acme Roofing', location: 'SE20', specialty: 'roofer' });
});

test('accepts a public link but rejects empty or malformed searches', async () => {
  expect((await POST(request({ url: 'https://example.com/trade' }), { params: Promise.resolve({ familyId: 'family-1' }) })).status).toBe(200);
  expect((await POST(request({}), { params: Promise.resolve({ familyId: 'family-1' }) })).status).toBe(400);
  expect((await POST(request({ url: 'not-a-link' }), { params: Promise.resolve({ familyId: 'family-1' }) })).status).toBe(400);
});
