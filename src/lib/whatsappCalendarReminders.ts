import { createHash, createHmac, timingSafeEqual } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';

type WhatsAppConfig = {
  accessToken: string;
  phoneNumberId: string;
  recipient: string;
  templateName: string;
  templateLanguage: string;
  graphApiVersion: string;
};

type WhatsAppEvent = {
  id: string;
  familyId: string;
  title: string;
  eventDate: Date;
  eventTime: Date;
  eventType: string;
  personId: string;
  notes?: string | null;
  person?: { name: string } | null;
};

const asObject = (value: Prisma.JsonValue | null): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
const metadataEquals = (value: Prisma.JsonValue | null) => ({
  equals: value === null ? Prisma.DbNull : value as Prisma.InputJsonValue,
});

const consentRecordId = (familyId: string) => `wa-consent-${familyId}`;
const recipientHash = (recipient: string) => createHash('sha256').update(recipient).digest('hex');

export type WhatsAppConsentState = 'not_configured' | 'not_confirmed' | 'opted_in' | 'opted_out';

export const getWhatsAppConfig = (env: NodeJS.ProcessEnv = process.env): WhatsAppConfig | null => {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const recipientRaw = env.WHATSAPP_RECIPIENT_E164?.trim() || '';
  const recipient = recipientRaw.replace(/[\s()+.-]/g, '');
  const templateName = env.WHATSAPP_TEMPLATE_NAME?.trim();
  const templateLanguage = env.WHATSAPP_TEMPLATE_LANGUAGE?.trim() || 'en_GB';
  if (!accessToken || !phoneNumberId || !/^\d{8,15}$/.test(recipient) || !templateName) return null;
  return {
    accessToken,
    phoneNumberId,
    recipient,
    templateName,
    templateLanguage,
    graphApiVersion: env.WHATSAPP_GRAPH_API_VERSION?.trim() || 'v25.0',
  };
};

export const buildWhatsAppReminderPayload = (
  config: Pick<WhatsAppConfig, 'recipient' | 'templateName' | 'templateLanguage'>,
  title: string,
  dateLabel: string,
) => ({
  messaging_product: 'whatsapp',
  recipient_type: 'individual',
  to: config.recipient,
  type: 'template',
  template: {
    name: config.templateName,
    language: { code: config.templateLanguage },
    components: [{
      type: 'body',
      parameters: [
        { type: 'text', text: title.slice(0, 256) },
        { type: 'text', text: dateLabel.slice(0, 256) },
      ],
    }],
  },
});

export const isValidWhatsAppSignature = (rawBody: Buffer, signature: string | null, appSecret: string) => {
  if (!signature?.startsWith('sha256=')) return false;
  const received = Buffer.from(signature.slice('sha256='.length), 'hex');
  const expected = createHmac('sha256', appSecret).update(rawBody).digest();
  return received.length === expected.length && timingSafeEqual(received, expected);
};

export const getWhatsAppConsentState = async (familyId: string): Promise<WhatsAppConsentState> => {
  const config = getWhatsAppConfig();
  if (!config) return 'not_configured';
  const record = await prisma.notification.findUnique({
    where: { id: consentRecordId(familyId) },
    select: { metadata: true },
  });
  const metadata = asObject(record?.metadata ?? null);
  if (metadata.recipientHash !== recipientHash(config.recipient)) return 'not_confirmed';
  return metadata.whatsappConsent === 'opted_out' ? 'opted_out' :
    metadata.whatsappConsent === 'opted_in' ? 'opted_in' : 'not_confirmed';
};

export const setWhatsAppConsentState = async (
  familyId: string,
  recipient: string,
  state: 'opted_in' | 'opted_out',
  at = new Date(),
) => {
  const id = consentRecordId(familyId);
  const config = getWhatsAppConfig();
  if (!config || config.recipient !== recipient) return false;
  const metadata = {
    recipientHash: recipientHash(recipient),
    whatsappConsent: state,
    whatsappConsentAt: at.toISOString(),
    whatsappConsentSource: 'whatsapp-inbound-keyword',
  } as Prisma.InputJsonObject;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await prisma.notification.findUnique({ where: { id }, select: { metadata: true } });
    if (current) {
      const currentMetadata = asObject(current.metadata);
      const currentAt = typeof currentMetadata.whatsappConsentAt === 'string'
        ? Date.parse(currentMetadata.whatsappConsentAt)
        : 0;
      if (currentAt > at.getTime() ||
          (currentAt === at.getTime() &&
            (currentMetadata.whatsappConsent === 'opted_out' || state === 'opted_in'))) return false;
      const updated = await prisma.notification.updateMany({
        where: { id, metadata: metadataEquals(current.metadata) },
        data: { metadata },
      });
      if (updated.count === 1) return true;
      continue;
    }
    try {
      await prisma.notification.create({
        data: {
          id,
          familyId,
          type: 'whatsapp_consent',
          title: 'WhatsApp reminder preference',
          message: state === 'opted_in' ? 'WhatsApp calendar reminders enabled.' : 'WhatsApp calendar reminders paused.',
          priority: 'low',
          category: 'settings',
          read: true,
          actionRequired: false,
          metadata,
        },
      });
      return true;
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
    }
  }
  return false;
};

