// One place for the AI model defaults. Dated model ids get retired (the old
// default, claude-sonnet-4-20250514, now returns 404), so prefer the env vars.
//
// Cheap on purpose: a 28 Sep 2026 bake-off on the real Kitchen prompts (stock
// note, receipt, fridge photo; 3 runs each) scored gpt-6-luna 48/48 at ~$0.0005 a
// call and ~8s, GLM 5.3 Flash 48/48 at ~$0.0008 and ~16s, and Claude Opus 5 36/48
// at ~$0.03 (its filter refused 2 of 3 receipts). OpenRouter goes first; the
// Anthropic key is a backup on a cheap model.

export const openRouterModel = () => process.env.OPENROUTER_MODEL || 'openai/gpt-6-luna';
export const openRouterVisionModel = () => process.env.OPENROUTER_VISION_MODEL || openRouterModel();

export const anthropicModel = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';
export const anthropicVisionModel = () => process.env.ANTHROPIC_VISION_MODEL || anthropicModel();

// A failed reply (refused, cut off, provider error; not a timeout) gets one go
// on a second model from a different provider. Refusals are real: Opus 5's filter
// stopped a harmless supermarket receipt part-way 6 times in 6 on 27 Sep 2026.
export const openRouterFallbackModel = () => process.env.OPENROUTER_FALLBACK_MODEL || 'z-ai/glm-5.3-flash';
export const anthropicFallbackModel = () => process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-sonnet-5';

export class AIRefusalError extends Error {
  constructor(readonly model: string) {
    super(`${model} declined the request`);
  }
}

export type AIEffort = 'low' | 'medium' | 'high';

// Older models reject the effort setting with a 400, so only send it to ones that take it
// (an env var may still name an older model).
export const supportsEffort = (model: string) =>
  /opus-4[-.][5-9]|opus-5|sonnet-4[-.]6|sonnet-5|fable|mythos/.test(model);

// Current Claude models think before answering, and thinking counts towards
// max_tokens, so give each call room on top of the answer it asks for.
export const THINKING_HEADROOM_TOKENS = 2048;

// Claude replies can start with a thinking block, so never assume content[0] is the text.
export const firstText = (content: ReadonlyArray<{ type: string; text?: string }>): string | null => {
  const block = content.find((part) => part.type === 'text' && typeof part.text === 'string');
  return block?.text ?? null;
};

const isTimeout = (error: unknown) =>
  error instanceof Error && (error.name === 'AbortError' || /timed? ?out/i.test(error.message));

// One go on the fallback model if the first fails. Not after a timeout: two slow
// calls in a row would outlast the 60s function limit.
export const withModelFallback = async <T,>(call: (model: string) => Promise<T>, model: string, fallback: string): Promise<T> => {
  try {
    return await call(model);
  } catch (error) {
    if (isTimeout(error) || fallback === model) throw error;
    console.warn(`${model} failed (${error instanceof Error ? error.message : error}); retrying on ${fallback}`);
    return call(fallback);
  }
};
