// AI review of supplier search results against one bathroom quote item.
//
// The job: read each candidate product's own title and description and say whether it is
// what the quote asks for. "Good" means (see tests/fixtures/sourcing-ai-golden.json and
// scripts/eval-sourcing-ai.ts):
//   - never calls a wrong product a match (wrong type, size, shape, glass, finish or model);
//   - agrees with hand-checked answers at least 90% of the time;
//   - gives a short reason quoting the evidence for every verdict.
// It uses a cheap Qwen model through OpenRouter, the provider the site already uses.

export type AiVerdict = 'match' | 'needs_parts' | 'part' | 'not_suitable';

export interface AiReview {
  verdict: AiVerdict;
  reason: string;
  missingParts: string[];
  model: string;
}

export interface ReviewRequirement {
  name: string;
  specification: string;
  size?: string;
  requiredComponents?: string[];
  constraints?: Record<string, number | string>;
}

export interface ReviewCandidate {
  id: string;
  name: string;
  description: string;
}

export const sourcingAiModel = () => process.env.SOURCING_AI_MODEL || 'qwen/qwen3.7-flash';

const VERDICTS: AiVerdict[] = ['match', 'needs_parts', 'part', 'not_suitable'];
const MAX_DESCRIPTION = 1200;

const SYSTEM_PROMPT = `You check bathroom products against one item from a fitter's quote.
For each candidate, decide from its own title and description only. Never assume facts that are not written.

Verdicts:
- "match": the same kind of item, the right size, and it includes every required part.
- "needs_parts": the right item and size, but one or more required parts are not included, sold separately, or not mentioned. List them in missingParts.
- "part": not the main item, but one of the required parts for it (for example the waste for a shower tray, the side panel for a shower door, valves for a towel rail, a basin for a vanity unit).
- "not_suitable": anything else.

It is not_suitable when any of these differ from the quote:
- kind of item or fitting type (a close-coupled or wall-hung toilet is not a back-to-wall toilet; a hinged or pivot door is not a sliding door; an enclosure pack is not a single door),
- a named model or range (a quote for a "Grove" toilet is not met by a "Gravo" or "Handel"),
- shape (offset quadrant is not rectangular; L-shaped is not B-shaped),
- size: a stated dimension more than 20mm away from the quote (a 1500mm bath is not 1700mm; a 1600mm rail is not 1000mm),
- glass thickness, or number of drawers versus doors when the quote states them,
- colour or finish when the quote states one (a black, brass or gunmetal rail is not chrome; a grey or wood unit is not white).
Left-hand and right-hand versions are both fine unless the quote names a hand.

Two rules that override the above:
- A missing, unmentioned or sold-separately required part never makes the main item not_suitable or "part"; that is needs_parts. (A vanity unit without its basin is needs_parts.) But a written difference from the list above is still not_suitable even if parts are also missing: a unit with doors when the quote asks for drawers is not_suitable.
- "Shipped separately" or "delivered separately" means the part is included, just packed apart.
- Something the description does not state is unknown, not a mismatch. Only reject for a difference that is written down; mention unknowns in the reason.

Reply with JSON only:
{"reviews":[{"id":"<candidate id>","verdict":"match|needs_parts|part|not_suitable","reason":"<max 20 words, quote the size or part evidence>","missingParts":["..."]}]}
Include every candidate exactly once.`;

function userPrompt(requirement: ReviewRequirement, candidates: ReviewCandidate[]) {
  const lines = [
    `Quote item: ${requirement.name}`,
    `What it is: ${requirement.specification}`,
    `Size: ${requirement.size ?? 'not stated'}`,
    `Required parts: ${requirement.requiredComponents?.length ? requirement.requiredComponents.join(', ') : 'none listed'}`,
  ];
  const finish = requirement.constraints?.finish;
  if (finish) lines.push(`Finish/colour required: ${finish}`);
  lines.push('', 'Candidates:');
  candidates.forEach((candidate) => {
    lines.push(`- id: ${candidate.id}`, `  title: ${candidate.name}`, `  description: ${candidate.description.slice(0, MAX_DESCRIPTION)}`);
  });
  return lines.join('\n');
}

