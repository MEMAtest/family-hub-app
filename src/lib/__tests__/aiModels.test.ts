import { AIRefusalError, firstText, supportsEffort, withRefusalFallback } from '@/lib/aiModels';

test('effort is only sent to models that accept it', () => {
  expect(['claude-opus-5', 'anthropic/claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-8', 'anthropic/claude-opus-4.8', 'claude-fable-5-1'].every(supportsEffort)).toBe(true);
  expect(['claude-sonnet-4-20250514', 'claude-3-haiku-20240307', 'claude-haiku-4-5', 'openai/gpt-4o-mini'].some(supportsEffort)).toBe(false);
});

test('the text block is found even when thinking comes first', () => {
  expect(firstText([{ type: 'thinking' }, { type: 'text', text: '{"a":1}' }])).toBe('{"a":1}');
  expect(firstText([{ type: 'thinking' }])).toBeNull();
});

describe('withRefusalFallback', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

  test('a refusal gets one go on the fallback model', async () => {
    const call = jest.fn(async (model: string) => {
      if (model === 'main') throw new AIRefusalError(model);
      return `ok from ${model}`;
    });
    await expect(withRefusalFallback(call, 'main', 'backup')).resolves.toBe('ok from backup');
    expect(call.mock.calls.map(([m]) => m)).toEqual(['main', 'backup']);
  });

  test('other errors are not retried, and a refused fallback is not retried again', async () => {
    const boom = jest.fn(async () => { throw new Error('timeout'); });
    await expect(withRefusalFallback(boom, 'main', 'backup')).rejects.toThrow('timeout');
    expect(boom).toHaveBeenCalledTimes(1);
    const refuses = jest.fn(async (model: string) => { throw new AIRefusalError(model); });
    await expect(withRefusalFallback(refuses, 'main', 'backup')).rejects.toBeInstanceOf(AIRefusalError);
    expect(refuses).toHaveBeenCalledTimes(2);
  });
});
