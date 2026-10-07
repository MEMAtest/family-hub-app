import { NextRequest, NextResponse } from 'next/server';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { runFamilyReminderSweep } from '@/lib/familyReminders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!familyId) return NextResponse.json({ error: 'CALENDAR_INBOUND_FAMILY_ID is not configured' }, { status: 503 });
  try { return NextResponse.json({ familyId, reminders: await runFamilyReminderSweep(familyId) }); }
  catch (error) {
    console.error('Family reminder sweep failed:', error);
    return NextResponse.json({ error: 'Family reminder sweep failed' }, { status: 503 });
  }
}
