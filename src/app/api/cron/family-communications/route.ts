import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { syncStewartFlemingGmail } from '@/lib/gmailCalendarServer';
import { isLondonSchoolSyncSlot } from '@/utils/schoolSyncSchedule';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  if (!isLondonSchoolSyncSlot()) {
    return NextResponse.json({ ok: true, emailSync: { skipped: 'Outside 08:00/20:00 Europe/London school sync slots' } });
  }

  const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!familyId) {
    return NextResponse.json({ error: 'CALENDAR_INBOUND_FAMILY_ID is not configured' }, { status: 503 });
  }

  const connection = await prisma.gmailConnection.findUnique({
    where: { familyId },
    select: { enabled: true },
  });

  let emailSync: Record<string, unknown> = { skipped: 'Gmail is not connected for the configured family' };
  if (connection?.enabled) {
    try {
      emailSync = await syncStewartFlemingGmail(familyId);
    } catch (error) {
      emailSync = { error: error instanceof Error ? error.message : 'School email sync failed' };
    }
  }

  const emailFailed = !connection?.enabled || 'error' in emailSync ||
    (Array.isArray(emailSync.errors) && emailSync.errors.length > 0);
  return NextResponse.json({
    familyId,
    emailSync,
    ok: !emailFailed,
  }, { status: emailFailed ? 503 : 200 });
}
