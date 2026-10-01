import { AIRefusalError, firstText, supportsEffort, withModelFallback } from '@/lib/aiModels';

test('defaults are the cheap models, OpenRouter first', () => {
  const { openRouterModel, openRouterFallbackModel, anthropicModel } = jest.requireActual('@/lib/aiModels');
  expect([openRouterModel(), openRouterFallbackModel(), anthropicModel()]).toEqual(['openai/gpt-6-luna', 'z-ai/glm-5.3-flash', 'claude-haiku-4-5']);
});

test('effort is only sent to models that accept it', () => {
  expect(['claude-opus-5', 'anthropic/claude-opus-5', 'claude-sonnet-5', 'claude-opus-4-8', 'anthropic/claude-opus-4.8', 'claude-fable-5-1'].every(supportsEffort)).toBe(true);
  expect(['claude-sonnet-4-20250514', 'claude-3-haiku-20240307', 'claude-haiku-4-5', 'openai/gpt-4o-mini'].some(supportsEffort)).toBe(false);
});

test('the text block is found even when thinking comes first', () => {
  expect(firstText([{ type: 'thinking' }, { type: 'text', text: '{"a":1}' }])).toBe('{"a":1}');
  expect(firstText([{ type: 'thinking' }])).toBeNull();
});

describe('withModelFallback', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

  test('a refusal gets one go on the fallback model', async () => {
    const call = jest.fn(async (model: string) => {
      if (model === 'main') throw new AIRefusalError(model);
      return `ok from ${model}`;
    });
    await expect(withModelFallback(call, 'main', 'backup')).resolves.toBe('ok from backup');
    expect(call.mock.calls.map(([m]) => m)).toEqual(['main', 'backup']);
  });

  test('a provider error also moves to the fallback', async () => {
    const call = jest.fn(async (model: string) => {
      if (model === 'main') throw new Error('OpenRouter returned 502');
      return 'ok';
    });
    await expect(withModelFallback(call, 'main', 'backup')).resolves.toBe('ok');
  });

  test('a timeout is not retried (two slow calls would outlast the function), and the fallback runs once', async () => {
    const slow = jest.fn(async () => { throw new Error('AI request timed out'); });
    await expect(withModelFallback(slow, 'main', 'backup')).rejects.toThrow('timed out');
    expect(slow).toHaveBeenCalledTimes(1);
    const aborted = jest.fn(async () => { throw Object.assign(new Error('aborted'), { name: 'AbortError' }); });
    await expect(withModelFallback(aborted, 'main', 'backup')).rejects.toThrow('aborted');
    expect(aborted).toHaveBeenCalledTimes(1);
    const refuses = jest.fn(async (model: string) => { throw new AIRefusalError(model); });
    await expect(withModelFallback(refuses, 'main', 'backup')).rejects.toBeInstanceOf(AIRefusalError);
    expect(refuses).toHaveBeenCalledTimes(2);
  });
});
