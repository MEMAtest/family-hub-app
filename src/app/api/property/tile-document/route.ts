import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-utils';
import { askVision, isSupportedImageType, visionConfigured } from '@/lib/visionAI';
import { documentPrompt, documentSystem, parseDocumentRead } from '@/lib/sourcing/tileDocument';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
const windows = new Map<string, { count: number; until: number }>();

export const POST = requireAuth(async (request: NextRequest, _context, user) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: 'Use this form from Family Hub.' }, { status: 403 });
  if (Number(request.headers.get('content-length') ?? 0) > 1000000) return NextResponse.json({ error: 'The photo is too large. Choose a smaller image.' }, { status: 413 });
  try {
    const form = await request.formData();
    const kind = form.get('kind');
    const roomId = form.get('roomId');
    const surface = form.get('surface');
    const text = String(form.get('text') ?? '');
    if (!['measurement', 'tile'].includes(String(kind)) || !['main-bathroom', 'shower-room'].includes(String(roomId)) || !['floor', 'walls'].includes(String(surface)) || text.length > 6000 || form.get('consent') !== 'yes') {
      return NextResponse.json({ error: 'Choose a room and surface, and allow AI to read this document.' }, { status: 400 });
    }
    const file = form.get('image');
    let image: Buffer | undefined;
    let mimeType: 'image/jpeg' | 'image/png' | 'image/webp' | undefined;
    if (file && typeof file !== 'string') {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || !isSupportedImageType(file.type) || file.size > 450000) {
        return NextResponse.json({ error: 'Use a JPEG, PNG or WebP photo under 450KB after resizing.' }, { status: 400 });
      }
      image = Buffer.from(await file.arrayBuffer());
      const signatureMatches = file.type === 'image/jpeg' ? image[0] === 255 && image[1] === 216
        : file.type === 'image/png' ? image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : image.subarray(0, 4).toString() === 'RIFF' && image.subarray(8, 12).toString() === 'WEBP';
      if (!signatureMatches) return NextResponse.json({ error: 'This is not a supported image.' }, { status: 400 });
      mimeType = file.type as typeof mimeType;
    }
    if (!image && !text.trim()) return NextResponse.json({ error: 'Add a photo or paste your measurements first.' }, { status: 400 });
    if (!visionConfigured()) return NextResponse.json({ error: 'Photo reading is unavailable. You can still enter the measurements and tile details manually.' }, { status: 503 });
    const now = Date.now();
    for (const [id, window] of windows) if (window.until < now) windows.delete(id);
    const window = windows.get(user.dbUser.id) ?? { count: 0, until: now + 300000 };
    if (window.count >= 5) return NextResponse.json({ error: 'Five document reads were requested recently. Wait a few minutes or enter the details manually.' }, { status: 429 });
    windows.set(user.dbUser.id, { ...window, count: window.count + 1 });
    const response = await askVision({ system: documentSystem, prompt: documentPrompt(kind as 'measurement' | 'tile', roomId === 'main-bathroom' ? 'Main Bathroom' : 'Shower Room', String(surface), text), image, mimeType, maxTokens: 1800, effort: 'low' });
    return NextResponse.json({ draft: parseDocumentRead(kind as 'measurement' | 'tile', response) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'The document could not be read reliably. Try a clearer photo or enter the figures manually.' }, { status: 502 });
  }
});
