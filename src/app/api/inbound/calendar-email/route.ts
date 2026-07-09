import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { calendarEventDraftToDbData, toCalendarEventResponse } from '@/lib/calendarEventMapping';
import { getAuthedCalendarClient, googlePayloadFromFamilyEvent } from '@/lib/googleCalendarServer';
import { sendFamilyPushNotification } from '@/lib/webPush';
import {
  CalendarImportDraft,
  importDraftToCalendarEventDraft,
  normalizeCalendarEmailText,
  parseCalendarImportText,
} from '@/utils/calendarImport';

export const runtime = 'nodejs';

const webhookSecret = () =>
  process.env.CALENDAR_INBOUND_WEBHOOK_SECRET || process.env.RESEND_WEBHOOK_SECRET || '';

const compare = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
};

const verifySimpleSignature = (rawBody: string, signature: string, secret: string) => {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return compare(signature.replace(/^sha256=/, ''), expected);
};

const verifySvixSignature = (rawBody: string, request: NextRequest, secret: string) => {
  const id = request.headers.get('svix-id');
  const timestamp = request.headers.get('svix-timestamp');
  const signature = request.headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;

  const secretValue = secret.startsWith('whsec_')
    ? Buffer.from(secret.slice(6), 'base64')
    : Buffer.from(secret);
  const signedPayload = `${id}.${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', secretValue).update(signedPayload).digest('base64');
  return signature
    .split(' ')
    .some((part) => compare(part.replace(/^v\d+,/, ''), expected));
};

const verifyWebhook = (rawBody: string, request: NextRequest) => {
  const secret = webhookSecret();
  if (!secret) {
    return process.env.NODE_ENV !== 'production';
  }

  const simpleSignature =
    request.headers.get('x-family-hub-signature') ||
    request.headers.get('x-resend-signature') ||
    request.headers.get('resend-signature');

  if (simpleSignature && verifySimpleSignature(rawBody, simpleSignature, secret)) {
    return true;
  }

  return verifySvixSignature(rawBody, request, secret);
};

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

const resolveFamily = async (recipients: string[]) => {
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
  if (fallbackFamilyId) {
    return prisma.family.findUnique({
      where: { id: fallbackFamilyId },
      include: { members: { orderBy: { createdAt: 'asc' } } },
    });
  }

  return null;
};

const isHighConfidenceAutoCreate = (draft: CalendarImportDraft) =>
  draft.importStatus === 'ready' &&
  draft.confidence >= 0.9 &&
  draft.time !== '09:00' &&
  Boolean(draft.person);

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  if (!verifyWebhook(rawBody, request)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
  }

  const data = payloadData(payload);
  const recipients = recipientsFromValue(data.to || data.recipient || data.recipients);
  const family = await resolveFamily(recipients);
  if (!family) {
    return NextResponse.json({ error: 'No matching family for inbound recipient' }, { status: 404 });
  }

  const sender = emailFromValue(data.from || data.sender);
  const subject = data.subject || '';
  const text = data.text || data.textBody || data.plain_text || data.plainText || '';
  const html = data.html || data.htmlBody || '';
  const messageId = data.messageId || data.message_id || data.id || payload.id || null;

  const normalizedText = normalizeCalendarEmailText({ subject, from: sender, text, html });
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
      text,
      html,
      normalizedText,
      parsedDrafts: drafts as unknown as Prisma.InputJsonValue,
      status: 'processing',
      metadata: {
        providerType: payload.type || payload.event || null,
      },
    },
  });

  const createdEvents = [];
  for (const draft of drafts.filter(isHighConfidenceAutoCreate)) {
    const eventDraft = {
      ...importDraftToCalendarEventDraft(draft),
      source: 'calendar-email',
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
            data: {
              googleCalendarId: calendarId,
              googleEventId: exported.data.id || null,
            },
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
  const needsReview =
    readyButNotCreated +
    drafts.filter((draft) => draft.importStatus === 'needs_review').length;
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
        source: 'calendar-email',
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

  return NextResponse.json({
    intakeId: updatedIntake.id,
    status: updatedIntake.status,
    parsed: drafts.length,
    autoCreated: createdEvents.length,
    needsReview,
    duplicates: duplicateCount,
    conflicts: conflictCount,
    googleExportErrors,
    createdEventIds: createdEvents.map((event) => event.id),
  });
}
