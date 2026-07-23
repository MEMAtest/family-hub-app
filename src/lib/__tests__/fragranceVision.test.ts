import { extractFragranceVisionResult } from '../fragranceVision';
import { normalizeFragranceLabel, recognitionLabelFromFields, recognitionSearchTerms } from '../fragranceRecognition';

describe('fragrance vision results', () => {
  it('normalizes a structured OpenRouter bottle-label response and estimates usage', () => {
    const result = extractFragranceVisionResult({
      choices: [{
        message: {
          content: JSON.stringify({
            house: ' Kilian ',
            name: 'Smoking Hot',
            concentration: 'Eau de Parfum',
            extractedText: 'Kilian\nSmoking Hot',
            confidence: 0.812,
          }),
        },
      }],
      usage: { prompt_tokens: 10_000, completion_tokens: 200 },
    });

    expect(result).toEqual({
      house: 'Kilian',
      name: 'Smoking Hot',
      concentration: 'Eau de Parfum',
      extractedText: 'Kilian\nSmoking Hot',
      confidence: 0.81,
      usage: { inputTokens: 10_000, outputTokens: 200, estimatedUsd: 0.00052 },
    });
  });

  it('rejects an invalid model payload rather than guessing a fragrance', () => {
    expect(() => extractFragranceVisionResult({ choices: [{ message: { content: 'not json' } }] })).toThrow();
  });
});

describe('fragrance recognition labels', () => {
  it('keeps corrected household aliases stable across punctuation and accents', () => {
    expect(normalizeFragranceLabel("L'Eau d'Issey")).toBe('l eau d issey');
    expect(recognitionLabelFromFields({ house: 'Kilian', name: 'Smoking Hot', concentration: 'Eau de Parfum' }))
      .toBe('kilian smoking hot eau de parfum');
    expect(recognitionSearchTerms('Kilian', 'Smoking Hot', null)).toEqual(['kilian', 'smoking', 'hot']);
  });
});
