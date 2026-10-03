import { AIService } from '@/services/aiService';

describe('AIService calendar summaries', () => {
  const originalAnthropicKey = process.env.ANTHROPIC_API_KEY;
  const originalOpenRouterKey = process.env.OPENROUTER_API_KEY;
  const originalFetch = global.fetch;

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
    if (originalFetch) Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: originalFetch });
    else Reflect.deleteProperty(global, 'fetch');
    if (originalAnthropicKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = originalAnthropicKey;
    if (originalOpenRouterKey === undefined) delete process.env.OPENROUTER_API_KEY;
    else process.env.OPENROUTER_API_KEY = originalOpenRouterKey;
  });

  it('gives the model a London-local date so past events are not described as upcoming', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-30T10:00:00.000Z'));
    process.env.ANTHROPIC_API_KEY = '';
    process.env.OPENROUTER_API_KEY = 'test-key';
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ choices: [{ message: { content: 'The workshop took place at school.' } }] }),
    } as Response);
    Object.defineProperty(global, 'fetch', { configurable: true, writable: true, value: fetchMock });
    const service = new AIService();

    const summary = await service.summarizeCalendarEvent({
      title: 'Parent workshop',
      date: '2026-09-23',
      personName: 'Ade',
      location: 'School hall',
    });

    const request = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(request.messages[0].content).toContain('Today is 30 September 2026 in Europe/London.');
    expect(request.messages[0].content).toContain('Never describe a past event as upcoming.');
    expect(summary).toBe('The workshop took place at school.');
  });
});
