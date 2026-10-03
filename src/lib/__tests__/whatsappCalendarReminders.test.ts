import {
  calendarReminderWindow,
  buildWhatsAppReminderPayload,
  getWhatsAppConsentState,
  getWhatsAppConfig,
  isValidWhatsAppSignature,
  londonWallTimeToUtc,
  recordWhatsAppDeliveryStatus,
  reserveWhatsAppReminderMarker,
  sendUpcomingSchoolWhatsAppReminders,
  setWhatsAppConsentState,
} from '@/lib/whatsappCalendarReminders';
import { createHash, createHmac } from 'crypto';

jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      upsert: jest.fn(),
    },
    calendarEvent: { findMany: jest.fn() },
  },
}));

import prisma from '@/lib/prisma';

const testEnv = (values: Record<string, string>) => values as unknown as NodeJS.ProcessEnv;

describe('getWhatsAppConfig', () => {
  it('requires a sender, recipient, token, and approved template', () => {
    expect(getWhatsAppConfig(testEnv({}))).toBeNull();
    expect(getWhatsAppConfig(testEnv({
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_PHONE_NUMBER_ID: 'sender-id',
      WHATSAPP_RECIPIENT_E164: '+44 7700 900 123',
      WHATSAPP_TEMPLATE_NAME: 'familyhub_calendar_reminder',
    }))).toMatchObject({
      recipient: '447700900123',
      templateLanguage: 'en_GB',
      graphApiVersion: 'v25.0',
    });
  });

  it('rejects malformed recipient numbers rather than sending to an arbitrary value', () => {
    expect(getWhatsAppConfig(testEnv({
      WHATSAPP_ACCESS_TOKEN: 'token',
      WHATSAPP_PHONE_NUMBER_ID: 'sender-id',
      WHATSAPP_RECIPIENT_E164: 'not a phone number',
      WHATSAPP_TEMPLATE_NAME: 'familyhub_calendar_reminder',
    }))).toBeNull();
  });
});

describe('WhatsApp reminder payload', () => {
  it('uses an approved utility template with event and date variables', () => {
    expect(buildWhatsAppReminderPayload({
      recipient: '447700900123',
      templateName: 'familyhub_calendar_reminder',
      templateLanguage: 'en_GB',
    }, 'Reading book due', 'Monday, 5 October 2026 at 08:30')).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '447700900123',
      type: 'template',
      template: {
        name: 'familyhub_calendar_reminder',
        language: { code: 'en_GB' },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: 'Reading book due' },
            { type: 'text', text: 'Monday, 5 October 2026 at 08:30' },
          ],
        }],
      },
    });
  });
});

describe('school events without a stated time', () => {
  it('sends only date-based 7-day and 24-hour reminders, never a one-hour alert', () => {
    expect(calendarReminderWindow(6 * 24 * 60, 'education', false)).toBe('7d');
    expect(calendarReminderWindow(23 * 60, 'education', false)).toBe('24h');
    expect(calendarReminderWindow(45, 'education', false)).toBe('24h');
    expect(calendarReminderWindow(45, 'education', true)).toBe('1h');
  });
});

describe('WhatsApp webhook signatures', () => {
  it('accepts only a matching SHA-256 HMAC signature', () => {
    const body = Buffer.from('{"entry":[]}');
    const secret = 'test-app-secret';
    const digest = createHmac('sha256', secret).update(body).digest('hex');
    expect(isValidWhatsAppSignature(body, `sha256=${digest}`, secret)).toBe(true);
    expect(isValidWhatsAppSignature(body, `sha256=${digest}`, 'different-secret')).toBe(false);
    expect(isValidWhatsAppSignature(body, null, secret)).toBe(false);
  });
});

