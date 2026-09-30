jest.mock('googleapis', () => ({
  __esModule: true,
  google: { gmail: jest.fn() },
  gmail_v1: {},
}));

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    gmailConnection: { findUnique: jest.fn(), update: jest.fn() },
    calendarEmailIntake: { findFirst: jest.fn(), update: jest.fn() },
    notification: { findUnique: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
  },
}));

jest.mock('@/lib/googleCalendarServer', () => ({ createOAuthClient: jest.fn() }));
jest.mock('@/lib/calendarEmailIngestion', () => ({ ingestCalendarEmailPayload: jest.fn() }));

import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import { createOAuthClient } from '@/lib/googleCalendarServer';
import { ingestCalendarEmailPayload } from '@/lib/calendarEmailIngestion';
import { syncStewartFlemingGmail } from '@/lib/gmailCalendarServer';

const connection = {
  familyId: 'family-id',
  enabled: true,
  googleUserEmail: 'ademolaomosanya@gmail.com',
  accessToken: 'access-token',
  refreshToken: 'refresh-token',
  expiryDate: null,
  tokenType: 'Bearer',
  scope: 'https://www.googleapis.com/auth/gmail.readonly',
  lastSyncAt: null,
};

const gmailMessage = (id: string, authResult: string) => ({
  internalDate: id === 'trusted' ? '1790000000000' : '1789999990000',
  payload: {
    headers: [
      { name: 'From', value: 'Stewart Fleming <admin@stewartfleming.bromley.sch.uk>' },
      { name: 'To', value: 'ademolaomosanya@gmail.com' },
      { name: 'Message-ID', value: `<${id}@school.example>` },
      { name: 'Subject', value: 'School newsletter' },
      { name: 'Authentication-Results', value: authResult },
    ],
    mimeType: 'text/plain',
    body: { data: Buffer.from('Trip on October 2 at 9am').toString('base64url') },
  },
  snippet: 'Trip on October 2 at 9am',
});

