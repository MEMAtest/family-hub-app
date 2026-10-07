jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { familyMember: { findFirst: jest.fn() }, $transaction: jest.fn() } }));
jest.mock('@/lib/grandirSession', () => ({ grandirStatus: jest.fn(), grandirStorageConfigured: jest.fn(), connectGrandirSession: jest.fn(), disconnectGrandir: jest.fn() }));
jest.mock('@/lib/grandirClient', () => ({ ...jest.requireActual('@/lib/grandirClient'), authenticateGrandir: jest.fn() }));
import prisma from '@/lib/prisma';
import { connectGrandirSession, grandirStorageConfigured, disconnectGrandir } from '@/lib/grandirSession';
import { authenticateGrandir } from '@/lib/grandirClient';
import { POST, DELETE } from './route';
const context = { params: Promise.resolve({ familyId: 'family' }) };
const auth = { familyMemberId: 'parent', dbUser: { email: 'parent@example.com' } };
const request = (body: unknown, origin = 'https://family-hub.test') => ({ nextUrl: { origin: 'https://family-hub.test' },
  headers: { get: (key: string) => key === 'origin' ? origin : 'application/json' }, text: async () => JSON.stringify(body) });
describe('Grandir connection access', () => {
  beforeEach(() => { jest.clearAllMocks(); (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ id: 'parent', role: 'Parent' });
    (grandirStorageConfigured as jest.Mock).mockReturnValue(true); (prisma.$transaction as jest.Mock).mockResolvedValue(true);
    (connectGrandirSession as jest.Mock).mockResolvedValue({ connected: true, childName: 'Askia' }); });
  it('rejects cross-origin writes before using credentials', async () => {
    expect((await (POST as any)(request({ consent: true, parentSession: 'test-token' }, 'https://evil.test'), context, auth)).status).toBe(403);
    expect(connectGrandirSession).not.toHaveBeenCalled();
  });
  it('requires explicit consent and exactly one authentication method', async () => {
    for (const body of [{ parentSession: 'test-token' }, { consent: false, parentSession: 'test-token' },
      { consent: true, parentSession: 'test-token', email: auth.dbUser.email, password: 'test' }]) {
      expect((await (POST as any)(request(body), context, auth)).status).toBe(400);
    }
    expect(connectGrandirSession).not.toHaveBeenCalled(); expect(authenticateGrandir).not.toHaveBeenCalled();
  });
  it('rejects child profiles and unconfigured secure storage', async () => {
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ role: 'Child' });
    expect((await (POST as any)(request({ consent: true, parentSession: 'test-token' }), context, auth)).status).toBe(403);
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ role: 'Parent' });
    (grandirStorageConfigured as jest.Mock).mockReturnValue(false);
    expect((await (POST as any)(request({ consent: true, parentSession: 'test-token' }), context, auth)).status).toBe(503);
    expect(connectGrandirSession).not.toHaveBeenCalled();
  });
  it('binds the connection to the signed-in parent, without accepting an arbitrary account', async () => {
    expect((await (POST as any)(request({ consent: true, email: 'other@example.com', password: 'test' }), context, auth)).status).toBe(400);
    expect((await (POST as any)(request({ consent: true, parentSession: 'test-token' }), context, auth)).status).toBe(200);
    expect(connectGrandirSession).toHaveBeenCalledWith('family', 'parent', 'parent@example.com', 'test-token');
  });
  it('applies the durable attempt limit before provider authentication', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue(false);
    expect((await (POST as any)(request({ consent: true, parentSession: 'test-token' }), context, auth)).status).toBe(429);
    expect(connectGrandirSession).not.toHaveBeenCalled();
  });
  it('prevents a child from disconnecting the parent session', async () => {
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ role: 'Child' });
    expect((await (DELETE as any)(request({}), context, auth)).status).toBe(403);
    expect(disconnectGrandir).not.toHaveBeenCalled();
  });
});