describe('London calendar wall-clock times', () => {
  it('converts summer events from BST to the correct UTC instant', () => {
    const result = londonWallTimeToUtc(
      new Date('2026-07-06T00:00:00.000Z'),
      new Date('2026-07-06T08:30:00.000Z'),
    );
    expect(result.toISOString()).toBe('2026-07-06T07:30:00.000Z');
  });

  it('keeps winter events on GMT and chooses the earlier occurrence in the autumn overlap', () => {
    expect(londonWallTimeToUtc(
      new Date('2026-12-07T00:00:00.000Z'),
      new Date('2026-12-07T08:30:00.000Z'),
    ).toISOString()).toBe('2026-12-07T08:30:00.000Z');
    expect(londonWallTimeToUtc(
      new Date('2026-10-25T00:00:00.000Z'),
      new Date('2026-10-25T01:30:00.000Z'),
    ).toISOString()).toBe('2026-10-25T00:30:00.000Z');
  });

  it('moves a nonexistent spring-clock time to the first valid London time', () => {
    expect(londonWallTimeToUtc(
      new Date('2026-03-29T00:00:00.000Z'),
      new Date('2026-03-29T01:30:00.000Z'),
    ).toISOString()).toBe('2026-03-29T01:00:00.000Z');
  });
});

describe('WhatsApp opt-in and idempotency', () => {
  const originalEnv = { ...process.env };
  const configEnv = {
    WHATSAPP_ACCESS_TOKEN: 'token',
    WHATSAPP_PHONE_NUMBER_ID: 'sender-id',
    WHATSAPP_RECIPIENT_E164: '+44 7700 900 123',
    WHATSAPP_TEMPLATE_NAME: 'familyhub_calendar_reminder',
  };

  beforeEach(() => {
    process.env = { ...originalEnv, ...configEnv };
    jest.clearAllMocks();
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'test-notification' });
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('does not send reminders until the configured recipient opts in', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    const result = await sendUpcomingSchoolWhatsAppReminders('family-id');
    expect(result).toMatchObject({ configured: true, consent: 'not_confirmed', accepted: 0 });
    expect(prisma.calendarEvent.findMany).not.toHaveBeenCalled();
  });

  it('holds a recurring Phonics reminder when its source month contradicts its saved date', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({ metadata: {
      whatsappConsent: 'opted_in', recipientHash: createHash('sha256').update('447700900123').digest('hex'),
    } });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([{
      id: 'phonics', title: 'Phonics', isRecurring: true,
      eventDate: new Date('2026-09-18T00:00:00Z'), eventTime: '15:30',
      notes: 'Screening check June - Friday 18', person: { name: 'Child' },
    }]);
    const result = await sendUpcomingSchoolWhatsAppReminders('family-id', new Date('2026-09-17T14:30:00Z'));
    expect(result).toMatchObject({ accepted: 0, skipped: 1 });
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('records START and STOP only for the configured recipient', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'wa-consent-family-id' });
    expect(await setWhatsAppConsentState('family-id', '447700900123', 'opted_in')).toBe(true);
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ id: 'wa-consent-family-id', type: 'whatsapp_consent' }),
    }));
    expect(await setWhatsAppConsentState('family-id', '447700900999', 'opted_out')).toBe(false);
  });

  it('does not let a delayed START undo a later STOP', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      metadata: { whatsappConsent: 'opted_out', whatsappConsentAt: '2026-09-28T12:00:00.000Z' },
    });
    expect(await setWhatsAppConsentState(
      'family-id', '447700900123', 'opted_in', new Date('2026-09-28T11:00:00.000Z'),
    )).toBe(false);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('gives STOP priority when START and STOP have the same provider timestamp', async () => {
    const at = new Date('2026-09-28T12:00:00.000Z');
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      metadata: { whatsappConsent: 'opted_in', whatsappConsentAt: at.toISOString() },
    });
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    expect(await setWhatsAppConsentState('family-id', '447700900123', 'opted_out', at)).toBe(true);
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: { metadata: expect.objectContaining({ whatsappConsent: 'opted_out' }) },
    }));
  });

  it('uses the event/window key as a unique database marker under concurrent cron runs', async () => {
    const event = {
      id: 'school-event',
      familyId: 'family-id',
      title: 'School trip',
      eventDate: new Date('2026-10-01T09:00:00.000Z'),
      eventTime: new Date('2026-10-01T09:00:00.000Z'),
      eventType: 'education',
      personId: 'child-id',
    };
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    let inserted = false;
    (prisma.notification.create as jest.Mock).mockImplementation(async ({ data }) => {
      if (inserted) throw { code: 'P2002' };
      inserted = true;
      return { id: data.id };
    });
    const [first, second] = await Promise.all([
      reserveWhatsAppReminderMarker(event, '24h', new Date('2026-09-30T09:00:00.000Z')),
      reserveWhatsAppReminderMarker(event, '24h', new Date('2026-09-30T09:00:00.000Z')),
    ]);
    expect([first, second].filter(Boolean)).toEqual(['wa-reminder-school-event-24h']);
  });

  it('marks an ambiguous stale send for review instead of automatically retrying it', async () => {
    const event = {
      id: 'school-event',
      familyId: 'family-id',
      title: 'School trip',
      eventDate: new Date('2026-10-01T09:00:00.000Z'),
      eventTime: new Date('2026-10-01T09:00:00.000Z'),
      eventType: 'education',
      personId: 'child-id',
    };
    (prisma.notification.findUnique as jest.Mock)
      .mockResolvedValueOnce({
        id: 'wa-reminder-school-event-24h',
        metadata: { whatsappStatus: 'sending', whatsappAttemptAt: '2026-09-30T08:00:00.000Z' },
      })
      .mockResolvedValueOnce({
        id: 'wa-reminder-school-event-24h',
        metadata: { whatsappStatus: 'unknown', whatsappAttemptAt: '2026-09-30T08:00:00.000Z' },
      });
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

    expect(await reserveWhatsAppReminderMarker(event, '24h', new Date('2026-09-30T09:00:00.000Z'))).toBeNull();
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ metadata: expect.objectContaining({
        whatsappStatus: 'unknown',
        whatsappManualReviewRequired: true,
      }) }),
    }));
    expect(await reserveWhatsAppReminderMarker(event, '24h', new Date('2026-09-30T10:00:00.000Z'))).toBeNull();
    expect(prisma.notification.create).not.toHaveBeenCalled();
  });

  it('does not let an old sent status overwrite an already delivered WhatsApp status', async () => {
    (prisma.notification.findMany as jest.Mock).mockResolvedValue([{
      id: 'wa-reminder-school-event-24h',
      metadata: { whatsappStatus: 'delivered', whatsappStatusAt: '2026-09-30T09:01:00.000Z' },
    }]);
    const updated = await recordWhatsAppDeliveryStatus('wamid-1', 'sent', '1790758800');
    expect(updated).toBe(0);
    expect(prisma.notification.updateMany).not.toHaveBeenCalled();
  });

  it('stores a recipient hash rather than a raw number in consent metadata', async () => {
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'wa-consent-family-id' });
    await setWhatsAppConsentState('family-id', '447700900123', 'opted_in');
    const call = (prisma.notification.create as jest.Mock).mock.calls[0][0];
    expect(call.data.metadata).toMatchObject({
      recipientHash: createHash('sha256').update('447700900123').digest('hex'),
      whatsappConsent: 'opted_in',
    });
    expect(JSON.stringify(call.data.metadata)).not.toContain('447700900123');
  });

  it('recognizes stored opt-in only when the configured number matches', async () => {
    const hash = createHash('sha256').update('447700900123').digest('hex');
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      metadata: { recipientHash: hash, whatsappConsent: 'opted_in' },
    });
    expect(await getWhatsAppConsentState('family-id')).toBe('opted_in');
    (prisma.notification.findUnique as jest.Mock).mockResolvedValue({
      metadata: { recipientHash: 'other', whatsappConsent: 'opted_in' },
    });
    expect(await getWhatsAppConsentState('family-id')).toBe('not_confirmed');
  });
});
