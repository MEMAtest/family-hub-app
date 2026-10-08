/** @jest-environment node */
jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  familyDocument: { findUnique: jest.fn(), updateMany: jest.fn() }, familyMember: { findFirst: jest.fn() },
} }));
jest.mock('@/lib/schoolIntakeServer', () => ({ loadSchoolRules: jest.fn() }));
import prisma from '@/lib/prisma';
import { sealGrandirToken, openGrandirToken, verifyGrandirParent, grandirStorageConfigured,
  loadGrandirSession, grandirStatus, disconnectGrandir } from '../grandirSession';

const identity = { loginId: 'parent', email: 'parent@example.com', roles2: [{ targetId: 'nursery-child',
  targetType: 'Famly.Daycare:Child', sourceType: 'Famly.Daycare:Relation', title: 'Askia', subtitle: 'Test nursery' }] };
const members = [{ id: 'askia', name: 'Askia', role: 'Child' }, { id: 'amari', name: 'Amari', role: 'Child' }];
const session = { schemaVersion: 1, enabled: true, sealedToken: 'encrypted', ownerMemberId: 'parent',
  parentEmail: identity.email, childMemberId: 'askia', providerChildId: 'nursery-child', nurseryName: 'Test nursery',
  connectedAt: '2026-10-07T12:00:00.000Z', expiresAt: '2026-11-06T12:00:00.000Z', lastSyncAt: null, lastError: null };
describe('private Grandir session', () => {
  const previous = process.env.GRANDIR_SESSION_ENCRYPTION_KEY;
  beforeEach(() => { jest.clearAllMocks(); process.env.GRANDIR_SESSION_ENCRYPTION_KEY = Buffer.alloc(32, 8).toString('base64');
    jest.useFakeTimers().setSystemTime(new Date('2026-10-07T12:00:00Z')); });
  afterEach(() => { jest.useRealTimers(); if (previous === undefined) delete process.env.GRANDIR_SESSION_ENCRYPTION_KEY;
    else process.env.GRANDIR_SESSION_ENCRYPTION_KEY = previous; });
  it('encrypts with fresh nonces and authenticates the household and ciphertext', () => {
    const first = sealGrandirToken('family', 'opaque-test-token');
    expect(first).not.toContain('opaque-test-token'); expect(first).not.toEqual(sealGrandirToken('family', 'opaque-test-token'));
    expect(openGrandirToken('family', first)).toBe('opaque-test-token');
    expect(() => openGrandirToken('other-family', first)).toThrow();
    const fields = first.split('.'); fields[3] = Buffer.alloc(16).toString('base64');
    expect(() => openGrandirToken('family', fields.join('.'))).toThrow();
  });
  it('fails closed without a correctly sized canonical encryption key', () => {
    delete process.env.GRANDIR_SESSION_ENCRYPTION_KEY;
    expect(grandirStorageConfigured()).toBe(false);
    expect(() => sealGrandirToken('family', 'test')).toThrow('not configured');
  });
  it('binds the verified parent and unique nursery child to the household source rule', () => {
    expect(verifyGrandirParent(identity, identity.email.toUpperCase(), members, ['askia'])).toEqual({
      childMemberId: 'askia', providerChildId: 'nursery-child', nurseryName: 'Test nursery' });
    expect(() => verifyGrandirParent(identity, 'someone@example.com', members, ['askia'])).toThrow('matching');
    expect(() => verifyGrandirParent({ ...identity, impersonated: true }, identity.email, members, ['askia'])).toThrow();
    expect(() => verifyGrandirParent(identity, identity.email, members, ['amari'])).toThrow('does not match');
    expect(() => verifyGrandirParent({ ...identity, roles2: [...identity.roles2, identity.roles2[0]] }, identity.email, members, ['askia'])).toThrow('single');
  });
  it('rejects malformed stored records instead of treating strings as enabled', async () => {
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: { ...session, enabled: 'false' } });
    expect((await loadGrandirSession('family')).session).toBeNull();
  });
  it('never exposes a token or ciphertext and keeps access until the provider revokes it', async () => {
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: session });
    (prisma.familyMember.findFirst as jest.Mock).mockResolvedValue({ name: 'Askia' });
    const status = await grandirStatus('family'); expect(status.connected).toBe(true);
    expect(JSON.stringify(status)).not.toContain(session.sealedToken);
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ data: { ...session, expiresAt: '2026-10-06T12:00:00.000Z' } });
    expect(await grandirStatus('family')).toMatchObject({ connected: true, needsReconnect: false });
  });
  it('drops the secret on disconnect and refuses a concurrent overwrite', async () => {
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue({ version: 2, data: session });
    (prisma.familyDocument.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    await disconnectGrandir('family', 'parent');
    expect(prisma.familyDocument.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { familyId: 'family', key: 'integrations.grandir.private-session', version: 2 },
      data: expect.objectContaining({ data: expect.objectContaining({ enabled: false, sealedToken: '' }) }) }));
    (prisma.familyDocument.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    await expect(disconnectGrandir('family', 'parent')).rejects.toThrow('changed');
  });
});
