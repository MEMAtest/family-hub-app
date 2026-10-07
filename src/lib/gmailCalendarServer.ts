import { google, gmail_v1 } from 'googleapis';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { createOAuthClient } from '@/lib/googleCalendarServer';
import { ingestCalendarEmailPayload, sweepSavedCalendarIntakes } from '@/lib/calendarEmailIngestion';
import {
  hasAuthenticatedStewartFlemingSender,
  isExpectedGmailAccount,
  isStewartFlemingSender,
  STEWART_FLEMING_EMAIL_DOMAIN,
} from '@/utils/schoolEmail';

export { hasAuthenticatedStewartFlemingSender, isStewartFlemingSender } from '@/utils/schoolEmail';

const decodeBase64Url = (value: string) =>
  Buffer.from(value.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');

const headerValue = (headers: gmail_v1.Schema$MessagePartHeader[] | undefined, name: string) =>
  headers?.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value || '';

export const gmailForwardingAddress = (email: string | null | undefined) => {
  if (!email || !email.includes('@')) return null;
  const [localPart, domain] = email.toLowerCase().split('@');
  if (!localPart || !domain) return null;
  return `${localPart.split('+')[0]}+familyhub@${domain}`;
};

export const getAuthedGmailClient = async (familyId: string) => {
  const connection = await prisma.gmailConnection.findUnique({ where: { familyId } });
  if (!connection || !connection.enabled) throw new Error('Gmail is not connected');
  if (!isExpectedGmailAccount(connection.googleUserEmail, process.env.GOOGLE_GMAIL_ACCOUNT)) {
    throw new Error('The connected Gmail account does not match the configured Family Hub account. Reconnect the intended account.');
  }

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken || undefined,
    token_type: connection.tokenType || undefined,
    expiry_date: connection.expiryDate ? connection.expiryDate.getTime() : undefined,
    scope: connection.scope || undefined,
  });

  if (connection.expiryDate && connection.expiryDate.getTime() <= Date.now() + 60_000) {
    if (!connection.refreshToken) throw new Error('Gmail authorization has expired. Reconnect Gmail.');
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    await prisma.gmailConnection.update({
      where: { familyId },
      data: {
        accessToken: credentials.access_token || connection.accessToken,
        refreshToken: credentials.refresh_token || connection.refreshToken,
        tokenType: credentials.token_type || connection.tokenType,
        scope: credentials.scope || connection.scope,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : connection.expiryDate,
      },
    });
  }

  return {
    connection,
    gmail: google.gmail({ version: 'v1', auth: oauth2Client }),
  };
};

type ParsedGmailMessage = {
  to: string;
  from: string;
  subject: string;
  text: string;
  html: string;
  messageId: string;
  gmailMessageId: string;
  gmailThreadId: string | null;
  gmailInternalDate: string | null;
  sourceDate: string | null;
  attachments: Array<{
    fileName: string;
    mimeType: string;
    contentBase64: string;
  }>;
};

const readMessageParts = async (
  gmail: gmail_v1.Gmail,
  messageId: string,
  part: gmail_v1.Schema$MessagePart | undefined,
  result: { text: string[]; html: string[]; attachments: ParsedGmailMessage['attachments'] },
): Promise<void> => {
  if (!part) return;

  if (part.filename && part.body?.attachmentId) {
    const attachment = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId,
      id: part.body.attachmentId,
    });
    if (attachment.data.data) {
      result.attachments.push({
        fileName: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        contentBase64: attachment.data.data,
      });
    }
    return;
  }

  if (part.body?.data) {
    const decoded = decodeBase64Url(part.body.data);
    if (part.mimeType === 'text/plain') result.text.push(decoded);
    if (part.mimeType === 'text/html') result.html.push(decoded);
  }

  for (const child of part.parts || []) {
    await readMessageParts(gmail, messageId, child, result);
  }
};

