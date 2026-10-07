jest.mock('@/lib/prisma', () => ({ __esModule: true, default: { gmailConnection: { findUnique: jest.fn() } } }));
jest.mock('@/lib/auth-utils', () => ({ requireFamilyAccess: (handler: unknown) => handler }));
jest.mock('@/lib/gmailCalendarServer', () => ({ syncStewartFlemingGmail: jest.fn(), syncGmailCalendarInbox: jest.fn(),
  gmailForwardingAddress: jest.fn(() => null) }));
jest.mock('next/server', () => ({ NextResponse: { json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }) } }));
import prisma from '@/lib/prisma';
import { syncGmailCalendarInbox, syncStewartFlemingGmail } from '@/lib/gmailCalendarServer';
import { GmailReconnectRequiredError } from '@/lib/gmailAuthorization';
import { GET, POST } from './route';
const context = { params: Promise.resolve({ familyId: 'family' }) };
beforeEach(() => jest.resetAllMocks());

it('returns an actionable reconnect response without continuing intake or exposing provider details', async () => {
  (syncStewartFlemingGmail as jest.Mock).mockRejectedValue(new GmailReconnectRequiredError());
  const response = await (POST as any)({}, context, {});
  expect(response.status).toBe(401);
  expect(response.body.code).toBe('GMAIL_RECONNECT_REQUIRED');
  expect(response.body.error).toContain('Reconnect Gmail');
  expect(syncGmailCalendarInbox).not.toHaveBeenCalled();
});

it('keeps the previous account visible but disconnected after reload', async () => {
  (prisma.gmailConnection.findUnique as jest.Mock).mockResolvedValue({ enabled: false, googleUserEmail: 'test@example.com' });
  const response = await (GET as any)({}, context, {});
  expect(response.body).toMatchObject({ connected: false, googleUserEmail: 'test@example.com', forwardingAddress: null });
});
