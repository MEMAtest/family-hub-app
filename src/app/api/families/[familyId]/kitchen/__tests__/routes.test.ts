/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const askVision = jest.fn();
const findMany = jest.fn().mockResolvedValue([]);

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyMember: { findMany: (...args: unknown[]) => findMany(...args) } } }));

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
    expect(body.lines).toEqual([{ name: 'Loo roll', quantity: 1, usual: 'Toilet roll', units: null }]);
    expect(askVision.mock.calls[0][0].prompt).toContain('Toilet roll, Milk');
  });

  test('tells the model which usuals are counted, and in what unit', async () => {
    askVision.mockResolvedValue(JSON.stringify({ lines: [{ name: 'Andrex 9 pack', quantity: 1, usual: 'Toilet roll', units: 9 }] }));
    const { POST } = await import('../receipt/route');
    const res = await POST(upload({
      photo: jpeg(),
      usuals: JSON.stringify(['Toilet roll']),
      counted: JSON.stringify({ 'Toilet roll': 'roll', 'Not a usual': 'box' }),
    }), ctx);
    expect((await res.json()).lines[0]).toMatchObject({ usual: 'Toilet roll', units: 9 });
    const prompt = askVision.mock.calls[0][0].prompt;
    expect(prompt).toContain('Toilet roll (in rolls)');
    expect(prompt).not.toContain('Not a usual');
  });
});

describe('POST stock-note', () => {
  const json = (body: unknown) => new NextRequest('http://localhost/api/families/fam-1/kitchen/stock-note', {
    method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' },
  });
  const post = async (req: NextRequest) => {
    const { POST } = await import('../stock-note/route');
    const res = await POST(req, ctx);
    return { status: res.status, body: await res.json() };
  };

  test('sends the household ages (not names) and returns the reading', async () => {
    findMany.mockResolvedValue([{ role: 'Parent', ageGroup: 'Adult', dateOfBirth: null }, { role: 'Child', ageGroup: 'Toddler', dateOfBirth: null }]);
    askVision.mockResolvedValue(JSON.stringify({ items: [{ name: 'Toilet roll', usual: 'Toilet roll', status: 'count', quantity: 20, unit: 'roll', daysPerUnit: 2, rateSource: 'stated', category: 'household' }] }));
    const { status, body } = await post(json({ text: '20 toilet rolls, one lasts 2 days', usuals: ['Toilet roll'] }));
    expect(status).toBe(200);
    expect(body.items[0]).toMatchObject({ name: 'Toilet roll', quantity: 20, daysPerUnit: 2 });
    const request = askVision.mock.calls[0][0];
    expect(request.prompt).toContain('Household: 1 adult; 1 child aged toddler');
    expect(request.image).toBeUndefined();
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'fam-1' } }));
  });

  test('checks the note', async () => {
    expect((await post(json({ text: '' }))).status).toBe(400);
    expect((await post(json({ text: 'x'.repeat(1001) }))).status).toBe(400);
    expect(askVision).not.toHaveBeenCalled();
  });

  test('no AI key: says so', async () => {
    const { VisionUnavailableError } = jest.requireActual('@/lib/visionAI');
    askVision.mockRejectedValue(new VisionUnavailableError('no key'));
    const { status, body } = await post(json({ text: '20 rolls' }));
    expect(status).toBe(503);
    expect(body.unavailable).toBe(true);
  });

  test('an unreadable reply is an error, not made-up stock', async () => {
    askVision.mockResolvedValue('no idea');
    expect((await post(json({ text: '20 rolls' }))).status).toBe(502);
  });
});
