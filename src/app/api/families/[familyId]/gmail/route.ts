import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { GmailReconnectRequiredError } from '@/lib/gmailAuthorization';
import {
  gmailForwardingAddress,
  syncGmailCalendarInbox,
  syncStewartFlemingGmail,
} from '@/lib/gmailCalendarServer';

export const runtime = 'nodejs';

export const GET = requireFamilyAccess(async (_request: NextRequest, context) => {
  const { familyId } = await context.params;
  const connection = await prisma.gmailConnection.findUnique({
    where: { familyId },
    select: { enabled: true, googleUserEmail: true, lastSyncAt: true, updatedAt: true },
  });

  return NextResponse.json({
    connected: Boolean(connection?.enabled),
    googleUserEmail: connection?.googleUserEmail || null,
    forwardingAddress: connection?.enabled ? gmailForwardingAddress(connection.googleUserEmail) : null,
    lastSyncAt: connection?.lastSyncAt || null,
    updatedAt: connection?.updatedAt || null,
  });
});

export const POST = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    const school = await syncStewartFlemingGmail(familyId);
    const forwarded = await syncGmailCalendarInbox(familyId);
    return NextResponse.json({
      ...school,
      matched: school.matched + forwarded.matched,
      processed: school.processed + forwarded.processed,
      autoCreated: school.autoCreated + forwarded.autoCreated,
      needsReview: school.needsReview + forwarded.needsReview,
      duplicates: school.duplicates + forwarded.duplicates,
      forwardedMatched: forwarded.matched,
      schoolMatched: school.matched,
      errors: [...school.errors, ...forwarded.errors],
    });
  } catch (error) {
    if (error instanceof GmailReconnectRequiredError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 401 });
    }
    console.error('Gmail calendar sync error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to sync Gmail' }, { status: 500 });
  }
});

export const DELETE = requireFamilyAccess(async (_request: NextRequest, context) => {
  try {
    const { familyId } = await context.params;
    await prisma.gmailConnection.deleteMany({ where: { familyId } });
    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error('Gmail disconnect error:', error);
    return NextResponse.json({ error: 'Failed to disconnect Gmail' }, { status: 500 });
  }
});
