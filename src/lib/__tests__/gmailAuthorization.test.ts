jest.mock('@/lib/prisma', () => ({ __esModule: true, default: {
  gmailConnection: { findUnique: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
} }));
jest.mock('@/lib/googleCalendarServer', () => ({ createOAuthClient: jest.fn() }));
jest.mock('@/lib/calendarEmailIngestion', () => ({}));
import prisma from '@/lib/prisma';
import { createOAuthClient } from '@/lib/googleCalendarServer';
import { getAuthedGmailClient } from '@/lib/gmailCalendarServer';
import { GmailReconnectRequiredError, isInvalidGmailGrant } from '../gmailAuthorization';

const refreshAccessToken = jest.fn();
const setCredentials = jest.fn();
const updatedAt = new Date('2026-10-01T00:00:00Z');
const connection = { familyId: 'family', enabled: true, googleUserEmail: 'test@example.com',
  accessToken: 'dummy-access', refreshToken: 'dummy-refresh', expiryDate: new Date('2026-01-01T00:00Z'), updatedAt };
const expectedAccount = process.env.GOOGLE_GMAIL_ACCOUNT;
beforeEach(() => {
  jest.resetAllMocks();
  process.env.GOOGLE_GMAIL_ACCOUNT = 'test@example.com';
  (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue(connection);
  (prisma.gmailConnection.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  (createOAuthClient as jest.Mock).mockReturnValue({ refreshAccessToken, setCredentials });
});
afterAll(() => {
  if (expectedAccount === undefined) delete process.env.GOOGLE_GMAIL_ACCOUNT;
  else process.env.GOOGLE_GMAIL_ACCOUNT = expectedAccount;
});

it('persists reconnect-needed state only for the unchanged rejected grant', async () => {
  refreshAccessToken.mockRejectedValue({ response: { data: { error: 'invalid_grant' } } });
  await expect(getAuthedGmailClient('family')).rejects.toBeInstanceOf(GmailReconnectRequiredError);
  expect(prisma.gmailConnection.updateMany).toHaveBeenCalledWith({
    where: { familyId: 'family', enabled: true, updatedAt }, data: { enabled: false },
  });
  expect(prisma.gmailConnection.update).not.toHaveBeenCalled();
});

it('does not disable a valid connection after a transient refresh failure', async () => {
  refreshAccessToken.mockRejectedValue(new Error('network timeout'));
  await expect(getAuthedGmailClient('family')).rejects.toThrow('network timeout');
  expect(prisma.gmailConnection.updateMany).not.toHaveBeenCalled();
});

it('does not disable a newer successful sign-in racing an old failed refresh', async () => {
  refreshAccessToken.mockRejectedValue(new Error('invalid_grant'));
  (prisma.gmailConnection.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
  await expect(getAuthedGmailClient('family')).rejects.toThrow('authorization changed');
  expect(prisma.gmailConnection.update).not.toHaveBeenCalled();
});

it('keeps rejected authorization in reconnect state across subsequent loads', async () => {
  (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({ ...connection, enabled: false });
  await expect(getAuthedGmailClient('family')).rejects.toMatchObject({ code: 'GMAIL_RECONNECT_REQUIRED' });
  expect(refreshAccessToken).not.toHaveBeenCalled();
});

it('marks an expired connection without an offline refresh token as reconnect required', async () => {
  (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({ ...connection, refreshToken: null });
  await expect(getAuthedGmailClient('family')).rejects.toBeInstanceOf(GmailReconnectRequiredError);
  expect(refreshAccessToken).not.toHaveBeenCalled();
  expect(prisma.gmailConnection.updateMany).toHaveBeenCalled();
});

it('does not misclassify provider or message errors as an invalid grant', () => {
  expect(isInvalidGmailGrant(new Error('invalid_grant'))).toBe(true);
  expect(isInvalidGmailGrant({ response: { data: { error: 'invalid_client' } } })).toBe(false);
  expect(isInvalidGmailGrant(new Error('message contains invalid_grant'))).toBe(false);
  expect(isInvalidGmailGrant(null)).toBe(false);
});
