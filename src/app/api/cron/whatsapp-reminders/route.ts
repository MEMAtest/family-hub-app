import { NextRequest, NextResponse } from 'next/server';
import { isAuthorisedCronRequest } from '@/lib/cronAuth';
import { sendUpcomingSchoolWhatsAppReminders } from '@/lib/whatsappCalendarReminders';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!isAuthorisedCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const familyId = process.env.CALENDAR_INBOUND_FAMILY_ID;
  if (!familyId) {
    return NextResponse.json({ error: 'CALENDAR_INBOUND_FAMILY_ID is not configured' }, { status: 503 });
  }

  try {
    const reminders = await sendUpcomingSchoolWhatsAppReminders(familyId);
    const hasErrors = 'errors' in reminders && (reminders.errors?.length ?? 0) > 0;
    return NextResponse.json({ familyId, reminders, ok: !hasErrors }, { status: hasErrors ? 503 : 200 });
  } catch (error) {
    return NextResponse.json({
      familyId,
      error: error instanceof Error ? error.message : 'WhatsApp reminder sweep failed',
      ok: false,
    }, { status: 503 });
  }
}
