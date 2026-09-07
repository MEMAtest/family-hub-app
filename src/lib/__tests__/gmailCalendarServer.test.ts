import { gmailForwardingAddress } from '@/lib/gmailCalendarServer';

describe('gmailForwardingAddress', () => {
  it('creates a stable plus-address for a Gmail inbox', () => {
    expect(gmailForwardingAddress('ademolaomosanya@gmail.com')).toBe('ademolaomosanya+familyhub@gmail.com');
  });

  it('replaces an existing plus tag and rejects invalid addresses', () => {
    expect(gmailForwardingAddress('ademolaomosanya+school@gmail.com')).toBe('ademolaomosanya+familyhub@gmail.com');
    expect(gmailForwardingAddress('not-an-email')).toBeNull();
    expect(gmailForwardingAddress(null)).toBeNull();
  });
});