describe('Stewart Fleming Gmail polling', () => {
  const originalEnv = { ...process.env };
  const oauth = { setCredentials: jest.fn(), refreshAccessToken: jest.fn() };
  const gmail = {
    users: {
      getProfile: jest.fn(),
      messages: { list: jest.fn(), get: jest.fn(), attachments: { get: jest.fn() } },
    },
  };

  beforeEach(() => {
    process.env = { ...originalEnv, GOOGLE_GMAIL_ACCOUNT: 'ademolaomosanya@gmail.com' };
    jest.clearAllMocks();
    (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue(connection);
    (prisma.gmailConnection.update as jest.Mock).mockResolvedValue(connection);
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'gmail-school-cursor-family-id' });
    (createOAuthClient as jest.Mock).mockReturnValue(oauth);
    (google.gmail as jest.Mock).mockReturnValue(gmail);
    (ingestCalendarEmailPayload as jest.Mock).mockResolvedValue({
      statusCode: 200,
      body: { autoCreated: 1, needsReview: 0 },
    });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('handles one bounded page per run and resumes pagination without importing unauthenticated mail', async () => {
    gmail.users.messages.list
      .mockResolvedValueOnce({ data: { messages: [{ id: 'trusted' }], nextPageToken: 'page-2' } })
      .mockResolvedValueOnce({ data: { messages: [{ id: 'forged' }] } });
    let cursorMetadata: Record<string, unknown> | null = null;
    (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
      cursorMetadata = data.metadata;
      return { id: data.id };
    });
    (prisma.notification.updateMany as jest.Mock).mockImplementation(async ({ data }) => {
      cursorMetadata = data.metadata;
      return { count: 1 };
    });
    gmail.users.messages.get.mockImplementation(async ({ id, format }) => ({
      data: format === 'metadata'
        ? gmailMessage(id, id === 'trusted'
          ? 'mx.google.com; dkim=pass; dmarc=pass header.from=stewartfleming.bromley.sch.uk'
          : 'mx.google.com; dkim=fail; dmarc=fail header.from=stewartfleming.bromley.sch.uk')
        : gmailMessage(id, 'mx.google.com; dkim=pass; dmarc=pass header.from=stewartfleming.bromley.sch.uk'),
    }));

    const firstResult = await syncStewartFlemingGmail('family-id');

    expect(gmail.users.messages.list).toHaveBeenNthCalledWith(1, expect.objectContaining({
      q: expect.stringMatching(/^from:stewartfleming\.bromley\.sch\.uk newer_than:90d before:/),
      maxResults: 20,
    }));
    expect(gmail.users.messages.list).toHaveBeenCalledTimes(1);
    expect(firstResult).toMatchObject({ matched: 1, processed: 1, autoCreated: 1, hasMore: true, errors: [] });
    expect(cursorMetadata).toMatchObject({
      schoolGmailInternalDateMs: 1790000000000,
      schoolGmailPageToken: 'page-2',
      schoolGmailBackfillComplete: false,
    });
    const activeQuery = String((cursorMetadata as unknown as Record<string, unknown>).schoolGmailActiveQuery);
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({ metadata: cursorMetadata });

    const secondResult = await syncStewartFlemingGmail('family-id');

    expect(gmail.users.messages.list).toHaveBeenNthCalledWith(2, expect.objectContaining({
      q: activeQuery,
      pageToken: 'page-2',
      maxResults: 20,
    }));
    expect(ingestCalendarEmailPayload).toHaveBeenCalledTimes(1);
    expect(ingestCalendarEmailPayload).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ from: 'Stewart Fleming <admin@stewartfleming.bromley.sch.uk>' }),
    }), { familyId: 'family-id', eventSource: 'gmail-school-email', authenticatedSchoolSender: true });
    expect(secondResult).toMatchObject({ matched: 1, processed: 0, unauthenticated: 1, hasMore: false, errors: [] });
    expect(prisma.gmailConnection.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ lastSyncAt: expect.any(Date) }) }));
    expect(cursorMetadata).toMatchObject({ schoolGmailInternalDateMs: 1790000000000, schoolGmailBackfillComplete: true });
  });

  it('checks the message ID before downloading the full message again', async () => {
    gmail.users.messages.list.mockResolvedValue({ data: { messages: [{ id: 'already-imported' }] } });
    gmail.users.messages.get.mockResolvedValue({
      data: { internalDate: '1780000000000', payload: { headers: [
        { name: 'From', value: 'admin@stewartfleming.bromley.sch.uk' },
        { name: 'Message-ID', value: '<already-imported@school.example>' },
        { name: 'Authentication-Results', value: 'mx.google.com; dmarc=pass header.from=stewartfleming.bromley.sch.uk' },
      ] } },
    });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({ id: 'existing-intake' });

    const result = await syncStewartFlemingGmail('family-id');

    expect(result.duplicates).toBe(1);
    expect(gmail.users.messages.get).toHaveBeenCalledTimes(1);
    expect(ingestCalendarEmailPayload).not.toHaveBeenCalled();
  });

  it('continues through the rest of a page and checkpoints a failed message for retry', async () => {
    gmail.users.messages.list.mockResolvedValue({
      data: { messages: [{ id: 'later' }, { id: 'fails' }], nextPageToken: 'page-2' },
    });
    gmail.users.messages.get.mockImplementation(async ({ id }) => ({
      data: gmailMessage(id, 'mx.google.com; dkim=pass; dmarc=pass header.from=stewartfleming.bromley.sch.uk'),
    }));
    (ingestCalendarEmailPayload as jest.Mock).mockImplementation(async ({ data }) =>
      data.messageId.includes('fails')
        ? { statusCode: 500, body: { error: 'temporary import failure' } }
        : { statusCode: 200, body: { autoCreated: 1, needsReview: 0 } }
    );
    let savedMetadata: Record<string, unknown> | null = null;
    (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
      savedMetadata = data.metadata;
      return { id: data.id };
    });

    const result = await syncStewartFlemingGmail('family-id');

    expect(ingestCalendarEmailPayload).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ processed: 1, autoCreated: 1, hasMore: true, errors: expect.any(Array) });
    expect(result.errors).toHaveLength(1);
    expect(savedMetadata).toMatchObject({
      schoolGmailPageToken: 'page-2',
      schoolGmailFailedMessageIds: ['fails'],
    });
  });

  it('refuses to read a different connected account from the configured Family Hub Gmail', async () => {
    (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({
      ...connection,
      googleUserEmail: 'edward@example.com',
    });

    await expect(syncStewartFlemingGmail('family-id')).rejects.toThrow(/does not match the configured Family Hub account/);
    expect(google.gmail).not.toHaveBeenCalled();
  });
});