const readGmailMessage = async (gmail: gmail_v1.Gmail, messageId: string, fallbackRecipient: string) => {
  const response = await gmail.users.messages.get({ userId: 'me', id: messageId, format: 'full' });
  const message = response.data;
  const headers = message.payload?.headers;
  const parts = { text: [] as string[], html: [] as string[], attachments: [] as ParsedGmailMessage['attachments'] };
  await readMessageParts(gmail, message.id || messageId, message.payload, parts);

  const subject = headerValue(headers, 'Subject');
  const fallbackText = message.snippet || '';
  return {
    to: headerValue(headers, 'Delivered-To') || headerValue(headers, 'To') || fallbackRecipient,
    from: headerValue(headers, 'From'),
    subject,
    text: parts.text.join('\n\n') || (parts.html.length ? '' : fallbackText),
    html: parts.html.join('\n\n'),
    messageId: headerValue(headers, 'Message-ID') || message.id || messageId,
    gmailMessageId: message.id || messageId,
    gmailThreadId: message.threadId || null,
    gmailInternalDate: message.internalDate || null,
    sourceDate: headerValue(headers, 'Date') || null,
    attachments: parts.attachments,
  } satisfies ParsedGmailMessage;
};

export const syncGmailCalendarInbox = async (familyId: string) => {
  const { connection, gmail } = await getAuthedGmailClient(familyId);
  let googleUserEmail = connection.googleUserEmail;
  if (!googleUserEmail) {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    googleUserEmail = profile.data.emailAddress || null;
    if (!isExpectedGmailAccount(googleUserEmail, process.env.GOOGLE_GMAIL_ACCOUNT)) {
      throw new Error('The connected Gmail account does not match the configured Family Hub account. Reconnect the intended account.');
    }
    if (googleUserEmail) {
      await prisma.gmailConnection.update({ where: { familyId }, data: { googleUserEmail } });
    }
  }

  const forwardingAddress = gmailForwardingAddress(googleUserEmail);
  if (!forwardingAddress) throw new Error('The connected Google account email could not be determined.');

  const cursor = await prisma.notification.findUnique({ where: { id: `gmail-forwarded-cursor-${familyId}` }, select: { metadata: true } });
  const forwardMetadata = jsonMetadata(cursor?.metadata ?? null);
  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `to:${forwardingAddress} newer_than:90d`,
    maxResults: 50,
    ...(typeof forwardMetadata.schoolGmailPageToken === 'string' ? { pageToken: forwardMetadata.schoolGmailPageToken } : {}),
  });

  let processed = 0;
  let autoCreated = 0;
  let needsReview = 0;
  let duplicates = 0;
  const errors: string[] = [];

  for (const message of list.data.messages || []) {
    if (!message.id) continue;
    try {
      const parsed = await readGmailMessage(gmail, message.id, forwardingAddress);
      const result = await ingestCalendarEmailPayload({
        type: 'gmail',
        data: parsed,
      }, {
        familyId,
        eventSource: 'gmail-calendar-email',
      });
      if (result.statusCode === 200) {
        processed += 1;
        if (result.body.duplicate) duplicates += 1;
        autoCreated += Number(result.body.autoCreated || 0);
        needsReview += Number(result.body.needsReview || 0);
      } else {
        errors.push(`${message.id}: ${String(result.body.error || 'Import failed')}`);
      }
    } catch (error) {
      errors.push(`${message.id}: ${error instanceof Error ? error.message : 'Import failed'}`);
    }
  }

  if (!errors.length) {
    await storeSchoolGmailSyncState(familyId, { pageToken: list.data.nextPageToken || null }, 'forwarded');
    if (!list.data.nextPageToken) await prisma.gmailConnection.update({ where: { familyId }, data: { lastSyncAt: new Date() } });
  }
  return {
    connectedEmail: googleUserEmail,
    forwardingAddress,
    matched: list.data.messages?.length || 0,
    processed,
    autoCreated,
    needsReview,
    duplicates,
    errors,
    hasMore: Boolean(list.data.nextPageToken),
  };
};

