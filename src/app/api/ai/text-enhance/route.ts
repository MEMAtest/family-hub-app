import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { aiService } from '@/services/aiService';
import { requireAuth } from '@/lib/auth-utils';

export const maxDuration = 60;

const requestSchema = z.object({
  text: z.string().min(1).max(4000),
  context: z.string().max(160).optional(),
  mode: z.enum(['polish', 'spellcheck', 'summarize', 'title']).default('polish'),
});

const fallbackEnhance = (text: string) =>
  text
    .replace(/[ \t]+/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\s+([,.!?;:])/g, '$1')
    .trim();

export const POST = requireAuth(async (request: NextRequest) => {
  try {
    const body = requestSchema.parse(await request.json());

    if ((body.mode === 'summarize' || body.mode === 'title') && !process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: body.mode === 'title' ? 'AI title suggestions are temporarily unavailable.' : 'AI summaries are temporarily unavailable.' }, { status: 503 });
    }

    try {
      const enhanced = await aiService.enhanceFreeText(body);
      return NextResponse.json({ enhanced: body.mode === 'title' ? enhanced.trim().replace(/^['"]|['"]$/g, '').slice(0, 90) : enhanced.trim(), source: 'ai' });
    } catch (error) {
      if (body.mode === 'summarize' || body.mode === 'title') {
        console.error('AI text summary unavailable:', error);
        return NextResponse.json({ error: 'AI summary failed. Please try again.' }, { status: 503 });
      }
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
});