const sendTemplate = async (config: WhatsAppConfig, title: string, dateLabel: string) => {
  let response: Response;
  try {
    response = await fetch(
      `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildWhatsAppReminderPayload(config, title, dateLabel)),
      },
    );
  } catch (error) {
    throw Object.assign(new Error(error instanceof Error ? error.message : 'WhatsApp request outcome is unknown'), {
      outcomeUnknown: true,
    });
  }
  const result = await response.json().catch(() => ({})) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string; code?: number };
  };
  if (!response.ok || !result.messages?.[0]?.id) {
    const detail = result.error?.message || `HTTP ${response.status}`;
    throw Object.assign(new Error(`WhatsApp send failed: ${detail}`), {
      outcomeUnknown: response.status >= 500 || (response.ok && !result.messages?.[0]?.id),
    });
  }
  return result.messages[0].id;
};

const partsInLondon = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

export const londonWallTimeToUtc = (eventDate: Date, eventTime: Date) => {
  const year = eventDate.getUTCFullYear();
  const month = eventDate.getUTCMonth() + 1;
  const day = eventDate.getUTCDate();
  const hour = eventTime.getUTCHours();
  const minute = eventTime.getUTCMinutes();
  const targetWallClock = Date.UTC(year, month - 1, day, hour, minute);
  for (let adjustment = 0; adjustment <= 180; adjustment += 1) {
    const adjustedWallClock = new Date(targetWallClock + adjustment * 60_000);
    const targetKey = [
      adjustedWallClock.getUTCFullYear(), adjustedWallClock.getUTCMonth() + 1,
      adjustedWallClock.getUTCDate(), adjustedWallClock.getUTCHours(), adjustedWallClock.getUTCMinutes(),
    ].join('-');
    const candidates = [-120, -60, 0, 60, 120].map((offsetMinutes) =>
      new Date(adjustedWallClock.getTime() - offsetMinutes * 60_000)
    );
    const exact = candidates.filter((candidate) => {
      const local = partsInLondon(candidate);
      return [local.year, local.month, local.day, local.hour, local.minute]
        .map(Number)
        .join('-') === targetKey;
    });
    if (exact.length > 0) return exact.sort((a, b) => a.getTime() - b.getTime())[0];
  }
  throw new Error('Could not resolve the event time in the Europe/London time zone');
};

const eventStart = (event: Pick<WhatsAppEvent, 'eventDate' | 'eventTime'>) =>
  londonWallTimeToUtc(event.eventDate, event.eventTime);

export const calendarReminderWindow = (minutesUntil: number, eventType: string, timeConfirmed = true) => {
  if (!timeConfirmed) {
    if (minutesUntil <= 24 * 60) return '24h';
    if (eventType === 'education' && minutesUntil <= 7 * 24 * 60) return '7d';
    return null;
  }
  if (minutesUntil <= 90) return '1h';
  if (minutesUntil <= 24 * 60) return '24h';
  if (eventType === 'education' && minutesUntil <= 7 * 24 * 60) return '7d';
  return null;
};

const eventDateLabel = (date: Date, timeConfirmed = true) => new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'full',
  ...(timeConfirmed ? { timeStyle: 'short' as const } : {}),
}).format(date) + (timeConfirmed ? '' : ' (time not provided by school)');

export const reserveWhatsAppReminderMarker = async (
  event: WhatsAppEvent,
  window: string,
  now: Date,
) => {
  const dedupeKey = `event-reminder:${event.id}:${window}`;
  const markerId = `wa-reminder-${event.id}-${window}`;
  const existing = await prisma.notification.findUnique({
    where: { id: markerId },
    select: { id: true, metadata: true },
  });
  const metadata = asObject(existing?.metadata ?? null);
  const status = metadata.whatsappStatus;
  if (status === 'accepted' || status === 'sent' || status === 'delivered' || status === 'read' || status === 'unknown') return null;
  const lastAttemptAt = typeof metadata.whatsappAttemptAt === 'string'
    ? new Date(metadata.whatsappAttemptAt).getTime()
    : 0;
  if (status === 'sending' && existing) {
    if (now.getTime() - lastAttemptAt < 10 * 60 * 1000) return null;
    await prisma.notification.updateMany({
      where: { id: existing.id, metadata: metadataEquals(existing.metadata) },
      data: {
        metadata: {
          ...metadata,
          whatsappStatus: 'unknown',
          whatsappManualReviewRequired: true,
        } as Prisma.InputJsonObject,
        read: false,
        actionRequired: true,
        priority: 'high',
      },
    });
    return null;
  }
  if (status === 'cancelled' || (status === 'failed' && now.getTime() - lastAttemptAt < 60 * 60 * 1000)) return null;

  const nextMetadata = {
    ...metadata,
    dedupeKey,
    source: metadata.source || 'school-email-reminder',
    eventId: event.id,
    whatsappStatus: 'sending',
    whatsappAttemptAt: now.toISOString(),
  } as Prisma.InputJsonObject;
  if (existing) {
    const claimed = await prisma.notification.updateMany({
      where: { id: existing.id, metadata: metadataEquals(existing.metadata) },
      data: { metadata: nextMetadata },
    });
    return claimed.count === 1 ? existing.id : null;
  }

  try {
    const created = await prisma.notification.create({
      data: {
      id: markerId,
      familyId: event.familyId,
      type: 'reminder',
      title: `Upcoming: ${event.title}`,
      message: `${event.title} is upcoming ${eventDateLabel(eventStart(event))}.`,
      priority: 'high',
      category: 'event',
      read: true,
      actionRequired: false,
      relatedEventId: event.id,
      relatedPersonId: event.personId,
      metadata: nextMetadata,
      },
      select: { id: true },
    });
    return created.id;
  } catch (error) {
    if ((error as { code?: string })?.code === 'P2002') return null;
    throw error;
  }
};

export const sendUpcomingSchoolWhatsAppReminders = async (familyId: string, now = new Date()) => {
  const config = getWhatsAppConfig();
  if (!config) return { configured: false, matched: 0, accepted: 0, skipped: 'WhatsApp sender or approved template is not configured' };
  const consent = await getWhatsAppConsentState(familyId);
  if (consent !== 'opted_in') {
    return { configured: true, consent, matched: 0, accepted: 0, skipped: consent === 'opted_out' ? 'Recipient opted out' : 'Recipient has not confirmed WhatsApp opt-in' };
  }

  const events = await prisma.calendarEvent.findMany({
    where: {
      familyId,
      source: 'gmail-school-email',
      eventDate: { gte: new Date(now.getTime() - 2 * 60 * 60 * 1000), lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000) },
    },
    include: { person: { select: { name: true } } },
    orderBy: { eventDate: 'asc' },
    take: 200,
  });

  let accepted = 0;
  let skipped = 0;
  const errors: string[] = [];
  for (const event of events) {
    if (await getWhatsAppConsentState(familyId) !== 'opted_in') break;
    const start = eventStart(event);
    const minutesUntil = Math.round((start.getTime() - now.getTime()) / 60_000);
    if (minutesUntil < 0) continue;
    const timeConfirmed = !/(?:did not specify a time|time not provided by source)/i.test(event.notes || '');
    const window = calendarReminderWindow(minutesUntil, event.eventType, timeConfirmed);
    if (!window) continue;

    let markerId: string | null = null;
    try {
      markerId = await reserveWhatsAppReminderMarker(event, window, now);
      if (!markerId) {
        skipped += 1;
        continue;
      }
      if (await getWhatsAppConsentState(familyId) !== 'opted_in') {
        await prisma.notification.updateMany({
          where: { id: markerId },
          data: { metadata: { whatsappStatus: 'cancelled', whatsappCancelledAt: now.toISOString() } as Prisma.InputJsonObject },
        });
        skipped += 1;
        break;
      }
      const title = event.person?.name ? `${event.title} for ${event.person.name}` : event.title;
      const providerMessageId = await sendTemplate(config, title, eventDateLabel(start, timeConfirmed));
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const current = await prisma.notification.findUnique({ where: { id: markerId }, select: { metadata: true } });
        if (!current) break;
        const currentMetadata = asObject(current.metadata);
        const currentStatus = String(currentMetadata.whatsappStatus || 'sending');
        if (currentStatus !== 'sending') break;
        const updated = await prisma.notification.updateMany({
          where: { id: markerId, metadata: metadataEquals(current.metadata) },
          data: {
            metadata: {
              ...currentMetadata,
              whatsappStatus: 'accepted',
              whatsappMessageId: providerMessageId,
              whatsappAcceptedAt: now.toISOString(),
            } as Prisma.InputJsonObject,
          },
        });
        if (updated.count === 1) break;
      }
      accepted += 1;
    } catch (error) {
      if (markerId) {
        for (let attempt = 0; attempt < 3; attempt += 1) {
          const current = await prisma.notification.findUnique({ where: { id: markerId }, select: { metadata: true } }).catch(() => null);
          if (!current) break;
          const currentMetadata = asObject(current.metadata);
          if (currentMetadata.whatsappStatus !== 'sending') break;
          const outcomeUnknown = Boolean((error as { outcomeUnknown?: boolean })?.outcomeUnknown);
          const updated = await prisma.notification.updateMany({
            where: { id: markerId, metadata: metadataEquals(current.metadata) },
            data: {
              metadata: {
                ...currentMetadata,
                whatsappStatus: outcomeUnknown ? 'unknown' : 'failed',
                whatsappError: error instanceof Error ? error.message.slice(0, 300) : 'WhatsApp send failed',
                ...(outcomeUnknown ? { whatsappManualReviewRequired: true } : {}),
              } as Prisma.InputJsonObject,
              ...(outcomeUnknown ? { read: false, actionRequired: true, priority: 'high' } : {}),
            },
          }).catch(() => ({ count: 0 }));
          if (updated.count === 1) break;
        }
      }
      errors.push(`${event.id}: ${error instanceof Error ? error.message : 'WhatsApp send failed'}`);
    }
  }

  return { configured: true, matched: events.length, accepted, skipped, errors };
};

export const recordWhatsAppDeliveryStatus = async (
  providerMessageId: string,
  status: string,
  timestamp?: string,
) => {
  const matches = await prisma.notification.findMany({
    where: { metadata: { path: ['whatsappMessageId'], equals: providerMessageId } },
    select: { id: true, metadata: true },
    take: 5,
  });
  let updated = 0;
  for (const notification of matches) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const metadata = asObject(notification.metadata);
      const currentStatus = String(metadata.whatsappStatus || 'accepted');
      const currentTimestamp = typeof metadata.whatsappStatusAt === 'string'
        ? Date.parse(metadata.whatsappStatusAt)
        : 0;
      const incomingTimestamp = timestamp ? Number(timestamp) * 1000 : 0;
      const rank: Record<string, number> = { accepted: 0, sent: 1, delivered: 2, failed: 2, read: 3 };
      if (!(status in rank) || currentStatus === 'read' ||
          (currentStatus === 'delivered' && status === 'failed') ||
          (incomingTimestamp && currentTimestamp > incomingTimestamp) ||
          (rank[currentStatus] ?? 0) > (rank[status] ?? 0) ||
          ((rank[currentStatus] ?? 0) === (rank[status] ?? 0) && currentStatus !== status &&
            (currentStatus !== 'failed' || status !== 'delivered' || !incomingTimestamp || incomingTimestamp <= currentTimestamp)) ||
          currentStatus === status) break;
      const nextMetadata = {
        ...metadata,
        whatsappStatus: status,
        ...(timestamp ? { whatsappStatusAt: new Date(Number(timestamp) * 1000).toISOString() } : {}),
      } as Prisma.InputJsonObject;
      const result = await prisma.notification.updateMany({
        where: { id: notification.id, metadata: metadataEquals(notification.metadata) },
        data: { metadata: nextMetadata },
      });
      if (result.count === 1) {
        updated += 1;
        break;
      }
      const retry = await prisma.notification.findUnique({
        where: { id: notification.id },
        select: { id: true, metadata: true },
      });
      if (!retry) break;
      Object.assign(notification, retry);
    }
  }
  return updated;
};

export const formatWhatsAppEventDate = eventDateLabel;
