import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { discoverBusinesses } from '@/lib/contractors/businessDiscovery';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  query: z.string().trim().max(200).optional(),
  url: z.string().trim().url().max(1500).optional(),
  location: z.string().trim().max(150).optional(),
  specialty: z.string().trim().max(60).optional(),
}).refine((value) => Boolean(value.query || value.url), 'Enter a company name or link.');

const windows = new Map<string, { count: number; until: number }>();

export const POST = requireFamilyAccess(async (request: NextRequest, _context, user) => {
  const origin = request.headers.get('origin');
  if (origin) {
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || request.nextUrl.host;
    const protocol = request.headers.get('x-forwarded-proto') || request.nextUrl.protocol.replace(':', '');
    const browserOrigin = `${protocol}://${host}`;
    if (origin !== request.nextUrl.origin && origin !== browserOrigin) {
      return NextResponse.json({ error: 'Use Family Hub to research contractors.' }, { status: 403 });
    }
  }
  try {
    if (Number(request.headers.get('content-length') ?? 0) > 2500) {
      return NextResponse.json({ error: 'That search is too long.' }, { status: 400 });
    }
    const body = schema.parse(await request.json());
    const now = Date.now();
    for (const [id, window] of windows) if (window.until < now) windows.delete(id);
    const window = windows.get(user.dbUser.id) ?? { count: 0, until: now + 60_000 };
    if (window.count >= 12) return NextResponse.json({ error: 'Wait a minute before searching again.' }, { status: 429 });
    windows.set(user.dbUser.id, { ...window, count: window.count + 1 });
    const result = await discoverBusinesses(body);
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError) return NextResponse.json({ error: 'Enter a valid company name or public HTTPS link.' }, { status: 400 });
    return NextResponse.json({ error: error instanceof Error ? error.message : 'The contractor search failed.' }, { status: 400 });
  }
});
