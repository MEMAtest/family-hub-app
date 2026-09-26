import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { askVision } from '@/lib/visionAI';
import { RECEIPT_SYSTEM, parseReceiptReply, receiptPrompt } from '@/lib/kitchenVision';
import { readPhoto, visionErrorResponse } from '../upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST multipart { photo, usuals: JSON string[] } -> the receipt's lines, matched to usuals.
export const POST = requireFamilyAccess(async (request: NextRequest) => {
  const upload = await readPhoto(request);
  if (upload instanceof NextResponse) return upload;

  let usuals: string[] = [];
  try {
    const raw = JSON.parse(String(upload.form.get('usuals') || '[]'));
    usuals = Array.isArray(raw) ? raw.filter((u): u is string => typeof u === 'string').map((u) => u.slice(0, 60)).slice(0, 150) : [];
  } catch {
    usuals = [];
  }

  try {
    const reply = await askVision({ system: RECEIPT_SYSTEM, prompt: receiptPrompt(usuals), image: upload.image, mimeType: upload.mimeType, maxTokens: 3000 });
    return NextResponse.json(parseReceiptReply(reply, usuals));
  } catch (error) {
    return visionErrorResponse(error, 'receipt');
  }
});
