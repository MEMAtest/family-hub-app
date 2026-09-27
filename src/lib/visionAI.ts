import Anthropic from '@anthropic-ai/sdk';
import {
  AIRefusalError,
  anthropicFallbackModel,
  anthropicVisionModel,
  firstText,
  openRouterFallbackModel,
  openRouterVisionModel,
  supportsEffort,
  THINKING_HEADROOM_TOKENS,
  withModelFallback,
  type AIEffort,
} from '@/lib/aiModels';

// Asks an AI model about a photo (or plain text, when there is no image):
// Claude first, OpenRouter as the fallback (same providers and env vars as
// aiService). No made-up results: if no provider is configured or both fail,
// the caller gets an error to show.

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
  image?: Buffer;
  mimeType?: SupportedImageType;
  maxTokens?: number;
  timeoutMs?: number;
  effort?: AIEffort;
}

const withAnthropic = async (req: VisionRequest, apiKey: string, model: string) => {
  // No SDK retries: OpenRouter is the retry, and both attempts must fit in a 60s function.
  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: req.timeoutMs });
  const content: Anthropic.ContentBlockParam[] = [{ type: 'text', text: req.prompt }];
  if (req.image && req.mimeType) {
    content.unshift({ type: 'image', source: { type: 'base64', media_type: req.mimeType, data: req.image.toString('base64') } });
  }
  const message = await client.messages.create({
    model,
    max_tokens: (req.maxTokens ?? 1500) + THINKING_HEADROOM_TOKENS,
    system: req.system,
    messages: [{ role: 'user', content }],
    // output_config is newer than the installed SDK's types; it is passed through as-is.
    ...(req.effort && supportsEffort(model) ? { output_config: { effort: req.effort } } : {}),
  } as Anthropic.MessageCreateParamsNonStreaming);
  if ((message.stop_reason as string) === 'refusal') throw new AIRefusalError(model);
  if (message.stop_reason === 'max_tokens') throw new Error('The AI reply was cut off');
  const text = firstText(message.content);
  if (!text) throw new Error('No text in the AI reply');
  return text;
};

const withOpenRouter = async (req: VisionRequest, apiKey: string, model: string) => {
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
        model,
        max_tokens: (req.maxTokens ?? 1500) + THINKING_HEADROOM_TOKENS,
        ...(req.effort && supportsEffort(model) ? { reasoning: { effort: req.effort } } : {}),
        messages: [
          { role: 'system', content: req.system },
          {
            role: 'user',
            content: req.image && req.mimeType
              ? [
                { type: 'text', text: req.prompt },
                { type: 'image_url', image_url: { url: `data:${req.mimeType};base64,${req.image.toString('base64')}` } },
              ]
              : req.prompt,
          },
        ],
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.error?.message || `OpenRouter returned ${response.status}`);
    const choice = payload?.choices?.[0];
    if (choice?.finish_reason === 'content_filter' || choice?.native_finish_reason === 'refusal') throw new AIRefusalError(model);
    if (choice?.finish_reason === 'length') throw new Error('The AI reply was cut off');
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
  // OpenRouter first: its default models are far cheaper (see aiModels.ts).
  if (openRouterKey) {
    try {
      return await withModelFallback(
        (model) => withOpenRouter(request, openRouterKey, model), openRouterVisionModel(), openRouterFallbackModel()
      );
    } catch (error) {
      if (!anthropicKey) throw error;
      console.warn('OpenRouter failed; trying Claude:', error instanceof Error ? error.message : error);
    }
  }
  return withModelFallback(
    (model) => withAnthropic(request, anthropicKey!, model), anthropicVisionModel(), anthropicFallbackModel()
  );
};

// Pull the first JSON object out of a model reply (tolerates ``` fences and chatter).
export const extractJsonObject = (text: string): unknown => {
  const cleaned = text.replace(/```(?:json)?/gi, '');
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('The AI reply did not contain JSON');
  return JSON.parse(cleaned.slice(start, end + 1));
};
