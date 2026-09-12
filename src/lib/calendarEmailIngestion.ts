import type { Prisma } from '@prisma/client';
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

const isHighConfidenceAutoCreate = (draft: CalendarImportDraft) =>
  draft.importStatus === 'ready' &&
  draft.confidence >= 0.9 &&
  draft.time !== '09:00' &&
  Boolean(draft.person);

export type CalendarEmailIngestionResult = {
  statusCode: number;
  body: Record<string, any>;
};

export const ingestCalendarEmailPayload = async (
  payload: any,
  options: { familyId?: string; eventSource?: string } = {},
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
  }));
  const drafts = parseCalendarImportText({
    text: normalizedText,
    people,
    existingEvents: existingEvents.map(toCalendarEventResponse),
    defaultPersonId: people[0]?.id,
    today: new Date(),
  }) as CalendarImportDraft[];

  const intake = await prisma.calendarEmailIntake.create({
    data: {
      familyId: family.id,
      messageId,
      recipient: recipients[0] || null,
      sender,
      subject,
      text: combinedText,
      html,
      normalizedText,
      parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
      status: 'processing',
      metadata: {
        providerType: payload?.type || payload?.event || null,
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

  const createdEvents = [];
  for (const draft of drafts.filter(isHighConfidenceAutoCreate)) {
    const eventDraft = {
      ...importDraftToCalendarEventDraft(draft),
      source: options.eventSource || 'calendar-email',
      sourceId: intake.id,
    };
    const created = await prisma.calendarEvent.create({
      data: calendarEventDraftToDbData(family.id, eventDraft),
    });
    createdEvents.push(created);
  }

  const googleExportErrors: string[] = [];
  try {
    if (createdEvents.length > 0) {
      const { calendar, connection } = await getAuthedCalendarClient(family.id);
      const calendarId = connection.selectedCalendarId;
      if (calendarId) {
        for (const createdEvent of createdEvents) {
          const familyEvent = toCalendarEventResponse(createdEvent);
          const exported = await calendar.events.insert({
            calendarId,
            requestBody: googlePayloadFromFamilyEvent(familyEvent),
          });
          await prisma.calendarEvent.update({
            where: { id: createdEvent.id },
            data: { googleCalendarId: calendarId, googleEventId: exported.data.id || null },
          });
        }
        await prisma.googleCalendarConnection.update({
          where: { familyId: family.id },
          data: { lastExportAt: new Date() },
        });
      }
    }
  } catch (error) {
    googleExportErrors.push(error instanceof Error ? error.message : 'Google Calendar export failed');
  }

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

  const notification = await prisma.notification.create({
    data: {
      familyId: family.id,
      type: 'calendar_email_intake',
      title: createdEvents.length > 0 ? 'Calendar email processed' : 'Calendar email needs review',
      message: createdEvents.length > 0
        ? `${createdEvents.length} event${createdEvents.length === 1 ? '' : 's'} added from "${subject || sender || 'email'}".`
        : `Review "${subject || sender || 'email'}" before adding calendar events.`,
      priority: needsReview > 0 || conflictCount > 0 ? 'high' : 'medium',
      category: 'event',
      read: false,
      actionRequired: needsReview > 0 || conflictCount > 0 || drafts.length === 0,
      relatedEventId: createdEvents[0]?.id,
      metadata: {
        source: options.eventSource || 'calendar-email',
        intakeId: intake.id,
        createdEventIds: createdEvents.map((event) => event.id),
        needsReview,
        duplicateCount,
        conflictCount,
        googleExportErrors,
      },
    },
  });

  await sendFamilyPushNotification(family.id, {
    title: notification.title,
    body: notification.message,
    tag: `calendar-email-${intake.id}`,
    data: {
      familyId: family.id,
      notificationId: notification.id,
      intakeId: intake.id,
      url: '/?view=calendar',
    },
  }).catch((error) => {
    console.warn('Calendar email push failed:', error);
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
