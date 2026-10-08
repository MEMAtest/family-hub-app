import { NextRequest, NextResponse } from 'next/server';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { runFamilyReminderSweep } from '@/lib/familyReminders';
import { syncBinCollections } from '@/lib/binCollections';
import { runHomeIntelligenceSweep } from '@/lib/homeIntelligenceReminders';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!familyId) return NextResponse.json({ error: 'CALENDAR_INBOUND_FAMILY_ID is not configured' }, { status: 503 });
  try {
    const bins = await syncBinCollections(familyId).catch(() => ({ status: 'unavailable' }));
    const [reminders, homeIntelligence] = await Promise.all([
      runFamilyReminderSweep(familyId),
      runHomeIntelligenceSweep(familyId),
    ]);
    return NextResponse.json({ familyId, bins, reminders, homeIntelligence });
  }
  catch (error) {
    console.error('Family reminder sweep failed:', error);
    return NextResponse.json({ error: 'Family reminder sweep failed' }, { status: 503 });
  }
}
