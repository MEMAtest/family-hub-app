jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: { gmailConnection: { findUnique: jest.fn() } },
}));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      status: init?.status || 200,
      json: async () => body,
    }),
  },
}));
jest.mock('@/lib/cronAuth', () => ({ isAuthorisedCronRequest: jest.fn(() => true) }));
jest.mock('@/lib/gmailCalendarServer', () => ({ syncStewartFlemingGmail: jest.fn() }));

import prisma from '@/lib/prisma';
import { syncStewartFlemingGmail } from '@/lib/gmailCalendarServer';
import { GET } from './route';

const cronRequest = () => ({
  url: 'https://family-hub-app.vercel.app/api/cron/family-communications',
  headers: { get: jest.fn(() => null) },
}) as any;

describe('family communications cron', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CALENDAR_INBOUND_FAMILY_ID = 'family-id';
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not report success when Gmail is not connected', async () => {
    (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({ enabled: false });

    const response = await GET(cronRequest());
    const payload = await response.json();

    expect(payload.ok).toBe(false);
    expect(payload.emailSync.skipped).toMatch(/Gmail is not connected/);
    expect(response.status).toBe(503);
    expect(syncStewartFlemingGmail).not.toHaveBeenCalled();
  });

  it('runs only the scheduled Gmail sync and leaves WhatsApp to its own cron route', async () => {
    (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({ enabled: true });
    (syncStewartFlemingGmail as jest.Mock).mockResolvedValue({ processed: 2, autoCreated: 1, needsReview: 1, errors: [] });

    const response = await GET(cronRequest());
    const payload = await response.json();

    expect(payload.emailSync).toMatchObject({ processed: 2, autoCreated: 1, needsReview: 1 });
    expect(payload.ok).toBe(true);
    expect(payload).not.toHaveProperty('whatsapp');
    expect(syncStewartFlemingGmail).toHaveBeenCalledWith('family-id');
    expect(response.status).toBe(200);
  });
});
