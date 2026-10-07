import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { authenticateGrandir, GrandirConnectionError } from '@/lib/grandirClient';
import { connectGrandirSession, disconnectGrandir, grandirStatus, grandirStorageConfigured } from '@/lib/grandirSession';
import { isChildProfile } from '@/utils/schoolEventPresentation';
import { schoolMetadata } from '@/utils/schoolSources';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const connectSchema = z.object({ consent: z.literal(true), parentSession: z.string().min(1).max(4096).optional(),
  email: z.string().email().max(254).optional(), password: z.string().min(1).max(1024).optional() }).strict()
  .refine(body => body.parentSession ? !body.email && !body.password : Boolean(body.email && body.password));
export const GET = requireFamilyAccess(async (_request, context) => {
  const { familyId } = await context.params;
  return NextResponse.json(await grandirStatus(familyId), { headers: { 'Cache-Control': 'no-store' } });
});

export const POST = requireFamilyAccess(async (request: NextRequest, context, auth) => {
  const { familyId } = await context.params;
  if (request.headers.get('origin') !== request.nextUrl.origin || !request.headers.get('content-type')?.startsWith('application/json')) {
    return NextResponse.json({ error: 'Use the secure Family Hub connection form.' }, { status: 403 });
  }
  const owner = await prisma.familyMember.findFirst({ where: { familyId, id: auth.familyMemberId } });
  if (!owner || isChildProfile(owner)) return NextResponse.json({ error: 'Only a signed-in parent can connect Grandir.' }, { status: 403 });
  if (!grandirStorageConfigured()) return NextResponse.json({ error: 'Secure Grandir storage is not configured.' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 12_000) return NextResponse.json({ error: 'Connection request is too large.' }, { status: 413 });
  let body;
  try { body = connectSchema.parse(JSON.parse(raw)); }
  catch { return NextResponse.json({ error: 'Confirm read-only intake and provide one parent sign-in method.' }, { status: 400 }); }
  if (body.email && body.email.toLowerCase() !== auth.dbUser.email.toLowerCase()) {
    return NextResponse.json({ error: 'Use the Grandir account matching your signed-in Family Hub account.' }, { status: 400 });
  }
  // Durable, family-scoped limit also applies across serverless instances.
  try {
    const allowed = await prisma.$transaction(async db => {
      const key = 'integrations.grandir.login-attempts';
      const row = await db.familyDocument.findUnique({ where: { familyId_key: { familyId, key } } });
      const previous = schoolMetadata(row?.data);
      const startedAt = Number(previous.startedAt);
      const attempts = Number(previous.count);
      const fresh = !Number.isFinite(startedAt) || Date.now() - startedAt > 15 * 60_000;
      const count = fresh ? 0 : Number.isSafeInteger(attempts) && attempts >= 0 ? attempts : 5;
      if (count >= 5) return false;
      const data = { count: count + 1, startedAt: fresh ? Date.now() : Number(previous.startedAt) };
      await db.familyDocument.upsert({ where: { familyId_key: { familyId, key } },
        create: { familyId, key, data }, update: { data, version: { increment: 1 } } });
      return true;
    }, { isolationLevel: 'Serializable' });
    if (!allowed) return NextResponse.json({ error: 'Too many connection attempts. Wait 15 minutes before trying again.' }, { status: 429 });
    const token = body.parentSession || await authenticateGrandir(body.email!, body.password!);
    const status = await connectGrandirSession(familyId, auth.familyMemberId, auth.dbUser.email, token);
    return NextResponse.json(status, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof GrandirConnectionError) return NextResponse.json({ error: error.message, code: error.code },
      { status: error.code === 'NOT_CONFIGURED' ? 503 : error.code === 'PROVIDER_UNAVAILABLE' ? 502 : 409 });
    return NextResponse.json({ error: 'Grandir could not be connected. No password has been saved.' }, { status: 503 });
  }
});

export const DELETE = requireFamilyAccess(async (request: NextRequest, context, auth) => {
  const { familyId } = await context.params;
  if (request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Use the Family Hub connection controls.' }, { status: 403 });
  const owner = await prisma.familyMember.findFirst({ where: { familyId, id: auth.familyMemberId } });
  if (!owner || isChildProfile(owner)) return NextResponse.json({ error: 'Only a parent can disconnect Grandir.' }, { status: 403 });
  try {
    await disconnectGrandir(familyId, auth.familyMemberId);
    return NextResponse.json(await grandirStatus(familyId));
  } catch { return NextResponse.json({ error: 'Grandir connection changed or could not be updated. Refresh and retry disconnecting.' }, { status: 409 }); }
});
