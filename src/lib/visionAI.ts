import Anthropic from '@anthropic-ai/sdk';

// Reads a photo with an AI model: Claude first, OpenRouter as the fallback
// (same providers and env vars as aiService). No made-up results: if no
// provider is configured or both fail, the caller gets an error to show.

export class VisionUnavailableError extends Error {}

export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export type SupportedImageType = (typeof SUPPORTED_IMAGE_TYPES)[number];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const isSupportedImageType = (type: string): type is SupportedImageType =>
  (SUPPORTED_IMAGE_TYPES as readonly string[]).includes(type);

export const visionConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.OPENROUTER_API_KEY);

interface VisionRequest {
  system: string;
  prompt: string;
  image: Buffer;
  mimeType: SupportedImageType;
  maxTokens?: number;
  timeoutMs?: number;
}

const withAnthropic = async (req: VisionRequest, apiKey: string) => {
  const client = new Anthropic({ apiKey, maxRetries: 1, timeout: req.timeoutMs });
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_VISION_MODEL || process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-20250514',
    max_tokens: req.maxTokens ?? 1500,
    system: req.system,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.image.toString('base64') } },
        { type: 'text', text: req.prompt },
      ],
    }],
  });
  const block = message.content.find((part) => part.type === 'text');
  if (!block || block.type !== 'text') throw new Error('No text in the AI reply');
  return block.text;
};

const withOpenRouter = async (req: VisionRequest, apiKey: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), req.timeoutMs);
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'https://family-hub-app.vercel.app',
        'X-Title': 'Omosanya Home',
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_VISION_MODEL || process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
        temperature: 0,
        max_tokens: req.maxTokens ?? 1500,
        messages: [
          { role: 'system', content: req.system },
          {
            role: 'user',
            content: [
              { type: 'text', text: req.prompt },
              { type: 'image_url', image_url: { url: `data:${req.mimeType};base64,${req.image.toString('base64')}` } },
            ],
          },
        ],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter returned ${response.status}`);
    const content = payload?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('No text in the AI reply');
    return content;
  } finally {
    clearTimeout(timer);
  }
};

export const askVision = async (req: VisionRequest): Promise<string> => {
  const request = { ...req, timeoutMs: req.timeoutMs ?? 25_000 };
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!anthropicKey && !openRouterKey) {
    throw new VisionUnavailableError('Reading photos needs an AI key (ANTHROPIC_API_KEY or OPENROUTER_API_KEY).');
  }
  if (anthropicKey) {
    try {
      return await withAnthropic(request, anthropicKey);
    } catch (error) {
      if (!openRouterKey) throw error;
      console.warn('Claude vision failed; trying OpenRouter:', error instanceof Error ? error.message : error);
    }
  }
  return withOpenRouter(request, openRouterKey!);
};

// Pull the first JSON object out of a model reply (tolerates ``` fences and chatter).
export const extractJsonObject = (text: string): unknown => {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The AI reply did not contain JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
};
