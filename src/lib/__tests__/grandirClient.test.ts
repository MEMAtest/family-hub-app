/** @jest-environment node */
import { authenticateGrandir, readGrandirFeed, readGrandirIdentity, grandirPostUrl } from '../grandirClient';
const originalFetch = global.fetch;
describe('read-only Grandir transport', () => {
  beforeEach(() => { global.fetch = jest.fn(); });
  afterEach(() => { global.fetch = originalFetch; });
  const respond = (value: unknown, status = 200) => (global.fetch as jest.Mock).mockResolvedValue(new Response(JSON.stringify(value), { status }));
  it('uses the fixed official origin without following token-bearing redirects', async () => {
    respond({ loginId: 'parent', email: 'parent@example.com', roles2: [], password: 'discard-me' });
    expect(await readGrandirIdentity('opaque-test-session')).not.toHaveProperty('password');
    expect(global.fetch).toHaveBeenCalledWith(new URL('https://www.app.grandiruk.com/api/me/me/me'), expect.objectContaining({
      method: 'GET', redirect: 'error', cache: 'no-store', headers: expect.objectContaining({ 'x-famly-accesstoken': 'opaque-test-session' }) }));
  });
  it('strips comments, likes and photos from the returned notices', async () => {
    respond({ feedItems: [{ feedItemId: 'post-1', body: 'Nursery update', createdDate: '2026-10-07', generated: false,
      sender: { name: 'Nursery' }, comments: [{ private: true }], images: [{ child: 'other' }], likes: ['parent'] }] });
    const [notice] = await readGrandirFeed('test');
    expect(notice).not.toHaveProperty('comments'); expect(notice).not.toHaveProperty('images'); expect(notice).not.toHaveProperty('likes');
  });
  it('returns only a safe reconnect error on revoked access, never the provider body', async () => {
    respond({ secret: 'provider-private-detail' }, 401);
    await expect(readGrandirIdentity('test')).rejects.toMatchObject({ code: 'RECONNECT_REQUIRED' });
  });
  it('rejects bad schemas and excessive response sizes', async () => {
    respond({ feedItems: [{ body: 'missing provider identity' }] });
    await expect(readGrandirFeed('test')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
    respond({ body: 'a'.repeat(2_000_001) });
    await expect(readGrandirFeed('test')).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE' });
  });
  it('honours the official authentication challenge without bypassing verification', async () => {
    respond({ data: { me: { authenticateWithPassword: { __typename: 'AuthenticationChallenged' } } } });
    await expect(authenticateGrandir('parent@example.com', 'test-password')).rejects.toMatchObject({ code: 'VERIFICATION_REQUIRED' });
    respond({ data: { me: { authenticateWithPassword: { __typename: 'AuthenticationSucceeded', accessToken: 'test-token' } } } });
    expect(await authenticateGrandir('parent@example.com', 'test-password')).toBe('test-token');
  });
  it('only builds validated portal links', () => {
    expect(grandirPostUrl('post-1')).toBe('https://www.app.grandiruk.com/#/account/post/post-1');
    expect(() => grandirPostUrl('../../evil?token=x')).toThrow();
  });
});
