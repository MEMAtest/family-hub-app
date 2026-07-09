import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { getGoogleAuthUrl } from '@/lib/googleCalendarServer';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    return NextResponse.json({ authUrl: getGoogleAuthUrl(familyId) });
  } catch (error) {
    console.error('Google Calendar connect error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to start Google OAuth' }, { status: 500 });
  }
});
