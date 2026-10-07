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
} from '@/utils/calendarImport';
import { parseDateKey } from '@/utils/recurrence';
import { annotateSchoolIntakeDrafts, loadSchoolRules, prepareSchoolIntake, resolveStoredSchoolDrafts,
  schoolDraftKey, schoolEventMetadata, schoolImportedEventId } from '@/lib/schoolIntakeServer';
import { schoolMetadata, type SchoolDraft } from '@/utils/schoolSources';
import { calendarIntakeState, findImportedDraftEvent } from '@/lib/calendarIntakeState';
import { isAdultSchoolEvent } from '@/utils/schoolEventPresentation';
import { isStewartFlemingSender } from '@/utils/schoolEmail';
import { schoolDraftHasUnconfirmedOffer, schoolDraftNonEventReason, schoolDraftTimeNeedsReview } from '@/lib/schoolIntakeDraftSafety';

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
  const genericTitle = Boolean(schoolDraftNonEventReason(draft));
  const today = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const todayKey = `${today.find((part) => part.type === 'year')?.value}-${today.find((part) => part.type === 'month')?.value}-${today.find((part) => part.type === 'day')?.value}`;
  const hasExplicitTime = /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(draft.source);
  const verifiedSchoolEvent = options.eventSource === 'gmail-school-email' && options.authenticatedSchoolSender === true;
  const unconfirmedOffer = schoolDraftHasUnconfirmedOffer(draft);
  if (schoolDraftTimeNeedsReview(draft)) return false;
  if (isAdultSchoolEvent(draft.title) && (draft as SchoolDraft).schoolAssignment?.attendeeStatus !== 'confirmed') return false;

  if (!parseDateKey(draft.date) || (draft.endDate && !parseDateKey(draft.endDate)) ||
      draft.importStatus !== 'ready' || !draft.person || genericTitle || unconfirmedOffer || draft.date < todayKey) return false;
  if (draft.confidence >= 0.9 && hasExplicitTime) return true;
  return verifiedSchoolEvent && draft.type === 'education' && draft.confidence >= 0.85;
};

const hasExplicitTime = (draft: CalendarImportDraft) =>
  /\b\d{1,2}(?::|\.)(\d{2})\s*(?:am|pm)?\b|\b\d{1,2}\s*(?:am|pm)\b/i.test(draft.source);