export const buildStewartFlemingGmailQuery = (cursorInternalDateMs?: number, upperBoundMs?: number) => {
  const after = cursorInternalDateMs && cursorInternalDateMs > 0
    ? ` after:${Math.max(0, Math.floor(cursorInternalDateMs / 1000) - 1)}`
    : '';
  const before = upperBoundMs && upperBoundMs > 0 ? ` before:${Math.floor(upperBoundMs / 1000)}` : '';
  return `(from:${STEWART_FLEMING_EMAIL_DOMAIN} OR Grandir OR Famly) newer_than:90d${after}${before}`;
};

const schoolSyncCursorId = (familyId: string) => `gmail-school-cursor-${familyId}`;
const jsonMetadata = (value: Prisma.JsonValue | null) =>
  value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
const metadataEquals = (value: Prisma.JsonValue | null) => ({
  equals: value === null ? Prisma.DbNull : value as Prisma.InputJsonValue,
});

type SchoolGmailSyncState = {
  queryVersion?: number;
  cursorMs?: number;
  activeQuery?: string | null;
  pageToken?: string | null;
  backfillComplete?: boolean;
  failedMessageIds?: string[];
  savedIntakeSweepAfterId?: string | null;
};

const storeSchoolGmailSyncState = async (familyId: string, state: SchoolGmailSyncState, kind = 'school') => {
  const id = kind === 'school' ? schoolSyncCursorId(familyId) : `gmail-forwarded-cursor-${familyId}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await prisma.notification.findUnique({ where: { id }, select: { metadata: true } });
    const currentMetadata = jsonMetadata(current?.metadata ?? null);
    const currentCursor = Number(currentMetadata.schoolGmailInternalDateMs) || 0;
    const metadata: Record<string, unknown> = { ...currentMetadata };
    if (state.queryVersion !== undefined) metadata.schoolGmailQueryVersion = state.queryVersion;
    if (state.cursorMs !== undefined) metadata.schoolGmailInternalDateMs = Math.max(currentCursor, state.cursorMs);
    if (state.activeQuery !== undefined) {
      if (state.activeQuery) metadata.schoolGmailActiveQuery = state.activeQuery;
      else delete metadata.schoolGmailActiveQuery;
    }
    if (state.pageToken !== undefined) {
      if (state.pageToken) metadata.schoolGmailPageToken = state.pageToken;
      else delete metadata.schoolGmailPageToken;
    }
    if (state.backfillComplete !== undefined) metadata.schoolGmailBackfillComplete = state.backfillComplete;
    if (state.failedMessageIds !== undefined) {
      if (state.failedMessageIds.length > 0) metadata.schoolGmailFailedMessageIds = state.failedMessageIds;
      else delete metadata.schoolGmailFailedMessageIds;
    }
    if (state.savedIntakeSweepAfterId !== undefined) {
      if (state.savedIntakeSweepAfterId) metadata.savedIntakeSweepAfterId = state.savedIntakeSweepAfterId;
      else delete metadata.savedIntakeSweepAfterId;
    }
    const nextMetadata = metadata as Prisma.InputJsonObject;
    if (current) {
      const updated = await prisma.notification.updateMany({
        where: { id, metadata: metadataEquals(current.metadata) },
        data: { metadata: nextMetadata },
      });
      if (updated.count === 1) return;
      continue;
    }
    try {
      await prisma.notification.create({
        data: {
          id,
          familyId,
          type: 'system',
          title: 'School email sync state',
          message: 'Internal Gmail synchronization checkpoint.',
          priority: 'low',
          category: 'system',
          read: true,
          actionRequired: false,
          metadata: nextMetadata,
        },
      });
      return;
    } catch (error) {
      if ((error as { code?: string })?.code !== 'P2002') throw error;
    }
  }
};

/** School and nursery intake. Famly transport alone never proves a Grandir institution or portal connection. */
export const syncStewartFlemingGmail = async (familyId: string) => {
  const { connection, gmail } = await getAuthedGmailClient(familyId);
  let googleUserEmail = connection.googleUserEmail;
  if (!googleUserEmail) {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    googleUserEmail = profile.data.emailAddress || null;
    if (!isExpectedGmailAccount(googleUserEmail, process.env.GOOGLE_GMAIL_ACCOUNT)) {
      throw new Error('The connected Gmail account does not match the configured Family Hub account. Reconnect the intended account.');
    }
    if (googleUserEmail) {
      await prisma.gmailConnection.update({ where: { familyId }, data: { googleUserEmail } });
    }
  }
  if (!googleUserEmail) throw new Error('The connected Google account email could not be determined.');
  if (!isExpectedGmailAccount(googleUserEmail, process.env.GOOGLE_GMAIL_ACCOUNT)) {
    throw new Error('The connected Gmail account does not match the configured Family Hub account. Reconnect the intended account.');
  }

  const cursorId = schoolSyncCursorId(familyId);
  const cursorRecord = await prisma.notification.findUnique({ where: { id: cursorId }, select: { metadata: true } });
  const storedMetadata = jsonMetadata(cursorRecord?.metadata ?? null);
  // Expanding the source query needs one fresh bounded backfill, not an old school-only checkpoint.
  const cursorMetadata = storedMetadata.schoolGmailQueryVersion === 2 ? storedMetadata : {};
  const cursorInternalDateMs = Number(cursorMetadata.schoolGmailInternalDateMs) || 0;
  const storedQuery = typeof cursorMetadata.schoolGmailActiveQuery === 'string'
    ? cursorMetadata.schoolGmailActiveQuery
    : null;
  const pageToken = typeof cursorMetadata.schoolGmailPageToken === 'string'
    ? cursorMetadata.schoolGmailPageToken
    : undefined;
  const backfillComplete = cursorMetadata.schoolGmailBackfillComplete === true;
  const query = storedQuery || buildStewartFlemingGmailQuery(
    backfillComplete ? cursorInternalDateMs : undefined,
    Date.now() + 1000,
  );
  const page = await gmail.users.messages.list({
    userId: 'me',
    q: query,
    maxResults: 20,
    ...(pageToken ? { pageToken } : {}),
  });
  const messageRefs = page.data.messages || [];
  const nextPageToken = page.data.nextPageToken || null;
  const pendingMessageIds = Array.isArray(cursorMetadata.schoolGmailFailedMessageIds)
    ? cursorMetadata.schoolGmailFailedMessageIds.filter((id): id is string => typeof id === 'string')
    : [];
  const referencesById = new Map<string, gmail_v1.Schema$Message>();
  for (const id of pendingMessageIds) referencesById.set(id, { id });
  for (const reference of [...messageRefs].reverse()) {
    if (reference.id) referencesById.set(reference.id, reference);
  }
  const messagesToProcess = [...referencesById.values()];

  let processed = 0;
  let autoCreated = 0;
  let needsReview = 0;
  let duplicates = 0;
  const ignored = 0;
  let unauthenticated = 0;
  let nextCursorMs = cursorInternalDateMs;
  const errors: string[] = [];
  const failedMessageIds = new Set(pendingMessageIds);

  for (const messageRef of messagesToProcess) {
    if (!messageRef.id) continue;
    failedMessageIds.delete(messageRef.id);
    try {
      const metadataResponse = await gmail.users.messages.get({
        userId: 'me',
        id: messageRef.id,
        format: 'metadata',
        metadataHeaders: ['From', 'To', 'Delivered-To', 'Message-ID', 'Subject', 'Authentication-Results', 'Date'],
      });
      const headers = metadataResponse.data.payload?.headers;
      const internalDateMs = Number(metadataResponse.data.internalDate);
      if (!Number.isFinite(internalDateMs) || internalDateMs <= 0) {
        errors.push(`${messageRef.id}: Gmail did not return the message receive time`);
        failedMessageIds.add(messageRef.id);
        continue;
      }
      const sender = headerValue(headers, 'From');
      const stewart = isStewartFlemingSender(sender);
      if (stewart && !hasAuthenticatedStewartFlemingSender(headers || [])) {
        unauthenticated += 1;
        nextCursorMs = Math.max(nextCursorMs, internalDateMs);
        continue;
      }

      const messageId = headerValue(headers, 'Message-ID') || messageRef.id;
      const existing = await prisma.calendarEmailIntake.findFirst({
        where: { familyId, messageId },
        select: { id: true, status: true, parsedDrafts: true, metadata: true },
      });
      if (existing) {
        const existingMetadata = jsonMetadata(existing.metadata ?? null);
        if (existing.status === 'processing' && existingMetadata.schoolSenderVerified === true) {
          const result = await ingestCalendarEmailPayload({
            type: 'gmail',
            data: { from: sender, messageId },
          }, {
            familyId,
            eventSource: 'gmail-school-email',
            authenticatedSchoolSender: true,
          });
          if (result.statusCode !== 200) {
            errors.push(`${messageRef.id}: ${String(result.body.error || 'Import retry failed')}`);
            failedMessageIds.add(messageRef.id);
            continue;
          }
          processed += 1;
          duplicates += 1;
          autoCreated += Number(result.body.autoCreated || 0);
          needsReview += Number(result.body.needsReview || 0);
          nextCursorMs = Math.max(nextCursorMs, internalDateMs);
          continue;
        }
        if (existing.status === 'processing') {
          await prisma.calendarEmailIntake.update({
            where: { id: existing.id },
            data: {
              status: 'review_required',
              needsReview: Array.isArray(existing.parsedDrafts) ? existing.parsedDrafts.length : 1,
            },
          });
        }
        duplicates += 1;
        nextCursorMs = Math.max(nextCursorMs, internalDateMs);
        continue;
      }

      const parsed = await readGmailMessage(gmail, messageRef.id, googleUserEmail);
      const result = await ingestCalendarEmailPayload({ type: 'gmail', data: parsed }, {
        familyId,
        eventSource: stewart ? 'gmail-school-email' : 'gmail-nursery-email',
        authenticatedSchoolSender: stewart,
        reviewOnly: !stewart,
      });
      if (result.statusCode !== 200) {
        errors.push(`${messageRef.id}: ${String(result.body.error || 'Import failed')}`);
        failedMessageIds.add(messageRef.id);
        continue;
      }
      processed += 1;
      if (result.body.duplicate) duplicates += 1;
      autoCreated += Number(result.body.autoCreated || 0);
      needsReview += Number(result.body.needsReview || 0);
      nextCursorMs = Math.max(nextCursorMs, internalDateMs);
    } catch (error) {
      errors.push(`${messageRef.id}: ${error instanceof Error ? error.message : 'Import failed'}`);
      failedMessageIds.add(messageRef.id);
    }
  }

  const savedIntakeSweep = await sweepSavedCalendarIntakes(familyId,
    typeof storedMetadata.savedIntakeSweepAfterId === 'string' ? storedMetadata.savedIntakeSweepAfterId : undefined);
  autoCreated += savedIntakeSweep.autoCreated;
  errors.push(...savedIntakeSweep.errors);

  await storeSchoolGmailSyncState(familyId, {
    queryVersion: 2,
    activeQuery: nextPageToken ? query : null,
    pageToken: nextPageToken,
    cursorMs: nextCursorMs,
    backfillComplete: nextPageToken ? backfillComplete : true,
    failedMessageIds: [...failedMessageIds],
    savedIntakeSweepAfterId: savedIntakeSweep.nextAfterId,
  });
  if (errors.length === 0 && !nextPageToken && failedMessageIds.size === 0) {
    await prisma.gmailConnection.update({ where: { familyId }, data: { lastSyncAt: new Date() } });
  }
  return {
    connectedEmail: googleUserEmail,
    senderDomain: STEWART_FLEMING_EMAIL_DOMAIN,
    matched: messagesToProcess.length,
    processed,
    autoCreated,
    needsReview,
    duplicates,
    ignored,
    unauthenticated,
    batchLimit: 20,
    hasMore: Boolean(nextPageToken || failedMessageIds.size || savedIntakeSweep.hasMore),
    savedIntakeSweep,
    errors,
  };
};
