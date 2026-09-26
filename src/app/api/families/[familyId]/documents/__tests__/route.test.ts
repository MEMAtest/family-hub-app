/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const db = {
  findMany: jest.fn(),
  create: jest.fn(),
  updateMany: jest.fn(),
  findUnique: jest.fn(),
};

jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyDocument: db } }));
jest.mock('@prisma/client', () => ({ Prisma: {} }));
jest.mock('@/lib/auth-utils', () => ({
  requireFamilyAccess: (handler: any) => (req: any, ctx: any) =>
    handler(req, ctx, { familyId: 'fam-1', familyMemberId: 'mem-1' }),
}));

const params = (p: Record<string, string>) => ({ params: Promise.resolve(p) }) as any;

const put = async (key: string, body: unknown) => {
  const { PUT } = await import('../[key]/route');
  const req = new NextRequest(`http://localhost/api/families/fam-1/documents/${key}`, {
    method: 'PUT',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
  const res = await PUT(req, params({ familyId: 'fam-1', key }));
  return { status: res.status, body: await res.json() };
};

const get = async (query: string) => {
  const { GET } = await import('../route');
  const res = await GET(new NextRequest(`http://localhost/api/families/fam-1/documents?${query}`), params({ familyId: 'fam-1' }));
  return { status: res.status, body: await res.json() };
};

const missingTable = Object.assign(new Error('table does not exist'), { code: 'P2021' });

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'error').mockImplementation(() => undefined);
});

describe('GET documents', () => {
  test('returns only known keys for this family', async () => {
    db.findMany.mockResolvedValue([{ key: 'property.issues', data: [{ id: 'x' }], version: 3, updatedAt: new Date('2026-09-26T10:00:00Z') }]);
    const { status, body } = await get('keys=property.issues,not.a.key');
    expect(status).toBe(200);
    expect(db.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'fam-1', key: { in: ['property.issues'] } } }));
    expect(body.documents['property.issues']).toMatchObject({ version: 3, data: [{ id: 'x' }] });
  });

  test('says shared storage is not set up when the table is missing', async () => {
    db.findMany.mockRejectedValue(missingTable);
    const { status, body } = await get('keys=property.issues');
    expect(status).toBe(503);
    expect(body.unavailable).toBe(true);
  });
});

describe('PUT document', () => {
  test('creates the first version', async () => {
    db.create.mockResolvedValue({ version: 1, updatedAt: new Date() });
    const { status, body } = await put('property.issues', { data: [{ id: 'a' }], baseVersion: 0 });
    expect(status).toBe(201);
    expect(body.version).toBe(1);
    expect(db.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ familyId: 'fam-1', key: 'property.issues', updatedBy: 'mem-1' }) }));
  });

  test('updates when the base version matches', async () => {
    db.updateMany.mockResolvedValue({ count: 1 });
    db.findUnique.mockResolvedValue({ version: 5, updatedAt: new Date() });
    const { status, body } = await put('property.issues', { data: [{ id: 'a' }], baseVersion: 4 });
    expect(status).toBe(200);
    expect(body.version).toBe(5);
    expect(db.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'fam-1', key: 'property.issues', version: 4 } }));
  });

  test('refuses a stale write and returns the current copy to merge', async () => {
    db.updateMany.mockResolvedValue({ count: 0 });
    db.findUnique.mockResolvedValue({ data: [{ id: 'theirs' }], version: 7, updatedAt: new Date() });
    const { status, body } = await put('property.issues', { data: [{ id: 'mine' }], baseVersion: 4 });
    expect(status).toBe(409);
    expect(body.current).toMatchObject({ version: 7, data: [{ id: 'theirs' }] });
  });

  test('a second device creating at the same time gets a conflict, not an error', async () => {
    db.create.mockRejectedValue(Object.assign(new Error('unique'), { code: 'P2002' }));
    db.findUnique.mockResolvedValue({ data: [{ id: 'first' }], version: 1, updatedAt: new Date() });
    const { status } = await put('property.issues', { data: [{ id: 'second' }], baseVersion: 0 });
    expect(status).toBe(409);
  });

  test('validates the key and shape', async () => {
    expect((await put('secrets', { data: {}, baseVersion: 0 })).status).toBe(404);
    expect((await put('property.issues', { data: { not: 'a list' }, baseVersion: 0 })).status).toBe(400);
    expect((await put('property.issues', { data: [{ noId: true }], baseVersion: 0 })).status).toBe(400);
    expect((await put('property.profile', { data: [], baseVersion: 0 })).status).toBe(400);
    expect((await put('property.issues', { data: [], baseVersion: -1 })).status).toBe(400);
    expect((await put('property.issues', 'not json')).status).toBe(400);
    expect(db.create).not.toHaveBeenCalled();
  });

  test('rejects oversized documents', async () => {
    const big = [{ id: 'a', blob: 'x'.repeat(3_100_000) }];
    expect((await put('property.projects', { data: big, baseVersion: 0 })).status).toBe(413);
  });

  test('says shared storage is not set up when the table is missing', async () => {
    db.updateMany.mockRejectedValue(missingTable);
    expect((await put('property.issues', { data: [], baseVersion: 2 })).status).toBe(503);
  });
});