const persistHighConfidenceEvents = async (
  familyId: string,
  intakeId: string,
  drafts: CalendarImportDraft[],
  options: { eventSource?: string; authenticatedSchoolSender?: boolean },
  db: Prisma.TransactionClient = prisma,
) => {
  const schoolVerified = options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email';
  const source = schoolVerified ? 'gmail-school-email' :
    options.eventSource === 'gmail-calendar-email' ? options.eventSource : 'calendar-email';
  const persisted = await db.calendarEvent.findMany({ where: { familyId, sourceId: intakeId } });
  const intake = await db.calendarEmailIntake.findFirst({ where: { id: intakeId, familyId } });
  const result: any[] = [];

  for (const [draftIndex, draft] of drafts.entries()) {
    const eventId = schoolImportedEventId(familyId, intakeId, (draft as SchoolDraft).sourceEventKey || schoolDraftKey(draft), draft.person);
    const eventDraft = {
      ...importDraftToCalendarEventDraft(draft),
      source,
      sourceId: intakeId,
      ...(intake ? { metadata: schoolEventMetadata(draft, intake) } : {}),
      ...(!hasExplicitTime(draft) && schoolVerified
        ? { notes: `${draft.notes || ''} School email did not specify a time.`.trim() }
        : {}),
    };
    const data = calendarEventDraftToDbData(familyId, eventDraft);
    const existing = findImportedDraftEvent(familyId, intakeId, draft, draftIndex, persisted);
    if (existing) {
      if (!result.some((event) => event.id === existing.id)) result.push(existing);
      continue;
    }

    // A retry must retain events saved earlier, even if their dates have now passed.
    if (!isHighConfidenceAutoCreate(draft, options)) continue;

    let created;
    try {
      created = await db.calendarEvent.create({
        data: { id: eventId, ...data },
      });
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
      created = await db.calendarEvent.findUnique({ where: { id: eventId } });
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
  contentRequired?: boolean;
  googleExportErrors?: string[];
}) => {
  const notificationId = `calendar-email-${input.intakeId}`;
  const actionRequired = input.needsReview > 0 || input.conflictCount > 0 || Boolean(input.contentRequired);
  const title = input.createdEvents.length > 0 || !actionRequired ? 'Calendar email processed' : 'Calendar email needs review';
  const message = input.createdEvents.length > 0
    ? `${input.createdEvents.length} event${input.createdEvents.length === 1 ? '' : 's'} added from "${input.subject || input.sender || 'email'}".`
    : actionRequired ? `Review "${input.subject || input.sender || 'email'}" before adding calendar events.`
      : `No outstanding calendar events in "${input.subject || input.sender || 'email'}".`;

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
        actionRequired,
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
  options: { familyId?: string; eventSource?: string; authenticatedSchoolSender?: boolean; reviewOnly?: boolean } = {},
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
            needsReview: drafts.filter((draft) => draft.importStatus !== 'duplicate').length,
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
        const state = calendarIntakeState({ ...existingIntake, familyId: family.id }, drafts, createdEvents);
        const { needsReview, duplicateCount, conflictCount, status: resumedStatus } = state;
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
        }).catch((error) => {
          console.warn('Calendar email notification failed:', error);
        });
        return {
          statusCode: 200,
          body: {
            intakeId: existingIntake.id,
            ...state,
            status: resumedStatus,
            duplicate: true,
            createdEventIds: createdEvents.map((event) => event.id),
            autoCreated: createdEvents.length,
            needsReview,
          },
        };
      }
      const savedEvents = await prisma.calendarEvent.findMany({ where: { familyId: family.id, sourceId: existingIntake.id } });
      const state = calendarIntakeState({ ...existingIntake, familyId: family.id, status }, drafts, savedEvents);
      return {
        statusCode: 200,
        body: {
          intakeId: existingIntake.id,
          ...state,
          duplicate: true,
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
  const prepared = await prepareSchoolIntake({
    familyId: family.id,
    members: people,
    text: normalizedText,
    rawText: combinedText,
    html,
    sender,
    subject,
    existingEvents: existingEvents.map(toCalendarEventResponse),
    defaultPersonId: isAuthenticatedSchoolEmail
      ? ''
      : people[0]?.id,
    today: new Date(),
  });
  const drafts = prepared.drafts;

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
      status: prepared.source.contentRequired ? 'content_required' : options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email'
        ? 'processing'
        : 'review_required',
      needsReview: prepared.source.contentRequired ? 1 : drafts.length,
      metadata: {
        ...prepared.metadata,
        gmailMessageId: typeof data?.gmailMessageId === 'string' ? data.gmailMessageId : null,
        gmailThreadId: typeof data?.gmailThreadId === 'string' ? data.gmailThreadId : null,
        sourceDate: typeof data?.sourceDate === 'string' ? data.sourceDate : null,
        gmailInternalDate: typeof data?.gmailInternalDate === 'string' ? data.gmailInternalDate : null,
        providerType: payload?.type || payload?.event || null,
        schoolSenderVerified: Boolean(
          options.authenticatedSchoolSender && options.eventSource === 'gmail-school-email'
        ),
        documentSummary: prepared.metadata.documentSummary,
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

  const reviewOnly = options.reviewOnly || prepared.source.contentRequired ||
    (prepared.source.isSchool && !isAuthenticatedSchoolEmail);
  const createdEvents = reviewOnly ? [] : await persistHighConfidenceEvents(family.id, intake.id, drafts, options);
  const googleExportErrors = await exportCalendarEvents(family.id, createdEvents);

  const state = calendarIntakeState({ id: intake.id, familyId: family.id,
    status: prepared.source.contentRequired ? 'content_required' : 'processing' }, drafts, createdEvents,
    (draft) => !reviewOnly && isHighConfidenceAutoCreate(draft, options));
  const { needsReview, duplicateCount, conflictCount, status } = state;

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
    contentRequired: prepared.source.contentRequired,
    googleExportErrors,
  }).catch((error) => {
    console.warn('Calendar email notification failed:', error);
  });

  return {
    statusCode: 200,
    body: {
      intakeId: updatedIntake.id,
      ...state,
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

export class SavedIntakeProcessingError extends Error {
  constructor(message: string, public statusCode: number) { super(message); }
}

/** Explicit single-intake processing. No caller-supplied drafts, sender trust, or event IDs. */
export const autoProcessSavedCalendarIntake = async (familyId: string, intakeId: string) => {
  const options = { eventSource: 'gmail-school-email', authenticatedSchoolSender: true };
  const result = await prisma.$transaction(async (db) => {
    const intake = await db.calendarEmailIntake.findFirst({ where: { familyId, id: intakeId } });
    if (!intake) throw new SavedIntakeProcessingError('Calendar inbox item was not found', 404);
    if (schoolMetadata(intake.metadata).schoolSenderVerified !== true ||
        !isStewartFlemingSender(intake.sender || '') ||
        !['processing', 'review_required', 'partial_review', 'auto_created', 'no_events'].includes(intake.status) ||
        schoolMetadata(intake.metadata).schoolDismissed) {
      throw new SavedIntakeProcessingError('This intake is not eligible for automatic processing', 409);
    }
    if (!Array.isArray(intake.parsedDrafts) || intake.parsedDrafts.length > 200) {
      throw new SavedIntakeProcessingError('This intake requires manual review', 409);
    }
    const members = await db.familyMember.findMany({ where: { familyId } });
    const { rules } = await loadSchoolRules(familyId, members, false, db);
    const resolved = resolveStoredSchoolDrafts(intake, rules, members);
    if (resolved.source.contentRequired) throw new SavedIntakeProcessingError('Source content is required', 409);
    const existing = await db.calendarEvent.findMany({ where: { familyId } });
    const drafts = annotateSchoolIntakeDrafts(resolved.drafts.map((draft) => members.some((member) => member.id === draft.person)
      ? draft : { ...draft, importStatus: 'needs_review' as const }),
      existing.filter((event) => event.sourceId !== intakeId).map(toCalendarEventResponse));
    const before = calendarIntakeState(intake, drafts, existing);
    // Recheck eligibility and current conflicts; own persisted events are matched separately.
    const events = await persistHighConfidenceEvents(familyId, intakeId, drafts, options, db);
    const state = calendarIntakeState(intake, drafts, [...existing, ...events], (draft) =>
      members.some((member) => member.id === draft.person) && isHighConfidenceAutoCreate(draft, options));
    const updated = await db.calendarEmailIntake.updateMany({
      where: { id: intakeId, familyId, updatedAt: intake.updatedAt },
      data: { status: state.status, createdEventIds: state.createdEventIds,
        autoCreated: state.importedEventCount, needsReview: state.needsReview,
        duplicateCount: state.duplicateCount, conflictCount: state.conflictCount,
        parsedDrafts: drafts as unknown as Prisma.InputJsonValue },
    });
    if (updated.count !== 1) throw new SavedIntakeProcessingError('This intake changed. Reload before processing.', 409);
    await db.notification.updateMany({ where: { familyId, id: `calendar-email-${intakeId}` },
      data: { actionRequired: state.actionRequired } });
    return { ...state, events, newlyCreatedCount: state.createdEventIds.filter((id) => !before.createdEventIds.includes(id)).length };
  }, { isolationLevel: 'Serializable' });
  const { events, ...state } = result;
  const googleExportErrors = await exportCalendarEvents(familyId, events);
  return { intakeId, ...state, parsedDrafts: state.outstandingDrafts, autoCreated: state.importedEventCount, googleExportErrors };
};

/** Round-robin bounded scan, independent of Gmail's message date/cursor. */
export const sweepSavedCalendarIntakes = async (familyId: string, afterId?: string) => {
  const batchLimit = 10;
  const candidates = await prisma.calendarEmailIntake.findMany({
    where: { familyId, status: { in: ['processing', 'review_required', 'partial_review', 'auto_created'] },
      metadata: { path: ['schoolSenderVerified'], equals: true },
      ...(afterId ? { id: { gt: afterId } } : {}) },
    orderBy: { id: 'asc' }, take: batchLimit + 1, select: { id: true },
  });
  const page = candidates.slice(0, batchLimit);
  let autoCreated = 0;
  let processed = 0;
  let needsReview = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const intake of page) {
    try {
      const result = await autoProcessSavedCalendarIntake(familyId, intake.id);
      autoCreated += result.newlyCreatedCount;
      needsReview += result.needsReview;
      processed += 1;
      errors.push(...result.googleExportErrors.map((error) => `${intake.id}: ${error}`));
    } catch (error) {
      if (error instanceof SavedIntakeProcessingError && [404, 409].includes(error.statusCode)) skipped += 1;
      else errors.push(`${intake.id}: ${error instanceof Error ? error.message : 'Saved intake processing failed'}`);
    }
  }
  const hasMore = candidates.length > batchLimit;
  return { checked: page.length, processed, skipped, autoCreated, needsReview, batchLimit, hasMore,
    nextAfterId: hasMore ? page[page.length - 1].id : null, errors };
};
