jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: {
    family: { findUnique: jest.fn() },
    calendarEmailIntake: { findFirst: jest.fn(), update: jest.fn() },
    calendarEvent: { findMany: jest.fn(), create: jest.fn(), findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}));
jest.mock('@/lib/webPush', () => ({ sendFamilyPushNotification: jest.fn().mockResolvedValue(undefined) }));

import prisma from '@/lib/prisma';
import { sendFamilyPushNotification } from '@/lib/webPush';
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
      eventType: 'education', durationMinutes: 60,
    }];
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
    (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'calendar-email-mail_school-message', title: 'Calendar email processed', message: '2 events added.' });

    const result = await ingestCalendarEmailPayload({
      data: { from: 'admin@stewartfleming.bromley.sch.uk', messageId: '<school-message>' },
    }, { familyId: 'family-1', eventSource: 'gmail-school-email', authenticatedSchoolSender: true });

    expect(prisma.calendarEvent.create).toHaveBeenCalledTimes(1);
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
});
