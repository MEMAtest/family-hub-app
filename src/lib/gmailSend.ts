import { getAuthedGmailClient } from '@/lib/gmailCalendarServer';

/**
 * Sending mail as the household's own Gmail account.
 *
 * The alternative is a transactional provider, which needs an account and a
 * domain verified by DNS before it will deliver to anyone but its owner. A
 * family that already signs in with Google has none of that, and doesn't want
 * it: mail from the family's real address lands in the family's inbox, threads
 * properly, and needs no new service.
 *
 * Requires the `gmail.send` scope. It was added alongside the existing
 * `gmail.readonly`, so anyone who connected Gmail before sending existed has
 * to reconnect once to grant it — Google does not widen a grant silently.
 */

const GMAIL_SEND_SCOPE = 'https://www.googleapis.com/auth/gmail.send';

export class GmailSendUnavailable extends Error {}

/** RFC 2047 for anything outside ASCII, so accented names survive the header. */
const encodeHeader = (value: string) =>
  // eslint-disable-next-line no-control-regex
  /^[\x00-\x7F]*$/.test(value)
    ? value
    : `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;

/**
 * A multipart/alternative message: plain text for clients that want it, HTML
 * for those that don't. Base64 with hard-wrapped lines, because SMTP still
 * cares about line length even when Gmail is doing the delivering.
 */
export const buildMimeMessage = (options: {
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}) => {
  const boundary = `fh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const from = options.fromName ? `${encodeHeader(options.fromName)} <${options.from}>` : options.from;
  const wrap = (value: string) => Buffer.from(value, 'utf8').toString('base64').replace(/(.{76})/g, '$1\r\n');

  return [
    `From: ${from}`,
    `To: ${options.to}`,
    `Subject: ${encodeHeader(options.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(options.text),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
    '',
    wrap(options.html),
    '',
    `--${boundary}--`,
    '',
  ].join('\r\n');
};

/** Gmail wants the raw message base64url encoded, without padding. */
export const toRawMessage = (mime: string) =>
  Buffer.from(mime, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

export const canSendViaGmail = async (familyId: string): Promise<boolean> => {
  try {
    const { connection } = await getAuthedGmailClient(familyId);
    return Boolean(connection.scope?.includes(GMAIL_SEND_SCOPE));
  } catch {
    return false;
  }
};

/**
 * Send one message as the connected Gmail account.
 *
 * Throws `GmailSendUnavailable` when Gmail simply is not set up for sending —
 * callers treat that as "fall back", not as a failure worth alarming about.
 */
export const sendViaGmail = async (
  familyId: string,
  message: { to: string; subject: string; html: string; text: string; fromName?: string }
): Promise<{ id: string; from: string }> => {
  let client: Awaited<ReturnType<typeof getAuthedGmailClient>>;
  try {
    client = await getAuthedGmailClient(familyId);
  } catch (error) {
    throw new GmailSendUnavailable(error instanceof Error ? error.message : 'Gmail is not connected');
  }

  const { connection, gmail } = client;

  if (!connection.scope?.includes(GMAIL_SEND_SCOPE)) {
    throw new GmailSendUnavailable(
      'Gmail is connected for reading only. Reconnect it to grant permission to send.'
    );
  }

  const from = connection.googleUserEmail;
  if (!from) {
    throw new GmailSendUnavailable('The Gmail connection has no account address recorded.');
  }

  const raw = toRawMessage(
    buildMimeMessage({
      from,
      fromName: message.fromName ?? 'Family Hub',
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
    })
  );

  const response = await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });
  return { id: response.data.id ?? '', from };
};