const pairsIn = (text: string) => Array.from(text.matchAll(/(\d{3,4})\s*(?:mm)?\s*[x×]\s*(\d{3,4})\s*mm?/gi), (m) => [Number(m[1]), Number(m[2])].sort((a, b) => b - a));

/**
 * Safety net: when the quote size and the product title both state two dimensions and they
 * clearly disagree, the product cannot be the main item, whatever the model said.
 */
export function applySizeGuard(requirement: ReviewRequirement, candidate: ReviewCandidate, review: AiReview): AiReview {
  if (review.verdict !== 'match' && review.verdict !== 'needs_parts') return review;
  const wanted = pairsIn(requirement.size ?? '')[0];
  const offered = pairsIn(candidate.name)[0];
  if (!wanted || !offered) return review;
  const off = Math.max(Math.abs(wanted[0] - offered[0]), Math.abs(wanted[1] - offered[1]));
  if (off <= 20) return review;
  return { ...review, verdict: 'not_suitable', reason: `${offered[0]} × ${offered[1]}mm does not match the quoted ${wanted[0]} × ${wanted[1]}mm.`, missingParts: [] };
}

export function parseReviews(raw: string, candidates: ReviewCandidate[], model: string): Map<string, AiReview> {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  const reviews = new Map<string, AiReview>();
  if (start === -1 || end <= start) return reviews;
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return reviews;
  }
  const list = Array.isArray((parsed as { reviews?: unknown })?.reviews) ? (parsed as { reviews: unknown[] }).reviews : [];
  const ids = new Set(candidates.map((candidate) => candidate.id));
  list.forEach((item) => {
    const entry = item as { id?: unknown; verdict?: unknown; reason?: unknown; missingParts?: unknown };
    if (typeof entry.id !== 'string' || !ids.has(entry.id) || reviews.has(entry.id)) return;
    if (!VERDICTS.includes(entry.verdict as AiVerdict)) return;
    reviews.set(entry.id, {
      verdict: entry.verdict as AiVerdict,
      reason: typeof entry.reason === 'string' ? entry.reason.trim().slice(0, 200) : '',
      missingParts: Array.isArray(entry.missingParts) ? entry.missingParts.filter((part): part is string => typeof part === 'string').slice(0, 6) : [],
      model,
    });
  });
  return reviews;
}

export async function reviewCandidates(
  requirement: ReviewRequirement,
  candidates: ReviewCandidate[],
  options: { apiKey?: string; model?: string; fetchImpl?: typeof fetch; timeoutMs?: number; onUsage?: (usage: { cost?: number; total_tokens?: number }) => void } = {},
): Promise<Map<string, AiReview>> {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error('No OpenRouter key configured');
  if (candidates.length === 0) return new Map();
  const model = options.model ?? sourcingAiModel();
  const body = JSON.stringify({
    model,
    temperature: 0,
    max_tokens: 2500,
    // Some Qwen models think before answering and can spend the whole budget doing it; this is a
    // reading task, so ask for the answer directly.
    reasoning: { enabled: false },
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt(requirement, candidates) },
    ],
  });
  let response: Response | null = null;
  // Cheap shared models are often rate limited for a moment; wait and try again.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    response = await (options.fetchImpl ?? fetch)('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://family-hub-app.vercel.app',
        'X-Title': 'Family Hub App',
      },
      body,
      signal: AbortSignal.timeout(options.timeoutMs ?? 30000),
    });
    if (response.status !== 429 && response.status < 500) break;
  }
  if (!response?.ok) throw new Error(`OpenRouter error ${response?.status}`);
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { cost?: number; total_tokens?: number } };
  if (data.usage) options.onUsage?.(data.usage);
  const reviews = parseReviews(data.choices?.[0]?.message?.content ?? '', candidates, model);
  candidates.forEach((candidate) => {
    const review = reviews.get(candidate.id);
    if (review) reviews.set(candidate.id, applySizeGuard(requirement, candidate, review));
  });
  return reviews;
}
