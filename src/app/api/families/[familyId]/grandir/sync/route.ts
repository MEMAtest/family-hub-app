import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { syncGrandirIntake } from '@/lib/grandirIntake';
import { GrandirConnectionError } from '@/lib/grandirClient';
import prisma from '@/lib/prisma';
import { isChildProfile } from '@/utils/schoolEventPresentation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
export const POST = requireFamilyAccess(async (request: NextRequest, context, auth) => {
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Use the Family Hub sync controls.' }, { status: 403 });
  const { familyId } = await context.params;
  const member = await prisma.familyMember.findFirst({ where: { familyId, id: auth.familyMemberId } });
  if (!member || isChildProfile(member)) return NextResponse.json({ error: 'Only a signed-in parent can sync Grandir.' }, { status: 403 });
  try { return NextResponse.json(await syncGrandirIntake(familyId)); }
  catch (error) {
    return NextResponse.json({ error: error instanceof GrandirConnectionError ? error.message : 'Grandir intake could not finish.',
      code: error instanceof GrandirConnectionError ? error.code : 'SYNC_FAILED' },
      { status: error instanceof GrandirConnectionError && error.code === 'RECONNECT_REQUIRED' ? 401 : 502 });
  }
});
