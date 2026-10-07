jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    family: { findUnique: jest.fn() },
    familyDocument: { findUnique: jest.fn(), create: jest.fn() },
    calendarEmailIntake: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    calendarEvent: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    googleCalendarConnection: { findUnique: jest.fn(), update: jest.fn() },
    notification: { create: jest.fn() },
  },
}));
jest.mock('@/lib/webPush', () => ({ sendFamilyPushNotification: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/lib/googleCalendarServer', () => ({
  getAuthedCalendarClient: jest.fn(),
  googlePayloadFromFamilyEvent: jest.fn((event) => ({ summary: event.title })),
}));

import prisma from '@/lib/prisma';
import { sendFamilyPushNotification } from '@/lib/webPush';
import { getAuthedCalendarClient } from '@/lib/googleCalendarServer';
import { ingestCalendarEmailPayload, isHighConfidenceAutoCreate } from '@/lib/calendarEmailIngestion';
import type { CalendarImportDraft } from '@/utils/calendarImport';

const importDraft = (overrides: Partial<CalendarImportDraft> = {}): CalendarImportDraft => ({
  importId: 'school-event', title: 'Flu Vaccination Session', person: 'child-1', date: '2026-11-10',
  time: '09:00', duration: 60, recurring: 'none', cost: 0, type: 'education', notes: '',
  isRecurring: false, priority: 'high', status: 'confirmed', confidence: 0.86,
  source: 'Flu vaccination session on 10 November 2026', sourceLine: 1, importStatus: 'ready', warnings: [],
  ...overrides,
});

describe('school email auto-import rules', () => {
  const now = new Date('2026-09-30T09:00:00Z');
  const schoolSource = { eventSource: 'gmail-school-email', authenticatedSchoolSender: true };

  it('allows a future named school date with no supplied time, but rejects generic and past items', () => {
    expect(isHighConfidenceAutoCreate(importDraft(), schoolSource, now)).toBe(true);
    expect(isHighConfidenceAutoCreate(importDraft({ title: 'Imported event', confidence: 0.99 }), schoolSource, now)).toBe(false);
    expect(isHighConfidenceAutoCreate(importDraft({ title: 'Weekly Update Email', confidence: 0.99 }), schoolSource, now)).toBe(false);
    expect(isHighConfidenceAutoCreate(importDraft({ date: '2026-09-29' }), schoolSource, now)).toBe(false);
  });

  it('keeps unbooked offers in review instead of treating them as confirmed attendance', () => {
    expect(isHighConfidenceAutoCreate(importDraft({
      title: 'Half Term Holiday Camp',
      confidence: 0.99,
      source: 'Half Term Holiday Camp 26 October. Spaces are limited and places are first-come, first-served.',
    }), schoolSource, now)).toBe(false);
    expect(isHighConfidenceAutoCreate(importDraft({
      title: 'BFree Multisports',
      confidence: 0.99,
      source: 'Day: Tuesday. Dates: 15 September to 1 December (10-week programme). Year Groups: Year 1 & Year 2. How to Book.',
    }), schoolSource, now)).toBe(false);
    expect(isHighConfidenceAutoCreate(importDraft({
      title: 'Half Term Holiday Camp',
      confidence: 0.99,
      source: 'Limited places available. Your booking is confirmed for 26 October 2026 at 9am.',
    }), schoolSource, now)).toBe(true);
    expect(isHighConfidenceAutoCreate(importDraft({
      title: 'Holiday Camp Booking',
      confidence: 0.99,
      source: 'Your booking is confirmed for Half Term Holiday Camp 26 October at 9am.',
    }), schoolSource, now)).toBe(true);
  });

  it('never auto-creates impossible calendar dates', () => {
    expect(isHighConfidenceAutoCreate(importDraft({ date: '2026-11-31' }), schoolSource, now)).toBe(false);
  });
});

