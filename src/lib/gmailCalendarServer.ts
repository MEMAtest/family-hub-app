import { google, gmail_v1 } from 'googleapis';
import prisma from '@/lib/prisma';
import { createOAuthClient } from '@/lib/googleCalendarServer';
import { ingestCalendarEmailPayload } from '@/lib/calendarEmailIngestion';

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
    text: parts.text.join('\n\n') || fallbackText,
    html: parts.html.join('\n\n'),
    messageId: headerValue(headers, 'Message-ID') || message.id || messageId,
    attachments: parts.attachments,
  } satisfies ParsedGmailMessage;
};

export const syncGmailCalendarInbox = async (familyId: string) => {
  const { connection, gmail } = await getAuthedGmailClient(familyId);
  let googleUserEmail = connection.googleUserEmail;
  if (!googleUserEmail) {
    const profile = await gmail.users.getProfile({ userId: 'me' });
    googleUserEmail = profile.data.emailAddress || null;
    if (googleUserEmail) {
      await prisma.gmailConnection.update({ where: { familyId }, data: { googleUserEmail } });
    }
  }

  const forwardingAddress = gmailForwardingAddress(googleUserEmail);
  if (!forwardingAddress) throw new Error('The connected Google account email could not be determined.');

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: `to:${forwardingAddress} newer_than:90d`,
    maxResults: 50,
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
      }, { familyId, eventSource: 'gmail-calendar-email' });
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

  await prisma.gmailConnection.update({ where: { familyId }, data: { lastSyncAt: new Date() } });
  return {
    connectedEmail: googleUserEmail,
    forwardingAddress,
    matched: list.data.messages?.length || 0,
    processed,
    autoCreated,
    needsReview,
    duplicates,
    errors,
  };
};
