import {
  buildStewartFlemingGmailQuery,
  gmailForwardingAddress,
  isStewartFlemingSender,
} from '@/lib/gmailCalendarServer';
import {
  hasAuthenticatedStewartFlemingSender,
  isExpectedGmailAccount,
  isStewartFlemingSender as isStewartFlemingFromAddress,
} from '@/utils/schoolEmail';
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

describe('isStewartFlemingSender', () => {
  it('accepts addresses from the school domain in normal and display-name headers', () => {
    expect(isStewartFlemingSender('admin@stewartfleming.bromley.sch.uk')).toBe(true);
    expect(isStewartFlemingSender('Stewart Fleming <office@stewartfleming.bromley.sch.uk>')).toBe(true);
  });

  it('rejects lookalike domains and unrelated senders', () => {
    expect(isStewartFlemingSender('admin@stewartfleming.bromley.sch.uk.attacker.test')).toBe(false);
    expect(isStewartFlemingSender('Stewart Fleming <office@example.com>')).toBe(false);
  });
});

describe('buildStewartFlemingGmailQuery', () => {
  it('starts with a bounded 90-day school-only query and resumes with a small overlap', () => {
    expect(buildStewartFlemingGmailQuery()).toBe('from:stewartfleming.bromley.sch.uk newer_than:90d');
    expect(buildStewartFlemingGmailQuery(1_790_000_000_000))
      .toBe('from:stewartfleming.bromley.sch.uk newer_than:90d after:1789999999');
    expect(buildStewartFlemingGmailQuery(undefined, 1_790_000_000_999))
      .toBe('from:stewartfleming.bromley.sch.uk newer_than:90d before:1790000000');
  });
});

describe('hasAuthenticatedStewartFlemingSender', () => {
  it('requires Google-authenticated DMARC alignment with the school domain', () => {
    expect(hasAuthenticatedStewartFlemingSender([{
      name: 'Authentication-Results',
      value: 'mx.google.com; dkim=pass; spf=pass; dmarc=pass (p=reject) header.from=stewartfleming.bromley.sch.uk',
    }])).toBe(true);
    expect(hasAuthenticatedStewartFlemingSender([{
      name: 'Authentication-Results',
      value: 'mx.google.com; dkim=pass; dmarc=fail header.from=stewartfleming.bromley.sch.uk',
    }])).toBe(false);
    expect(hasAuthenticatedStewartFlemingSender([{
      name: 'Authentication-Results',
      value: 'attacker.example; dmarc=pass header.from=stewartfleming.bromley.sch.uk',
    }])).toBe(false);
    expect(hasAuthenticatedStewartFlemingSender([
      { name: 'Authentication-Results', value: 'mx.google.com; dmarc=fail header.from=stewartfleming.bromley.sch.uk' },
      { name: 'Authentication-Results', value: 'mx.google.com; dmarc=pass header.from=stewartfleming.bromley.sch.uk' },
    ])).toBe(false);
  });
});

describe('school sender parsing', () => {
  it('rejects a forged lookalike sender domain before reading message content', () => {
    expect(isStewartFlemingFromAddress('office@stewartfleming.bromley.sch.uk.attacker.example')).toBe(false);
  });
});

describe('configured Gmail account guard', () => {
  it('accepts the intended Google account case-insensitively and rejects a different account', () => {
    expect(isExpectedGmailAccount('AdemolaOmosanya@gmail.com', 'ademolaomosanya@gmail.com')).toBe(true);
    expect(isExpectedGmailAccount('edward@example.com', 'ademolaomosanya@gmail.com')).toBe(false);
    expect(isExpectedGmailAccount('anyone@example.com', '')).toBe(true);
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
    expect(url.searchParams.get('scope')).toBe('https://www.googleapis.com/auth/gmail.readonly');
  });
});
