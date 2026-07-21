import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createOAuthClient, decodeGoogleState } from '@/lib/googleCalendarServer';

export const runtime = 'nodejs';

const popupResponse = (type: 'google_calendar_auth_success' | 'google_calendar_auth_error', message?: string) =>
  new NextResponse(
    `<!doctype html><html><body><script>
      if (window.opener) {
        window.opener.postMessage(${JSON.stringify({ type, message })}, window.location.origin);
        window.close();
      } else {
        document.body.textContent = ${JSON.stringify(message || (type === 'google_calendar_auth_success' ? 'Google Calendar connected.' : 'Google Calendar connection failed.'))};
      }
    </script></body></html>`,
    { headers: { 'content-type': 'text/html; charset=utf-8' } }
  );

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      return popupResponse('google_calendar_auth_error', `Google authorization failed: ${error}`);
    }
    if (!code || !state) {
      return popupResponse('google_calendar_auth_error', 'Missing Google authorization code.');
    }

    const { familyId, personId } = decodeGoogleState(state);
    const oauth2Client = createOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    let googleUserEmail: string | null = null;
    try {
      const tokenInfo = tokens.access_token
        ? await oauth2Client.getTokenInfo(tokens.access_token)
        : null;
      googleUserEmail = tokenInfo?.email || null;
    } catch {
      googleUserEmail = null;
    }

    if (personId) {
      const member = await prisma.familyMember.findFirst({ where: { id: personId, familyId }, select: { id: true } });
      if (!member) throw new Error('Private calendar profile is invalid');
      await prisma.personalGoogleCalendarConnection.upsert({
        where: { personId },
        create: {
          personId,
          googleUserEmail,
          accessToken: tokens.access_token || '',
          refreshToken: tokens.refresh_token || null,
          tokenType: tokens.token_type || null,
          scope: tokens.scope || null,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          selectedCalendarId: 'primary',
          selectedCalendarName: 'Personal calendar',
          enabled: true,
        },
        update: {
          googleUserEmail,
          accessToken: tokens.access_token || '',
          refreshToken: tokens.refresh_token || undefined,
          tokenType: tokens.token_type || null,
          scope: tokens.scope || null,
          expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
          selectedCalendarId: 'primary',
          selectedCalendarName: 'Personal calendar',
          enabled: true,
        },
      });
      return popupResponse('google_calendar_auth_success', 'Private Google Calendar connected.');
    }

    await prisma.googleCalendarConnection.upsert({
      where: { familyId },
      create: {
        familyId,
        googleUserEmail,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || null,
        tokenType: tokens.token_type || null,
        scope: tokens.scope || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        syncDirection: 'export',
        enabled: true,
      },
      update: {
        googleUserEmail,
        accessToken: tokens.access_token || '',
        refreshToken: tokens.refresh_token || undefined,
        tokenType: tokens.token_type || null,
        scope: tokens.scope || null,
        expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        syncDirection: 'export',
        enabled: true,
      },
    });

    return popupResponse('google_calendar_auth_success');
  } catch (error) {
    console.error('Google Calendar OAuth callback error:', error);
    return popupResponse('google_calendar_auth_error', 'Failed to connect Google Calendar.');
  }
}
