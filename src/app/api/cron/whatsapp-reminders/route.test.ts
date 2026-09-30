jest.mock('@/lib/cronAuth', () => ({ isAuthorisedCronRequest: jest.fn(() => true) }));
jest.mock('@/lib/whatsappCalendarReminders', () => ({ sendUpcomingSchoolWhatsAppReminders: jest.fn() }));
jest.mock('next/server', () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({ status: init?.status || 200, body }),
  },
}));

import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { sendUpcomingSchoolWhatsAppReminders } from '@/lib/whatsappCalendarReminders';
import { GET } from './route';

const cronRequest = () => ({ headers: { get: jest.fn(() => null) } }) as any;

describe('WhatsApp reminders cron', () => {
  const originalFamilyId = process.env.CALENDAR_INBOUND_FAMILY_ID;

  beforeEach(() => {
    jest.clearAllMocks();
    (isAuthorisedCronRequest as jest.Mock).mockReturnValue(true);
    process.env.CALENDAR_INBOUND_FAMILY_ID = 'family-id';
  });

  afterAll(() => {
    if (originalFamilyId === undefined) delete process.env.CALENDAR_INBOUND_FAMILY_ID;
    else process.env.CALENDAR_INBOUND_FAMILY_ID = originalFamilyId;
  });

  it('requires the cron bearer authorization', async () => {
    (isAuthorisedCronRequest as jest.Mock).mockReturnValue(false);
    const result = await (GET as any)(cronRequest());
    expect(result.status).toBe(401);
    expect(sendUpcomingSchoolWhatsAppReminders).not.toHaveBeenCalled();
  });

  it('runs the separate reminder sweep for the configured family', async () => {
    (sendUpcomingSchoolWhatsAppReminders as jest.Mock).mockResolvedValue({
      configured: false, matched: 0, accepted: 0, skipped: 'WhatsApp sender or approved template is not configured',
    });
    const result = await (GET as any)(cronRequest());
    expect(result.status).toBe(200);
    expect(result.body.reminders.configured).toBe(false);
    expect(sendUpcomingSchoolWhatsAppReminders).toHaveBeenCalledWith('family-id');
  });
});
