/** @jest-environment node */
import { NextRequest, NextResponse } from 'next/server';
const mockAskVision = jest.fn();
let mockAllowed = true;
let mockConfigured = true;
let mockUserId = 'tile-reader';
jest.mock('@/lib/auth-utils', () => ({ requireAuth: (handler: any) => (request: any, context: any) => mockAllowed ? handler(request, context, { dbUser: { id: mockUserId } }) : Promise.resolve(NextResponse.json({}, { status: 401 })) }));
jest.mock('@/lib/visionAI', () => ({ ...jest.requireActual('@/lib/visionAI'), askVision: (...args: unknown[]) => mockAskVision(...args), visionConfigured: () => mockConfigured }));
import { POST } from '../route';
const result = { areaM2: 5, unit: 'm', sections: [], deductionsM2: null, wasteIncluded: 'unknown', evidence: 'Tile 5 m2 of floor tiles', warnings: ['Waste not stated'] };
const request = (fields: Record<string, string | Blob> = {}, origin = 'http://localhost') => {
  const form = new FormData();
  for (const [key, value] of Object.entries({ kind: 'measurement', roomId: 'main-bathroom', surface: 'floor', text: 'Tile 5m2 of floor tiles', consent: 'yes', ...fields })) form.append(key, value);
  return new NextRequest('http://localhost/api/property/tile-document', { method: 'POST', body: form, headers: { origin } });
};
beforeEach(() => { jest.clearAllMocks(); mockAllowed = true; mockConfigured = true; mockUserId = `user-${Math.random()}`; mockAskVision.mockResolvedValue(JSON.stringify(result)); });
test('authentication and same-origin checks precede provider calls', async () => {
  mockAllowed = false;
  expect((await POST(request(), undefined)).status).toBe(401);
  mockAllowed = true;
  expect((await POST(request({}, 'https://other.example'), undefined)).status).toBe(403);
  expect(mockAskVision).not.toHaveBeenCalled();
});
test('requires consent, a bounded document and explicit room/surface', async () => {
  const cases: Record<string, string>[] = [{ consent: 'no' }, { roomId: 'unknown' }, { surface: 'ceiling' }, { text: 'x'.repeat(6001) }, { text: '' }];
  for (const fields of cases) expect((await POST(request(fields), undefined)).status).toBe(400);
  expect(mockAskVision).not.toHaveBeenCalled();
});
test('returns an unconfirmed draft without inventing waste or writing project state', async () => {
  const response = await POST(request(), undefined);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ draft: result });
  expect(mockAskVision.mock.calls[0][0].system).toContain('REMOVED');
  expect(mockAskVision.mock.calls[0][0].prompt).toContain('only floor tiling measurements for Main Bathroom');
});
test('checks photo signatures and size before the provider', async () => {
  expect((await POST(request({ image: new File(['not an image'], 'bad.jpg', { type: 'image/jpeg' }) }), undefined)).status).toBe(400);
  expect((await POST(request({ image: new File([new Uint8Array(450001)], 'big.jpg', { type: 'image/jpeg' }) }), undefined)).status).toBe(400);
  expect(mockAskVision).not.toHaveBeenCalled();
});
test('valid photo bytes are passed only to the configured reader', async () => {
  const response = await POST(request({ image: new File([new Uint8Array([255, 216, 255, 217])], 'photo.jpg', { type: 'image/jpeg' }) }), undefined);
  expect(response.status).toBe(200);
  expect(mockAskVision.mock.calls[0][0].mimeType).toBe('image/jpeg');
});
test('provider unavailable and malformed results do not produce fake measurements', async () => {
  mockConfigured = false;
  expect((await POST(request(), undefined)).status).toBe(503);
  mockConfigured = true; mockAskVision.mockResolvedValue('{"areaM2":-5}');
  expect((await POST(request(), undefined)).status).toBe(502);
});
test('repeated reads are bounded per user within a warm process', async () => {
  for (let i = 0; i < 5; i++) expect((await POST(request(), undefined)).status).toBe(200);
  expect((await POST(request(), undefined)).status).toBe(429);
  expect(mockAskVision).toHaveBeenCalledTimes(5);
});
