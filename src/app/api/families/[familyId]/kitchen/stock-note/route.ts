import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireFamilyAccess } from '@/lib/auth-utils';
import { askVision, VisionUnavailableError } from '@/lib/visionAI';
import { STOCK_SYSTEM, describeHousehold, parseStockNoteReply, stockNotePrompt } from '@/lib/kitchenStock';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_NOTE_LENGTH = 1000;

// POST { text, usuals: string[] } -> each item in the note with a count and a usage rate.
export const POST = requireFamilyAccess(async (request: NextRequest, context) => {
  const { familyId } = await context.params;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const text = typeof body?.text === 'string' ? body.text.trim() : '';
  if (!text) return NextResponse.json({ error: 'Say what you have first' }, { status: 400 });
  if (text.length > MAX_NOTE_LENGTH) {
    return NextResponse.json({ error: `Keep it under ${MAX_NOTE_LENGTH} characters` }, { status: 400 });
  }
  const usuals: string[] = Array.isArray(body?.usuals)
    ? body.usuals.filter((u: unknown): u is string => typeof u === 'string').map((u: string) => u.slice(0, 60)).slice(0, 150)
    : [];

  const members = await prisma.familyMember
    .findMany({ where: { familyId }, select: { role: true, ageGroup: true, dateOfBirth: true } })
    .catch(() => []);
  const today = new Date();

  try {
    const reply = await askVision({
      system: STOCK_SYSTEM,
      prompt: stockNotePrompt(text, describeHousehold(members, today), usuals, today.toISOString().slice(0, 10)),
      maxTokens: 2500,
      effort: 'low',
    });
    return NextResponse.json({ items: parseStockNoteReply(reply, usuals) });
  } catch (error) {
    if (error instanceof VisionUnavailableError) {
      return NextResponse.json({ error: 'Working out stock needs an AI key.', unavailable: true }, { status: 503 });
    }
    console.error('Kitchen stock note failed:', error);
    const message = error instanceof Error && /could be made out/.test(error.message)
      ? "Couldn't pick out any items. Try e.g. \"20 toilet rolls, one lasts 2 days\"."
      : "Couldn't work that out just now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
});
