import { createHmac } from 'crypto';
import { google } from 'googleapis';
import prisma from '@/lib/prisma';
import type { CalendarEvent } from '@/types/calendar.types';

const clientId = () => process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
const clientSecret = () => process.env.GOOGLE_CLIENT_SECRET || '';
const redirectUri = () =>
  process.env.GOOGLE_REDIRECT_URI ||
  `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000'}/api/google-calendar/callback`;

const stateSecret = () =>
  process.env.GOOGLE_OAUTH_STATE_SECRET ||
  process.env.CALENDAR_INBOUND_WEBHOOK_SECRET ||
  process.env.RESEND_WEBHOOK_SECRET ||
  'family-hub-dev';

export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
];

export const createOAuthClient = () =>
  new google.auth.OAuth2(clientId(), clientSecret(), redirectUri());

export const encodeGoogleState = (familyId: string, personId?: string) => {
  const payload = Buffer.from(JSON.stringify({ familyId, personId, ts: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  return `${payload}.${sig}`;
};

export const decodeGoogleState = (state: string) => {
  const [payload, sig] = state.split('.');
  if (!payload || !sig) throw new Error('Invalid OAuth state');
  const expected = createHmac('sha256', stateSecret()).update(payload).digest('base64url');
  if (sig !== expected) throw new Error('Invalid OAuth state signature');
  const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as { familyId: string; personId?: string; ts: number };
  if (!parsed.familyId || Date.now() - parsed.ts > 30 * 60 * 1000) {
    throw new Error('Expired OAuth state');
  }
  return parsed;
};

export const getGoogleAuthUrl = (familyId: string) => {
  const oauth2Client = createOAuthClient();
  if (!clientId()) throw new Error('Google Client ID not configured');

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_CALENDAR_SCOPES,
    state: encodeGoogleState(familyId),
  });
};

export const getPersonalGoogleCalendarAuthUrl = (familyId: string, personId: string) => {
  const oauth2Client = createOAuthClient();
  if (!clientId()) throw new Error('Google Client ID not configured');
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: GOOGLE_CALENDAR_SCOPES,
    state: encodeGoogleState(familyId, personId),
  });
};

export const getAuthedCalendarClient = async (familyId: string) => {
  const connection = await prisma.googleCalendarConnection.findUnique({
    where: { familyId },
  });
  if (!connection || !connection.enabled) {
    throw new Error('Google Calendar is not connected');
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
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    await prisma.googleCalendarConnection.update({
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
    calendar: google.calendar({ version: 'v3', auth: oauth2Client }),
  };
};

export const getAuthedPersonalCalendarClient = async (personId: string) => {
  const connection = await prisma.personalGoogleCalendarConnection.findUnique({ where: { personId } });
  if (!connection || !connection.enabled) throw new Error('Personal Google Calendar is not connected');

  const oauth2Client = createOAuthClient();
  oauth2Client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken || undefined,
    token_type: connection.tokenType || undefined,
    expiry_date: connection.expiryDate ? connection.expiryDate.getTime() : undefined,
    scope: connection.scope || undefined,
  });
  if (connection.expiryDate && connection.expiryDate.getTime() <= Date.now() + 60_000) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    await prisma.personalGoogleCalendarConnection.update({
      where: { personId },
      data: {
        accessToken: credentials.access_token || connection.accessToken,
        refreshToken: credentials.refresh_token || connection.refreshToken,
        tokenType: credentials.token_type || connection.tokenType,
        scope: credentials.scope || connection.scope,
        expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : connection.expiryDate,
      },
    });
  }
  return { connection, calendar: google.calendar({ version: 'v3', auth: oauth2Client }) };
};

export const syncPrivateCyclePeriod = async (personId: string, period: { id: string; startDate: Date; endDate: Date | null; calendarEventId: string | null }) => {
  const { connection, calendar } = await getAuthedPersonalCalendarClient(personId);
  const calendarId = connection.selectedCalendarId || 'primary';
  const endDate = period.endDate || period.startDate;
  const requestBody = {
    summary: 'Private health reminder',
    description: 'Private event from Family Hub.',
    start: { date: period.startDate.toISOString().slice(0, 10) },
    end: { date: new Date(endDate.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10) },
    visibility: 'private',
    transparency: 'transparent',
  };
  const event = period.calendarEventId
    ? await calendar.events.update({ calendarId, eventId: period.calendarEventId, requestBody })
    : await calendar.events.insert({ calendarId, requestBody });
  const eventId = event.data.id || null;
  if (eventId) await prisma.cyclePeriod.update({ where: { id: period.id }, data: { calendarEventId: eventId } });
  return eventId;
};

export const googlePayloadFromFamilyEvent = (event: CalendarEvent) => {
  const startDateTime = new Date(`${event.date}T${event.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + (event.duration || 60) * 60_000);

  return {
    summary: event.title,
    description: event.notes || '',
    location: event.location || '',
    start: {
      dateTime: startDateTime.toISOString(),
      timeZone: 'Europe/London',
    },
    end: {
      dateTime: endDateTime.toISOString(),
      timeZone: 'Europe/London',
    },
    reminders: {
      useDefault: false,
      overrides: event.reminders?.filter((reminder) => reminder.enabled).map((reminder) => ({
        method: reminder.type === 'email' ? 'email' : 'popup',
        minutes: reminder.time,
      })) || [],
    },
    status: event.status === 'confirmed' ? 'confirmed' : 'tentative',
  };
};
