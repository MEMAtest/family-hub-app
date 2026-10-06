/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
const mockRead = jest.fn(); const mockReadPublic = jest.fn(); let mockAllowed = true; let mockUser = '';
jest.mock('@/lib/auth-utils', () => ({ requireAuth: (handler: any) => (request: any, context: any) => mockAllowed ? handler(request, context, { dbUser: { id: mockUser } }) : Promise.resolve(NextResponse.json({}, { status: 401 })) }));
jest.mock('@/lib/sourcing/stonewaterImport', () => ({ ...jest.requireActual('@/lib/sourcing/stonewaterImport'), readStonewaterProduct: (...args: unknown[]) => mockRead(...args) }));
jest.mock('@/lib/sourcing/publicProductImport', () => ({ ...jest.requireActual('@/lib/sourcing/publicProductImport'), readPublicProduct: (...args: unknown[]) => mockReadPublic(...args) }));
import { POST } from '../route';
const url = 'https://www.stonewaterbathrooms.com/products/bath';
function request(body = JSON.stringify({ url }), origin = 'http://localhost') { return new NextRequest('http://localhost/api/property/sourcing/import', { method: 'POST', headers: { origin }, body }); }
beforeEach(() => { mockAllowed = true; mockUser = String(Math.random()); mockRead.mockReset().mockResolvedValue({ name: 'Bath' }); mockReadPublic.mockReset().mockResolvedValue({ name: 'Fan' }); });
test('requires auth and same origin before catalogue access', async () => {
  mockAllowed = false; expect((await POST(request(), undefined)).status).toBe(401);
  mockAllowed = true; expect((await POST(request(undefined, 'https://other.test'), undefined)).status).toBe(403); expect(mockRead).not.toHaveBeenCalled();
});
test('rejects large or unsafe bodies without fetching', async () => {
  for (const body of ['x'.repeat(2001), '{bad', JSON.stringify({ url: 'https://127.0.0.1/products/a' })]) expect((await POST(request(body), undefined)).status).toBe(400);
  expect(mockRead).not.toHaveBeenCalled();
});
test('returns a private draft, does not save or order, and bounds repeated requests', async () => {
  const response = await POST(request(), undefined); expect(response.status).toBe(200); expect(await response.json()).toEqual({ draft: { name: 'Bath' } }); expect(response.headers.get('cache-control')).toBe('private, no-store');
  for (let i = 0; i < 9; i++) expect((await POST(request(), undefined)).status).toBe(200);
  expect((await POST(request(), undefined)).status).toBe(429);
});
test('supplier failure leaves manual entry available', async () => { mockRead.mockRejectedValue(new Error('offline')); expect((await POST(request(), undefined)).status).toBe(400); });
test('imports non-Stonewater public HTTPS product pages', async () => {
  const response = await POST(request(JSON.stringify({ url: 'https://shop.example.com/fan' })), undefined);
  expect(response.status).toBe(200); expect(await response.json()).toEqual({ draft: { name: 'Fan' } }); expect(mockReadPublic).toHaveBeenCalledWith('https://shop.example.com/fan');
});
