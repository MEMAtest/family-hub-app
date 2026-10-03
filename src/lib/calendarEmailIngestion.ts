import type { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import pdf from 'pdf-parse/lib/pdf-parse.js';
import prisma from '@/lib/prisma';
import { calendarEventDraftToDbData, toCalendarEventResponse } from '@/lib/calendarEventMapping';
import { getAuthedCalendarClient, googlePayloadFromFamilyEvent } from '@/lib/googleCalendarServer';
import { sendFamilyPushNotification } from '@/lib/webPush';
import { MAX_CALENDAR_ATTACHMENT_SIZE, MAX_CALENDAR_ATTACHMENT_TOTAL } from '@/lib/calendarIntakeAttachments';
import {
  CalendarImportDraft,
  importDraftToCalendarEventDraft,
  normalizeCalendarEmailText,
  parseCalendarImportText,
} from '@/utils/calendarImport';
import { summarizeSchoolDocument } from '@/utils/schoolDocumentSummary';
import { parseDateKey } from '@/utils/recurrence';

const emailFromValue = (value: any): string => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value.email === 'string') return value.email;
  if (typeof value.address === 'string') return value.address;
  return '';
};

const recipientsFromValue = (value: any): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(emailFromValue).filter(Boolean);
  return [emailFromValue(value)].filter(Boolean);
};

const payloadData = (payload: any) => payload?.data || payload?.email || payload;

const resolveFamily = async (recipients: string[], forcedFamilyId?: string) => {
  if (forcedFamilyId) {
    return prisma.family.findUnique({
      where: { id: forcedFamilyId },
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });
  }

  const configuredDomain = process.env.CALENDAR_INBOUND_DOMAIN?.toLowerCase();
  for (const recipient of recipients) {
    const [localPart, domain] = recipient.toLowerCase().split('@');
    if (!localPart || !domain) continue;
    if (configuredDomain && domain !== configuredDomain) continue;

    const familyKey =
      localPart.match(/^calendar\+(.+)$/)?.[1] ||
      localPart.match(/^family\+(.+)$/)?.[1];
    if (!familyKey) continue;

    const family = await prisma.family.findFirst({
      where: {
        OR: [
          { familyCode: { equals: familyKey, mode: 'insensitive' } },
          { id: familyKey },
        ],
      },
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });
    if (family) return family;
  }

  const fallbackFamilyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!fallbackFamilyId) return null;
  return prisma.family.findUnique({
    where: { id: fallbackFamilyId },
    include: { members: { orderBy: { createdAt: 'asc' } } },
  });
};

