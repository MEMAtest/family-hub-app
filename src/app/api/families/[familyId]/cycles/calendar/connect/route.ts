import { NextRequest, NextResponse } from 'next/server';
import { getPersonalGoogleCalendarAuthUrl } from '@/lib/googleCalendarServer';
import { requireFamilyAccess } from '@/lib/auth-utils';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context, authUser) => {
  try {
    const { familyId } = await context.params;
    return NextResponse.json({ authUrl: getPersonalGoogleCalendarAuthUrl(familyId, authUser.familyMemberId) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Could not start private calendar connection.' }, { status: 500 });
  }
});