describe('school email import retry recovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(new Date('2026-10-03T07:00:00Z'));
    (getAuthedCalendarClient as jest.Mock).mockResolvedValue({
      calendar: { events: { insert: jest.fn() } },
      connection: { selectedCalendarId: null },
    });
    (prisma.googleCalendarConnection.findUnique as jest.Mock).mockResolvedValue({
      enabled: true, selectedCalendarId: 'family-calendar',
    });
  });

  afterEach(() => jest.useRealTimers());

  it('maps an unnamed Stewart Fleming event to the actual Amari ID, not a narrow age-group match', async () => {
    (prisma.familyDocument.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.familyDocument.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data, version: 1 }));
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({
      id: 'family-1',
      members: [
        { id: 'amari', name: 'Amari', role: 'Child', ageGroup: 'Year 4' },
        { id: 'askia', name: 'Askia', role: 'Child', ageGroup: 'Primary' },
      ],
    });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.calendarEmailIntake.create as jest.Mock).mockResolvedValue({ id: 'photo-day-intake' });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.calendarEvent.create as jest.Mock).mockImplementation(async ({ data }) => ({ ...data }));
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'photo-day-notification' });

    const result = await ingestCalendarEmailPayload({
      data: {
        messageId: '<photo-day@school.example>',
        subject: 'School photo day',
        from: 'admin@stewartfleming.bromley.sch.uk',
        text: 'School photo day Friday 9 October 2026.',
      },
    }, { familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true });

    expect(result).toMatchObject({ statusCode: 200, body: { autoCreated: 1, needsReview: 0 } });
    expect(prisma.calendarEmailIntake.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        parsedDrafts: [expect.objectContaining({ title: 'School Photo Day', person: 'amari' })],
      }),
    }));
    expect(prisma.calendarEvent.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ personId: 'amari' }) }));
  });

  it('reuses saved events and creates only the missing high-confidence event on retry', async () => {
    const intakeId = 'mail_school-message';
    const drafts = [
      {
        importId: 'first', title: 'Swimming club', person: 'child-1', date: '2026-10-02', time: '15:30',
        duration: 60, recurring: 'none', cost: 0, type: 'education', isRecurring: false, priority: 'medium',
        status: 'planned', confidence: 0.95, source: 'school-email', sourceLine: 1, importStatus: 'ready', warnings: [],
      },
      {
        importId: 'second', title: 'Reading book due', person: 'child-1', date: '2026-10-03', time: '08:30',
        duration: 60, recurring: 'none', cost: 0, type: 'education', isRecurring: false, priority: 'medium',
        status: 'planned', confidence: 0.96, source: 'school-email', sourceLine: 2, importStatus: 'ready', warnings: [],
      },
      {
        importId: 'review', title: 'School event date to confirm', person: 'child-1', date: '2026-10-04', time: '09:00',
        duration: 60, recurring: 'none', cost: 0, type: 'education', isRecurring: false, priority: 'medium',
        status: 'planned', confidence: 0.6, source: 'school-email', sourceLine: 3, importStatus: 'needs_review', warnings: [],
      },
    ];
    const events: any[] = [{
      id: 'already-saved', familyId: 'family-1', sourceId: intakeId, personId: 'child-1', title: 'Swimming club',
      eventDate: new Date('2026-10-02T15:30:00.000Z'), eventTime: new Date('2026-10-02T15:30:00.000Z'),
      eventType: 'education', durationMinutes: 60, googleEventId: 'google-already-saved',
    }];
    const insert = jest.fn().mockResolvedValue({ data: { id: 'google-new-event' } });
    (getAuthedCalendarClient as jest.Mock).mockResolvedValue({
      calendar: { events: { insert } },
      connection: { selectedCalendarId: 'family-calendar' },
    });
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-1', members: [] });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      id: intakeId,
      status: 'processing',
      parsedDrafts: drafts,
      createdEventIds: [],
      metadata: { schoolSenderVerified: true },
    });
    (prisma.calendarEvent.findMany as jest.Mock).mockImplementation(async () => events);
    (prisma.calendarEvent.create as jest.Mock).mockImplementation(async ({ data }) => {
      const event = { ...data };
      events.push(event);
      return event;
    });
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({});
    (prisma.calendarEvent.update as jest.Mock).mockResolvedValue({});
    (prisma.googleCalendarConnection.update as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'calendar-email-mail_school-message', title: 'Calendar email processed', message: '2 events added.' });

    const result = await ingestCalendarEmailPayload({
      data: { from: 'admin@stewartfleming.bromley.sch.uk', messageId: '<school-message>' },
    }, { familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true });

    expect(prisma.calendarEvent.create).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith({
      calendarId: 'family-calendar', requestBody: { summary: 'Reading book due' },
    });
    expect(prisma.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: events[1].id },
      data: { googleCalendarId: 'family-calendar', googleEventId: 'google-new-event' },
    });
    expect(prisma.googleCalendarConnection.update).toHaveBeenCalledTimes(1);
    expect(prisma.calendarEmailIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: intakeId },
      data: expect.objectContaining({
        status: 'partial_review',
        autoCreated: 2,
        needsReview: 1,
        createdEventIds: ['already-saved', expect.stringMatching(/^mail_event_[a-f0-9]{64}$/)],
      }),
    }));
    expect(result).toMatchObject({
      statusCode: 200,
      body: { duplicate: true, status: 'partial_review', autoCreated: 2, needsReview: 1 },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        id: `calendar-email-${intakeId}`,
        relatedEventId: 'already-saved',
        actionRequired: true,
      }),
    }));
    expect(sendFamilyPushNotification).toHaveBeenCalledWith('family-1', expect.objectContaining({
      title: 'Calendar email processed',
      data: expect.objectContaining({ intakeId }),
    }));
  });

  it('keeps the intake retryable when export fails without recreating the saved event', async () => {
    const saved = {
      id: 'saved-before-export', familyId: 'family-1', sourceId: 'mail-retry', personId: 'child-1',
      title: 'Flu Vaccination Session', eventDate: new Date('2026-11-10T09:00:00Z'),
      eventTime: new Date('2026-11-10T09:00:00Z'), eventType: 'education', durationMinutes: 60,
    };
    const insert = jest.fn()
      .mockRejectedValueOnce(new Error('Google export unavailable'))
      .mockResolvedValue({ data: { id: 'google-recovered' } });
    (getAuthedCalendarClient as jest.Mock).mockResolvedValue({
      calendar: { events: { insert } }, connection: { selectedCalendarId: 'family-calendar' },
    });
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-1', members: [] });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      id: 'mail-retry', status: 'processing', parsedDrafts: [importDraft()],
      createdEventIds: [], metadata: { schoolSenderVerified: true },
    });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([saved]);
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'calendar-email-mail-retry' });

    const result = await ingestCalendarEmailPayload({ data: { messageId: 'retry' } }, {
      familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true,
    });

    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.update).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.update).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ statusCode: 503, body: { error: 'Google Calendar export failed: Google export unavailable' } });
    expect(prisma.notification.create).not.toHaveBeenCalled();

    const retried = await ingestCalendarEmailPayload({ data: { messageId: 'retry' } }, {
      familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true,
    });

    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    expect(insert).toHaveBeenCalledTimes(2);
    expect(prisma.calendarEvent.update).toHaveBeenCalledWith({
      where: { id: saved.id },
      data: { googleCalendarId: 'family-calendar', googleEventId: 'google-recovered' },
    });
    expect(prisma.calendarEmailIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mail-retry' }, data: expect.objectContaining({ status: 'auto_created' }),
    }));
    expect(retried).toMatchObject({ statusCode: 200, body: { status: 'auto_created' } });
  });

  it.each([
    ['not connected', null],
    ['disabled', { enabled: false, selectedCalendarId: 'family-calendar' }],
    ['without a selected calendar', { enabled: true, selectedCalendarId: null }],
  ])('finishes Gmail import when Google Calendar is %s', async (_case, connection) => {
    const saved = {
      id: 'gmail-only-event', familyId: 'family-1', sourceId: 'mail-gmail-only', personId: 'child-1',
      title: 'Flu Vaccination Session', eventDate: new Date('2026-11-10T09:00:00Z'),
      eventTime: new Date('2026-11-10T09:00:00Z'), eventType: 'education', durationMinutes: 60,
    };
    (prisma.googleCalendarConnection.findUnique as jest.Mock).mockResolvedValue(connection);
    (getAuthedCalendarClient as jest.Mock).mockRejectedValue(new Error('Google Calendar is not connected'));
    (prisma.family.findUnique as jest.Mock).mockResolvedValue({ id: 'family-1', members: [] });
    (prisma.calendarEmailIntake.findFirst as jest.Mock).mockResolvedValue({
      id: 'mail-gmail-only', status: 'processing', parsedDrafts: [importDraft()],
      createdEventIds: [], metadata: { schoolSenderVerified: true },
    });
    (prisma.calendarEvent.findMany as jest.Mock).mockResolvedValue([saved]);
    (prisma.calendarEmailIntake.update as jest.Mock).mockResolvedValue({});
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'calendar-email-mail-gmail-only' });

    const result = await ingestCalendarEmailPayload({ data: { messageId: 'gmail-only' } }, {
      familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true,
    });

    expect(prisma.googleCalendarConnection.findUnique).toHaveBeenCalledWith({
      where: { familyId: 'family-1' }, select: { enabled: true, selectedCalendarId: true },
    });
    expect(getAuthedCalendarClient).not.toHaveBeenCalled();
    expect(prisma.calendarEvent.create).not.toHaveBeenCalled();
    expect(prisma.calendarEmailIntake.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'mail-gmail-only' }, data: expect.objectContaining({ status: 'auto_created' }),
    }));
    expect(result).toMatchObject({ statusCode: 200, body: { status: 'auto_created' } });
  });
});
