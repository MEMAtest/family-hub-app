// One place for the AI model defaults. Dated model ids get retired (the old
// default, claude-sonnet-4-20250514, now returns 404), so prefer the env vars
// and keep these defaults on current models.

export const anthropicModel = () => process.env.ANTHROPIC_MODEL || 'claude-opus-5';
export const anthropicVisionModel = () => process.env.ANTHROPIC_VISION_MODEL || anthropicModel();

export const openRouterModel = () => process.env.OPENROUTER_MODEL || 'anthropic/claude-opus-5';
export const openRouterVisionModel = () => process.env.OPENROUTER_VISION_MODEL || openRouterModel();

// Opus 5's safety classifiers sometimes stop harmless requests part-way (a
// supermarket receipt was refused 6 times in 6 on 27 Sep 2026). A refused reply is
// retried once on this model, which read the same receipt 6 times in 6.
export const anthropicFallbackModel = () => process.env.ANTHROPIC_FALLBACK_MODEL || 'claude-opus-4-8';
export const openRouterFallbackModel = () => process.env.OPENROUTER_FALLBACK_MODEL || 'anthropic/claude-opus-4.8';

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

// A refused reply (a safety-classifier false positive) gets one go on the fallback model.
export const withRefusalFallback = async <T,>(call: (model: string) => Promise<T>, model: string, fallback: string): Promise<T> => {
  try {
    return await call(model);
  } catch (error) {
    if (!(error instanceof AIRefusalError) || fallback === model) throw error;
    console.warn(`${model} declined; retrying on ${fallback}`);
    return call(fallback);
  }
};
