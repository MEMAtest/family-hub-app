/** @jest-environment node */
import { applySizeGuard, parseReviews, reviewCandidates, type AiReview } from '../aiReview';

const tray = { name: 'Shower tray', specification: 'Rectangular tray with 90mm waste', size: '1000 × 800mm', requiredComponents: ['shower-tray', 'waste'] };
const candidates = [
  { id: 'rect', name: 'Fairford 1000 X 800mm Rectangular Shower Tray', description: 'Waste sold separately.' },
  { id: 'small', name: 'Fairford 900 x 800mm Rectangular Shower Tray', description: '' },
];
const review = (verdict: AiReview['verdict']): AiReview => ({ verdict, reason: 'r', missingParts: [], model: 'm' });

describe('parseReviews', () => {
  it('reads fenced JSON and keeps only known ids, valid verdicts and the first entry per id', () => {
    const raw = '```json\n{"reviews":[{"id":"rect","verdict":"needs_parts","reason":"no waste","missingParts":["waste"]},{"id":"rect","verdict":"match","reason":"dup"},{"id":"ghost","verdict":"match","reason":"x"},{"id":"small","verdict":"maybe","reason":"x"}]}\n```';
    const reviews = parseReviews(raw, candidates, 'qwen');
    expect(reviews.size).toBe(1);
    expect(reviews.get('rect')).toEqual({ verdict: 'needs_parts', reason: 'no waste', missingParts: ['waste'], model: 'qwen' });
  });

  it('returns nothing for a reply that is not JSON', () => {
    expect(parseReviews('Sorry, I cannot help.', candidates, 'qwen').size).toBe(0);
    expect(parseReviews('{"reviews": [', candidates, 'qwen').size).toBe(0);
  });
});

describe('applySizeGuard', () => {
  it('rejects a product whose title size clearly differs from the quote, whatever the model said', () => {
    const guarded = applySizeGuard(tray, candidates[1], review('match'));
    expect(guarded.verdict).toBe('not_suitable');
    expect(guarded.reason).toMatch(/900 × 800mm does not match the quoted 1000 × 800mm/);
  });

  it('leaves matching sizes, parts and already-rejected products alone', () => {
    expect(applySizeGuard(tray, candidates[0], review('needs_parts')).verdict).toBe('needs_parts');
    expect(applySizeGuard(tray, candidates[1], review('part')).verdict).toBe('part');
    expect(applySizeGuard({ ...tray, size: '1000mm' }, candidates[1], review('match')).verdict).toBe('match');
  });
});

describe('reviewCandidates', () => {
  const ok = (content: string) => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content } }], usage: { cost: 0.0001 } }) });
  const reply = JSON.stringify({ reviews: [{ id: 'rect', verdict: 'needs_parts', reason: 'waste separate', missingParts: ['waste'] }, { id: 'small', verdict: 'match', reason: 'tray' }] });

  it('retries when the model is rate limited, turns thinking off, and applies the size guard', async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({}) })
      .mockResolvedValueOnce(ok(reply));
    const onUsage = jest.fn();
    const reviews = await reviewCandidates(tray, candidates, { apiKey: 'k', model: 'qwen/qwen3.7-flash', fetchImpl: fetchImpl as unknown as typeof fetch, onUsage });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const body = JSON.parse(fetchImpl.mock.calls[1][1].body);
    expect(body.reasoning).toEqual({ enabled: false });
    expect(body.model).toBe('qwen/qwen3.7-flash');
    expect(body.messages[1].content).toContain('Size: 1000 × 800mm');
    expect(reviews.get('rect')?.verdict).toBe('needs_parts');
    expect(reviews.get('small')?.verdict).toBe('not_suitable');
    expect(onUsage).toHaveBeenCalledWith({ cost: 0.0001 });
  }, 10000);

  it('gives up after three failed attempts and needs a key', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 503, json: async () => ({}) });
    await expect(reviewCandidates(tray, candidates, { apiKey: 'k', fetchImpl: fetchImpl as unknown as typeof fetch })).rejects.toThrow('OpenRouter error 503');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    await expect(reviewCandidates(tray, candidates, { apiKey: '' })).rejects.toThrow('No OpenRouter key');
  }, 15000);
});
