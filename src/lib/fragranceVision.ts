import { z } from 'zod';

export const FRAGRANCE_VISION_MODEL = 'google/gemma-3-4b-it';
export const FRAGRANCE_VISION_TIMEOUT_MS = 20_000;

const visionPayloadSchema = z.object({
  house: z.string().trim().max(120).nullable().optional(),
  name: z.string().trim().max(160).nullable().optional(),
  concentration: z.string().trim().max(80).nullable().optional(),
  extractedText: z.string().trim().max(2_000).nullable().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type FragranceVisionResult = {
  house: string | null;
  name: string | null;
  concentration: string | null;
  extractedText: string | null;
  confidence: number;
  usage: { inputTokens: number; outputTokens: number; estimatedUsd: number } | null;
};

const cleanValue = (value?: string | null) => value?.trim() || null;

const estimatedGemmaUsd = (inputTokens: number, outputTokens: number) => (
  (inputTokens * 0.05 + outputTokens * 0.1) / 1_000_000
);

const parseModelContent = (content: unknown) => {
  if (typeof content !== 'string') throw new Error('The bottle reader returned an unexpected response.');
  const json = content.match(/\{[\s\S]*\}/)?.[0] || content;
  return visionPayloadSchema.parse(JSON.parse(json));
};

export const extractFragranceVisionResult = (response: unknown): FragranceVisionResult => {
  const result = response as {
    choices?: Array<{ message?: { content?: unknown } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number; cost?: number };
  };
  const payload = parseModelContent(result.choices?.[0]?.message?.content);
  const inputTokens = Number(result.usage?.prompt_tokens || 0);
  const outputTokens = Number(result.usage?.completion_tokens || 0);

  return {
    house: cleanValue(payload.house),
    name: cleanValue(payload.name),
    concentration: cleanValue(payload.concentration),
    extractedText: cleanValue(payload.extractedText),
    confidence: Math.round((payload.confidence || 0) * 100) / 100,
    usage: inputTokens || outputTokens
      ? {
          inputTokens,
          outputTokens,
          estimatedUsd: typeof result.usage?.cost === 'number'
            ? result.usage.cost
            : estimatedGemmaUsd(inputTokens, outputTokens),
        }
      : null,
  };
};

export const readFragranceBottleLabel = async (input: { image: Buffer; mimeType: string }) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('Bottle reading is not configured yet. Enter the label manually instead.');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FRAGRANCE_VISION_TIMEOUT_MS);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://family-hub-app.vercel.app',
        'X-Title': 'Family Hub bottle reader',
      },
      body: JSON.stringify({
        model: FRAGRANCE_VISION_MODEL,
        temperature: 0,
        max_tokens: 300,
        response_format: { type: 'json_object' },
        messages: [{
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Read this fragrance bottle or box label. Return JSON only with:
{"house": string|null, "name": string|null, "concentration": string|null, "extractedText": string|null, "confidence": number}
Use only text visible in the image. Do not invent notes, release year, concentration, or a fragrance name. Confidence is 0 to 1. If the label is unclear, use null fields and low confidence.`,
            },
            {
              type: 'image_url',
              image_url: { url: `data:${input.mimeType};base64,${input.image.toString('base64')}` },
            },
          ],
        }],
      }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = typeof body?.error?.message === 'string' ? body.error.message : 'The bottle reader is temporarily unavailable.';
      throw new Error(message);
    }
    return extractFragranceVisionResult(body);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Bottle reading took too long. Please retry or enter the label manually.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};
