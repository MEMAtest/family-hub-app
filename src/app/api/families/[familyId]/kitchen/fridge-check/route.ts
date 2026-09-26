import { NextRequest, NextResponse } from 'next/server';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { askVision } from '@/lib/visionAI';
import { FRIDGE_PROMPT, FRIDGE_SYSTEM, parseFridgeReply } from '@/lib/kitchenVision';
import { readPhoto, visionErrorResponse } from '../upload';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST multipart { photo } -> what's visible, what to use first, meal ideas.
export const POST = requireFamilyAccess(async (request: NextRequest) => {
  const upload = await readPhoto(request);
  if (upload instanceof NextResponse) return upload;
  try {
    const reply = await askVision({ system: FRIDGE_SYSTEM, prompt: FRIDGE_PROMPT, image: upload.image, mimeType: upload.mimeType, maxTokens: 2000 });
    return NextResponse.json(parseFridgeReply(reply));
  } catch (error) {
    return visionErrorResponse(error, 'photo');
  }
});
