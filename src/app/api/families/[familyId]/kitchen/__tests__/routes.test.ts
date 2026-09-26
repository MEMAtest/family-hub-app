/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const askVision = jest.fn();

jest.mock('@/lib/auth-utils', () => ({
  requireFamilyAccess: (handler: any) => (req: any, ctx: any) => handler(req, ctx, { familyId: 'fam-1', familyMemberId: 'mem-1' }),
}));
jest.mock('@/lib/visionAI', () => {
  const actual = jest.requireActual('@/lib/visionAI');
  return { ...actual, askVision: (...args: unknown[]) => askVision(...args) };
});

const upload = (fields: Record<string, Blob | string>) => {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => form.append(key, value));
  return new NextRequest('http://localhost/api/families/fam-1/kitchen/x', { method: 'POST', body: form });
};
const jpeg = (bytes = 10) => new File([new Uint8Array(bytes)], 'fridge.jpg', { type: 'image/jpeg' });
const ctx = { params: Promise.resolve({ familyId: 'fam-1' }) } as any;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('POST fridge-check', () => {
  const post = async (req: NextRequest) => {
    const { POST } = await import('../fridge-check/route');
    const res = await POST(req, ctx);
    return { status: res.status, body: await res.json() };
  };

  test('returns what the photo shows', async () => {
    askVision.mockResolvedValue(JSON.stringify({ summary: 's', items: [{ name: 'Milk', category: 'dairy', useSoon: false }], useFirst: [], mealIdeas: [] }));
    const { status, body } = await post(upload({ photo: jpeg() }));
    expect(status).toBe(200);
    expect(body.items).toEqual([{ name: 'Milk', category: 'dairy', useSoon: false }]);
    expect(askVision.mock.calls[0][0]).toMatchObject({ mimeType: 'image/jpeg' });
  });

  test('checks the upload', async () => {
    expect((await post(upload({}))).status).toBe(400);
    expect((await post(upload({ photo: new File(['x'], 'a.txt', { type: 'text/plain' }) }))).status).toBe(415);
    expect((await post(upload({ photo: jpeg(5 * 1024 * 1024 + 1) }))).status).toBe(413);
    expect(askVision).not.toHaveBeenCalled();
  });

  test('says plainly when no AI is set up, rather than making something up', async () => {
    const { VisionUnavailableError } = jest.requireActual('@/lib/visionAI');
    askVision.mockRejectedValue(new VisionUnavailableError('Reading photos needs an AI key'));
    const { status, body } = await post(upload({ photo: jpeg() }));
    expect(status).toBe(503);
    expect(body).toMatchObject({ unavailable: true });
  });

  test('a failed or unreadable reply is an error, not fake data', async () => {
    askVision.mockResolvedValue('I cannot help with that');
    const { status, body } = await post(upload({ photo: jpeg() }));
    expect(status).toBe(502);
    expect(body.items).toBeUndefined();
  });
});

describe('POST receipt', () => {
  test('passes the usuals to the model and maps its answer', async () => {
    askVision.mockResolvedValue(JSON.stringify({ store: 'Tesco', lines: [{ name: 'Loo roll', quantity: 1, usual: 'Toilet roll' }] }));
    const { POST } = await import('../receipt/route');
    const res = await POST(upload({ photo: jpeg(), usuals: JSON.stringify(['Toilet roll', 'Milk']) }), ctx);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.lines).toEqual([{ name: 'Loo roll', quantity: 1, usual: 'Toilet roll' }]);
    expect(askVision.mock.calls[0][0].prompt).toContain('Toilet roll, Milk');
  });
});
