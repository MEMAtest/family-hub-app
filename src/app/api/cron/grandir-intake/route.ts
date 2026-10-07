import { NextRequest, NextResponse } from 'next/server';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { isLondonSchoolSyncSlot } from '@/utils/schoolSyncSchedule';
import { syncGrandirIntake } from '@/lib/grandirIntake';
import { GrandirConnectionError } from '@/lib/grandirClient';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isLondonSchoolSyncSlot()) return NextResponse.json({ ok: true, skipped: 'Outside 08:00/20:00 Europe/London intake slots' });
  const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!familyId) return NextResponse.json({ error: 'Nursery intake family is not configured.' }, { status: 503 });
  try { return NextResponse.json({ ok: true, ...await syncGrandirIntake(familyId) }); }
  catch (error) {
    const reason = error instanceof GrandirConnectionError ? error.code : 'SYNC_FAILED';
    console.error('Grandir intake failed', { reason });
    return NextResponse.json({ ok: false, reason }, { status: 503 });
  }
}
