import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiService } from '@/services/aiService';

const requestSchema = z.object({
  text: z.string().min(1).max(4000),
  context: z.string().max(160).optional(),
  mode: z.enum(['polish', 'spellcheck']).default('polish'),
});

const fallbackEnhance = (text: string) =>
  text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

export async function POST(request: NextRequest) {
  try {
    const body = requestSchema.parse(await request.json());

    try {
      const enhanced = await aiService.enhanceFreeText(body);
      return NextResponse.json({ enhanced: enhanced.trim(), source: 'ai' });
    } catch (error) {
      console.warn('AI text enhancement unavailable, using local cleanup:', error);
      return NextResponse.json({
        enhanced: fallbackEnhance(body.text),
        source: 'local',
      });
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid text enhancement request' }, { status: 400 });
    }

    console.error('Text enhancement failed:', error);
    return NextResponse.json({ error: 'Failed to enhance text' }, { status: 500 });
  }
}
