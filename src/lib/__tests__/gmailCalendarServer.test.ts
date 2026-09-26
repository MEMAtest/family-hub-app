import { gmailForwardingAddress } from '@/lib/gmailCalendarServer';
import { getGmailAuthUrl } from '@/lib/googleCalendarServer';

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

describe('getGmailAuthUrl', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('forces the configured Gmail account and production callback', () => {
    process.env.GOOGLE_CLIENT_ID = 'test-client-id';
    process.env.GOOGLE_GMAIL_ACCOUNT = 'AdemolaOmosanya@gmail.com';
    process.env.GOOGLE_REDIRECT_URI = 'https://family-hub-app.vercel.app/api/google-calendar/callback';

    const url = new URL(getGmailAuthUrl('family-id'));

    expect(url.searchParams.get('login_hint')).toBe('ademolaomosanya@gmail.com');
    expect(url.searchParams.get('prompt')).toBe('select_account consent');
    expect(url.searchParams.get('redirect_uri')).toBe('https://family-hub-app.vercel.app/api/google-calendar/callback');
    expect(url.searchParams.get('scope')).toContain('https://www.googleapis.com/auth/gmail.readonly');
  });
});
