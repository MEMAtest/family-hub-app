import { NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { syncBinCollections } from '@/lib/binCollections';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;
// Reading the collection panel refreshes the same source-owned calendar records as the server scheduler.
export const GET = requireFamilyAccess(async (_request, context) => {
  const { familyId } = await context.params;
  try { return NextResponse.json(await syncBinCollections(familyId), { headers: { 'Cache-Control': 'no-store' } }); }
  catch { return NextResponse.json({ status: 'unavailable', collections: [], error: 'Bin collections could not be loaded.' }, { status: 503 }); }
});