const inboundAttachment = (value: any) => {
  const encoded = value?.contentBase64 || value?.base64 || value?.data || value?.content;
  if (typeof encoded !== 'string' || !encoded.trim()) return null;

  const dataUrl = encoded.match(/^data:([^;]+);base64,([\s\S]+)$/);
  const base64 = dataUrl?.[2] || encoded;
  const data = Buffer.from(base64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
  if (!data.length || data.length > MAX_CALENDAR_ATTACHMENT_SIZE) return null;

  return {
    fileName: String(value?.fileName || value?.filename || value?.name || 'email-attachment'),
    mimeType: String(value?.mimeType || value?.contentType || dataUrl?.[1] || 'application/octet-stream'),
    sizeBytes: data.length,
    data,
  };
};

const extractPdfAttachmentText = async (attachments: Array<{ fileName: string; mimeType: string; data: Buffer }>) => {
  const extracted: string[] = [];
  for (const attachment of attachments) {
    const isPdf = attachment.mimeType.toLowerCase().includes('pdf') || /\.pdf$/i.test(attachment.fileName);
    if (!isPdf) continue;
    try {
      const parsed = await pdf(attachment.data);
      if (parsed.text?.trim()) extracted.push(parsed.text.trim());
    } catch (error) {
      console.warn(`Unable to extract forwarded PDF ${attachment.fileName}:`, error);
    }
  }
  return extracted;
};

export const isHighConfidenceAutoCreate = (
  draft: CalendarImportDraft,
  options: { eventSource?: string; authenticatedSchoolSender?: boolean },
  now = new Date(),
) => {
  const genericTitle = /^(?:imported event|weekly update(?: email)?|newsletter|school update(?: email)?)$/i
    .test(draft.title.trim());
  const today = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const todayKey = `${today.find((part) => part.type === 'year')?.value}-${today.find((part) => part.type === 'month')?.value}-${today.find((part) => part.type === 'day')?.value}`;
  const hasExplicitTime = /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(draft.source);
  const verifiedSchoolEvent = options.eventSource === 'gmail-school-email' && options.authenticatedSchoolSender === true;
  const offerCue = /\b(?:limited (?:places?|spaces?)|(?:places?|spaces?) (?:are|is) limited|first[- ]come,? first[- ]served|book now|register now|how to book|booking required|places? available)\b/i
    .test(draft.source);
  const bookingConfirmed = /\b(?:your booking is confirmed|booking confirmed|your place is confirmed|place confirmed|registration confirmed|you are booked|your place is reserved)\b/i
    .test(draft.source);
  const unconfirmedOffer = offerCue && !bookingConfirmed;

  if (!parseDateKey(draft.date) || (draft.endDate && !parseDateKey(draft.endDate)) ||
      draft.importStatus !== 'ready' || !draft.person || genericTitle || unconfirmedOffer || draft.date < todayKey) return false;
  if (draft.confidence >= 0.9 && hasExplicitTime) return true;
  return verifiedSchoolEvent && draft.type === 'education' && draft.confidence >= 0.85;
};

const schoolDefaultPersonId = (members: Array<{ id: string; role?: string | null; ageGroup?: string | null }>) => {
  const primaryPupils = members.filter((member) =>
    /student|child/i.test(member.role || '') && /child|primary/i.test(member.ageGroup || '')
  );
  return primaryPupils.length === 1 ? primaryPupils[0].id : undefined;
};

const hasExplicitTime = (draft: CalendarImportDraft) =>
  /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(draft.source);

const importedEventId = (intakeId: string, draftIndex: number) =>
  `mail_event_${createHash('sha256').update(`${intakeId}\0${draftIndex}`).digest('hex')}`;

const sameImportedEvent = (event: any, data: ReturnType<typeof calendarEventDraftToDbData>) => {
  const allDay = /time not provided by source|school email did not specify a time/i.test(data.notes || '');
  const sameDate = allDay
    ? new Date(event.eventDate).toISOString().slice(0, 10) === data.eventDate.toISOString().slice(0, 10)
    : new Date(event.eventDate).getTime() === data.eventDate.getTime();
  return event.title === data.title &&
    event.personId === data.personId &&
    sameDate &&
    (allDay || new Date(event.eventTime).getTime() === data.eventTime.getTime()) &&
    event.eventType === data.eventType;
};

const persistHighConfidenceEvents = async (
  familyId: string,
  intakeId: string,
  drafts: CalendarImportDraft[],
  options: { eventSource?: string; authenticatedSchoolSender?: boolean },
) => {
  const schoolVerified = options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email';
  const source = schoolVerified ? 'gmail-school-email' :
    options.eventSource === 'gmail-calendar-email' ? options.eventSource : 'calendar-email';
  const persisted = await prisma.calendarEvent.findMany({ where: { familyId, sourceId: intakeId } });
  const result: any[] = [];

  for (const [draftIndex, draft] of drafts.entries()) {
    const eventDraft = {
      ...importDraftToCalendarEventDraft(draft),
      source,
      sourceId: intakeId,
      ...(!hasExplicitTime(draft) && schoolVerified
        ? { notes: `${draft.notes || ''} School email did not specify a time.`.trim() }
        : {}),
    };
    const data = calendarEventDraftToDbData(familyId, eventDraft);
    const existing = persisted.find((event) =>
      event.id === importedEventId(intakeId, draftIndex) || sameImportedEvent(event, data)
    );
    if (existing) {
      if (!result.some((event) => event.id === existing.id)) result.push(existing);
      continue;
    }

    // A retry must retain events saved earlier, even if their dates have now passed.
    if (!isHighConfidenceAutoCreate(draft, options)) continue;

    let created;
    try {
      created = await prisma.calendarEvent.create({
        data: { id: importedEventId(intakeId, draftIndex), ...data },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      created = await prisma.calendarEvent.findUnique({ where: { id: importedEventId(intakeId, draftIndex) } });
      if (!created) throw error;
    }
    persisted.push(created);
    result.push(created);
  }
  return result;
};

const exportCalendarEvents = async (familyId: string, events: any[]): Promise<string[]> => {
  const pending = events.filter((event) => !event.googleEventId);
  if (pending.length === 0) return [];

  try {
    const exportConnection = await prisma.googleCalendarConnection.findUnique({
      where: { familyId },
      select: { enabled: true, selectedCalendarId: true },
    });
    if (!exportConnection?.enabled || !exportConnection.selectedCalendarId) return [];

    const { calendar, connection } = await getAuthedCalendarClient(familyId);
    const calendarId = connection.selectedCalendarId;
    if (!calendarId) return [];

    for (const event of pending) {
      const exported = await calendar.events.insert({
        calendarId,
        requestBody: googlePayloadFromFamilyEvent(toCalendarEventResponse(event)),
      });
      await prisma.calendarEvent.update({
        where: { id: event.id },
        data: { googleCalendarId: calendarId, googleEventId: exported.data.id || null },
      });
    }
    await prisma.googleCalendarConnection.update({
      where: { familyId },
      data: { lastExportAt: new Date() },
    });
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : 'Google Calendar export failed'];
  }
};

const createCalendarIntakeNotification = async (input: {
  familyId: string;
  intakeId: string;
  subject: string;
  sender: string;
  eventSource?: string;
  createdEvents: Array<{ id: string }>;
  needsReview: number;
  duplicateCount: number;
  conflictCount: number;
  draftCount: number;
  googleExportErrors?: string[];
}) => {
  const notificationId = `calendar-email-${input.intakeId}`;
  const title = input.createdEvents.length > 0 ? 'Calendar email processed' : 'Calendar email needs review';
  const message = input.createdEvents.length > 0
    ? `${input.createdEvents.length} event${input.createdEvents.length === 1 ? '' : 's'} added from "${input.subject || input.sender || 'email'}".`
    : `Review "${input.subject || input.sender || 'email'}" before adding calendar events.`;

  try {
    const notification = await prisma.notification.create({
      data: {
        id: notificationId,
        familyId: input.familyId,
        type: 'calendar_email_intake',
        title,
        message,
        priority: input.needsReview > 0 || input.conflictCount > 0 ? 'high' : 'medium',
        category: 'event',
        read: false,
        actionRequired: input.needsReview > 0 || input.conflictCount > 0 || input.draftCount === 0,
        relatedEventId: input.createdEvents[0]?.id,
        metadata: {
          source: input.eventSource || 'calendar-email',
          intakeId: input.intakeId,
          createdEventIds: input.createdEvents.map((event) => event.id),
          needsReview: input.needsReview,
          duplicateCount: input.duplicateCount,
          conflictCount: input.conflictCount,
          googleExportErrors: input.googleExportErrors || [],
        },
      },
    });
    await sendFamilyPushNotification(input.familyId, {
      title,
      body: message,
      tag: `calendar-email-${input.intakeId}`,
      data: {
        familyId: input.familyId,
        notificationId: notification.id,
        intakeId: input.intakeId,
        url: '/?view=calendar',
      },
    }).catch((error) => {
      console.warn('Calendar email push failed:', error);
    });
    return notification;
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return null;
    throw error;
  }
};

export type CalendarEmailIngestionResult = {
  statusCode: number;
  body: Record<string, any>;
};

export const ingestCalendarEmailPayload = async (
  payload: any,
  options: { familyId?: string; eventSource?: string; authenticatedSchoolSender?: boolean } = {},
): Promise<CalendarEmailIngestionResult> => {
  const data = payloadData(payload);
  const recipients = recipientsFromValue(data?.to || data?.recipient || data?.recipients);
  const family = await resolveFamily(recipients, options.familyId);
  if (!family) {
    return { statusCode: 404, body: { error: 'No matching family for inbound recipient' } };
  }

  const sender = emailFromValue(data?.from || data?.sender);
  const subject = String(data?.subject || '');
  const text = String(data?.text || data?.textBody || data?.plain_text || data?.plainText || '');
  const html = String(data?.html || data?.htmlBody || '');
  const messageId = data?.messageId || data?.message_id || data?.id || payload?.id || null;
  const inboundAttachments = (Array.isArray(data?.attachments) ? data.attachments : [])
    .map(inboundAttachment)
    .filter((attachment: ReturnType<typeof inboundAttachment>): attachment is NonNullable<ReturnType<typeof inboundAttachment>> => Boolean(attachment));
  const totalAttachmentBytes = inboundAttachments.reduce(
    (total: number, attachment: { sizeBytes: number }) => total + attachment.sizeBytes,
    0,
  );

  if (totalAttachmentBytes > MAX_CALENDAR_ATTACHMENT_TOTAL) {
    return { statusCode: 413, body: { error: 'Inbound attachments exceed the 20MB total limit' } };
  }

  if (messageId) {
    const existingIntake = await prisma.calendarEmailIntake.findFirst({
      where: { familyId: family.id, messageId: String(messageId) },
      select: { id: true, status: true, createdEventIds: true, parsedDrafts: true, metadata: true },
    });
    if (existingIntake) {
      const status = existingIntake.status === 'processing' ? 'review_required' : existingIntake.status;
      const intakeMetadata = existingIntake.metadata && typeof existingIntake.metadata === 'object' && !Array.isArray(existingIntake.metadata)
        ? existingIntake.metadata as Record<string, unknown>
        : {};
      const drafts = Array.isArray(existingIntake.parsedDrafts)
        ? existingIntake.parsedDrafts as unknown as CalendarImportDraft[]
        : [];
      const canResumeSchoolImport = intakeMetadata.schoolSenderVerified === true && existingIntake.status === 'processing';
      if (existingIntake.status === 'processing' && !canResumeSchoolImport) {
        await prisma.calendarEmailIntake.update({
          where: { id: existingIntake.id },
          data: {
            status,
            needsReview: drafts.length || 1,
          },
        });
      }
      if (canResumeSchoolImport) {
        const createdEvents = await persistHighConfidenceEvents(family.id, existingIntake.id, drafts, {
          eventSource: 'gmail-school-email',
          authenticatedSchoolSender: true,
        });
        const googleExportErrors = await exportCalendarEvents(family.id, createdEvents);
        if (googleExportErrors.length > 0) {
          return {
            statusCode: 503,
            body: { error: `Google Calendar export failed: ${googleExportErrors.join('; ')}` },
          };
        }
        const readyButNotCreated = drafts.filter((draft) => draft.importStatus === 'ready').length - createdEvents.length;
        const needsReview = readyButNotCreated + drafts.filter((draft) => draft.importStatus === 'needs_review').length;
        const duplicateCount = drafts.filter((draft) => draft.importStatus === 'duplicate').length;
        const conflictCount = drafts.filter((draft) => draft.importStatus === 'conflict').length;
        const resumedStatus = createdEvents.length > 0 && needsReview === 0 && conflictCount === 0
          ? 'auto_created'
          : drafts.length === 0
            ? 'no_events'
            : createdEvents.length > 0
              ? 'partial_review'
              : 'review_required';
        await prisma.calendarEmailIntake.update({
          where: { id: existingIntake.id },
          data: {
            status: resumedStatus,
            createdEventIds: createdEvents.map((event) => event.id),
            autoCreated: createdEvents.length,
            needsReview,
            duplicateCount,
            conflictCount,
          },
        });
        await createCalendarIntakeNotification({
          familyId: family.id,
          intakeId: existingIntake.id,
          subject,
          sender,
          eventSource: 'gmail-school-email',
          createdEvents,
          needsReview,
          duplicateCount,
          conflictCount,
          draftCount: drafts.length,
        }).catch((error) => {
          console.warn('Calendar email notification failed:', error);
        });
        return {
          statusCode: 200,
          body: {
            intakeId: existingIntake.id,
            status: resumedStatus,
            duplicate: true,
            createdEventIds: createdEvents.map((event) => event.id),
            autoCreated: createdEvents.length,
            needsReview,
          },
        };
      }
      return {
        statusCode: 200,
        body: {
          intakeId: existingIntake.id,
          status,
          duplicate: true,
          createdEventIds: existingIntake.createdEventIds,
        },
      };
    }
  }

  const extractedAttachmentText = await extractPdfAttachmentText(inboundAttachments);
  const combinedText = [text, ...extractedAttachmentText].filter(Boolean).join('\n\n');
  const normalizedText = normalizeCalendarEmailText({ subject, from: sender, text: combinedText, html });
  const existingEvents = await prisma.calendarEvent.findMany({
    where: { familyId: family.id },
    orderBy: { eventDate: 'asc' },
  });
  const people = family.members.map((member) => ({
    id: member.id,
    name: member.name,
    color: member.color,
    icon: member.icon,
    role: member.role,
    ageGroup: member.ageGroup,
  }));
  const isAuthenticatedSchoolEmail =
    options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email';
  const drafts = parseCalendarImportText({
    text: normalizedText,
    people,
    existingEvents: existingEvents.map(toCalendarEventResponse),
    defaultPersonId: isAuthenticatedSchoolEmail
      ? schoolDefaultPersonId(family.members) ?? ''
      : people[0]?.id,
    today: new Date(),
  }) as CalendarImportDraft[];

  const deterministicIntakeId = messageId
    ? `mail_${createHash('sha256').update(`${family.id}\0${String(messageId)}`).digest('hex')}`
    : undefined;
  let intake;
  try {
    intake = await prisma.calendarEmailIntake.create({
      data: {
      ...(deterministicIntakeId ? { id: deterministicIntakeId } : {}),
      familyId: family.id,
      messageId,
      recipient: recipients[0] || null,
      sender,
      subject,
      text: combinedText,
      html,
      normalizedText,
      parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
      status: options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email'
        ? 'processing'
        : 'review_required',
      needsReview: drafts.length,
      metadata: {
        providerType: payload?.type || payload?.event || null,
        schoolSenderVerified: Boolean(
          options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email'
        ),
        documentSummary: summarizeSchoolDocument(normalizedText),
        attachmentCount: Array.isArray(data?.attachments) ? data.attachments.length : 0,
        extractedPdfCount: extractedAttachmentText.length,
        attachmentNames: (Array.isArray(data?.attachments) ? data.attachments : []).map((attachment: any) =>
          String(attachment?.fileName || attachment?.filename || attachment?.name || 'email-attachment')
        ),
      } as Prisma.InputJsonValue,
      ...(inboundAttachments.length > 0 ? { attachments: { create: inboundAttachments } } : {}),
      },
    });
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002' && deterministicIntakeId) {
      const existingIntake = await prisma.calendarEmailIntake.findFirst({
        where: { familyId: family.id, messageId: String(messageId) },
        select: { id: true, status: true, createdEventIds: true },
      });
      if (existingIntake) {
        return {
          statusCode: 200,
          body: {
            intakeId: existingIntake.id,
            status: existingIntake.status,
            duplicate: true,
            createdEventIds: existingIntake.createdEventIds,
          },
        };
      }
    }
    throw error;
  }

  const createdEvents = await persistHighConfidenceEvents(family.id, intake.id, drafts, options);
  const googleExportErrors = await exportCalendarEvents(family.id, createdEvents);

  const readyButNotCreated = drafts.filter((draft) => draft.importStatus === 'ready').length - createdEvents.length;
  const needsReview = readyButNotCreated + drafts.filter((draft) => draft.importStatus === 'needs_review').length;
  const duplicateCount = drafts.filter((draft) => draft.importStatus === 'duplicate').length;
  const conflictCount = drafts.filter((draft) => draft.importStatus === 'conflict').length;
  const status = createdEvents.length > 0 && needsReview === 0 && conflictCount === 0
    ? 'auto_created'
    : drafts.length === 0
      ? 'no_events'
      : createdEvents.length > 0
        ? 'partial_review'
        : 'review_required';

  const updatedIntake = await prisma.calendarEmailIntake.update({
    where: { id: intake.id },
    data: {
      status,
      createdEventIds: createdEvents.map((event) => event.id),
      autoCreated: createdEvents.length,
      needsReview,
      duplicateCount,
      conflictCount,
    },
  });

  await createCalendarIntakeNotification({
    familyId: family.id,
    intakeId: intake.id,
    subject,
    sender,
    eventSource: options.eventSource,
    createdEvents,
    needsReview,
    duplicateCount,
    conflictCount,
    draftCount: drafts.length,
    googleExportErrors,
  }).catch((error) => {
    console.warn('Calendar email notification failed:', error);
  });

  return {
    statusCode: 200,
    body: {
      intakeId: updatedIntake.id,
      status: updatedIntake.status,
      parsed: drafts.length,
      autoCreated: createdEvents.length,
      needsReview,
      duplicates: duplicateCount,
      conflicts: conflictCount,
      googleExportErrors,
      createdEventIds: createdEvents.map((event) => event.id),
    },
  };
};
