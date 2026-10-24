jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyDocument: { findMany: jest.fn() } } }));
jest.mock('./storage', () => ({ isMissingTableError: () => false, storageUnavailable: jest.fn() }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number; headers?: unknown }) => ({ body, status: init?.status ?? 200, headers: init?.headers }) } }));

import { GET } from './route';
import prisma from '@/lib/prisma';

const context = { params: Promise.resolve({ familyId: 'home' }) };
const get = (versions?: unknown) => (GET as any)({ nextUrl: new URL(`http://localhost/?keys=property.profile,property.tasks${versions === undefined ? '' : `&versions=${encodeURIComponent(JSON.stringify(versions))}`}`) }, context);
const profile = { key: 'property.profile', data: { propertyName: 'Home' }, version: 3, updatedAt: new Date('2026-10-24') };

beforeEach(() => { jest.clearAllMocks(); });

test('legacy clients still receive full documents scoped to the authenticated household', async () => {
  (prisma.familyDocument.findMany as jest.Mock).mockResolvedValue([profile]);
  const result = await get();
  expect(result.status).toBe(200);
  expect(result.body.documents['property.profile'].data).toEqual(profile.data);
  expect(prisma.familyDocument.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.familyDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: 'home', key: { in: ['property.profile', 'property.tasks'] } } }));
  expect(result.headers['Cache-Control']).toBe('private, no-store');
});

test('unchanged documents read only metadata and never fetch JSON bodies from Postgres', async () => {
  (prisma.familyDocument.findMany as jest.Mock).mockResolvedValue([{ key: profile.key, version: 3 }, { key: 'property.tasks', version: 2 }]);
  const result = await get({ 'property.profile': 3, 'property.tasks': 2 });
  expect(result.body).toEqual({ documents: {}, unchangedVersions: { 'property.profile': 3, 'property.tasks': 2 } });
  expect(prisma.familyDocument.findMany).toHaveBeenCalledTimes(1);
  expect(prisma.familyDocument.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: { key: true, version: true } }));
});

test('only changed or missing keys enter the body query; missing keys are not declared unchanged', async () => {
  (prisma.familyDocument.findMany as jest.Mock).mockResolvedValueOnce([{ key: profile.key, version: 3 }]).mockResolvedValueOnce([]);
  const result = await get({ 'property.profile': 3, 'property.tasks': 2 });
  expect(result.body).toEqual({ documents: {}, unchangedVersions: { 'property.profile': 3 } });
  expect(prisma.familyDocument.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { familyId: 'home', key: { in: ['property.tasks'] } }, select: { key: true, data: true, version: true, updatedAt: true } }));
});

test('a newer server version returns its content for cross-device reconciliation', async () => {
  (prisma.familyDocument.findMany as jest.Mock).mockResolvedValueOnce([{ key: profile.key, version: 3 }, { key: 'property.tasks', version: 2 }]).mockResolvedValueOnce([profile]);
  const result = await get({ 'property.profile': 2, 'property.tasks': 2 });
  expect(result.body.documents['property.profile'].version).toBe(3);
  expect(result.body.unchangedVersions).toEqual({ 'property.tasks': 2 });
});

test.each([{ 'property.profile': '3' }, { 'property.profile': 0 }, { 'property.profile': 1.5 }, { 'money.planner.preferences': 1 }, null, ['property.profile']])('invalid versions are rejected without reading household data: %p', async versions => {
  expect((await get(versions)).status).toBe(400);
  expect(prisma.familyDocument.findMany).not.toHaveBeenCalled();
});

test('a failed metadata read is not represented as successful unchanged data', async () => {
  (prisma.familyDocument.findMany as jest.Mock).mockRejectedValue(new Error('unavailable'));
  expect((await get({ 'property.profile': 3 })).status).toBe(500);
});
