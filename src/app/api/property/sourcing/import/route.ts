import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { readStonewaterProduct, stonewaterLink } from '@/lib/sourcing/stonewaterImport';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const windows = new Map<string, { count: number; until: number }>();
export const POST = requireAuth(async (request: NextRequest, _context, user) => {
  if (request.headers.get('origin') && request.headers.get('origin') !== request.nextUrl.origin) return NextResponse.json({ error: 'Use Family Hub to import this product.' }, { status: 403 });
  try {
    if (!request.body || Number(request.headers.get('content-length') ?? 0) > 2000) return NextResponse.json({ error: 'Product link is too long or missing.' }, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = []; let bytes = 0;
    try { while (true) { const result = await reader.read(); if (result.done) break; bytes += result.value.byteLength;
      if (bytes > 2000) throw new Error('Product link is too long.'); chunks.push(result.value); } } finally { await reader.cancel(); }
    const text = Buffer.concat(chunks).toString('utf8');
    const body = JSON.parse(text);
    if (typeof body.url !== 'string') throw new Error('Paste a Stonewater product link.');
    stonewaterLink(body.url);
    const now = Date.now();
    for (const [id, window] of windows) if (window.until < now) windows.delete(id);
    const window = windows.get(user.dbUser.id) ?? { count: 0, until: now + 60000 };
    if (window.count >= 10) return NextResponse.json({ error: 'Wait a minute before reading more products.' }, { status: 429 });
    windows.set(user.dbUser.id, { ...window, count: window.count + 1 });
    return NextResponse.json({ draft: await readStonewaterProduct(body.url) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch { return NextResponse.json({ error: 'Could not read that Stonewater product. Check the link or enter the option manually.' }, { status: 400 }); }
});
