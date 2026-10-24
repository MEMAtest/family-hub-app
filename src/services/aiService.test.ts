/** @jest-environment node */

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

  it('keeps spending suggestions tied to supplied fact IDs and rejects new numerical claims', async () => {
    const service = new AIService();
    const chat = jest.spyOn(service as any, 'chat');
    const facts = [{ id: 'review', title: 'Review payments', evidence: '£15.00 needs review.', action: 'Check the purpose.' }];
    chat.mockResolvedValue('{"actions":[{"factId":"review","action":"Check what this payment covered before changing a target."}]}');
    expect(await service.suggestSpendingActions(facts)).toHaveLength(1);
    chat.mockResolvedValue('{"actions":[{"factId":"invented","action":"Cancel an unknown subscription."}]}');
    await expect(service.suggestSpendingActions(facts)).rejects.toThrow('Unsupported spending suggestion');
    chat.mockResolvedValue('{"actions":[{"factId":"review","action":"Save £100 per month."}]}');
    await expect(service.suggestSpendingActions(facts)).rejects.toThrow('Unsupported spending suggestion');
  });

  it('refines Brain drafts as one structured pass with task-specific titles and no invented details', async () => {
    const service = new AIService();
    const chat = jest.spyOn(service as any, 'chat').mockResolvedValue(JSON.stringify({ title: 'Arrange a boiler quote', content: 'Ask for a boiler quote of £150.' }));
    expect(await service.refineBrainWriting({ text: 'ask boiler quote £150', nodeType: 'task' })).toEqual({ title: 'Arrange a boiler quote', content: 'Ask for a boiler quote of £150.' });
    expect(chat.mock.calls[0][0]).toContain('not merely spelling');
    expect(chat.mock.calls[0][0]).toContain('content must be self-contained');
    expect(chat.mock.calls[0][0]).toContain('Never invent');
    expect(chat.mock.calls[0][0]).toContain('For tasks use an action-led title');
    expect(JSON.parse(String(chat.mock.calls[0][1])).type).toBe('task');
    chat.mockResolvedValue(JSON.stringify({ title: 'Boiler quote', content: 'Ask for a boiler quote of £200.' }));
    await expect(service.refineBrainWriting({ text: 'ask boiler quote £150', nodeType: 'task' })).rejects.toThrow('protected details');
  });

  it('can analyse an empty or single-category plan without claiming planned figures are actual spending', async () => {
    const service = new AIService();
    const chat = jest.spyOn(service as any, 'chat').mockResolvedValue('Check your saved plan.');
    await service.analyzeBudgetSpending({ familySize: 4, location: 'UK', totalIncome: 0, totalExpenses: 0, expensesByCategory: [], monthName: 'October' });
    expect(chat.mock.calls[0][0]).toContain('not actual bank activity');
    expect(chat.mock.calls[0][1]).toContain('No saved planned categories.');
    await service.analyzeBudgetSpending({ familySize: 4, location: 'UK', totalIncome: 0, totalExpenses: 10, expensesByCategory: [{ category: 'Groceries', amount: 10 }], monthName: 'October' });
    expect(chat.mock.calls[1][1]).toContain('Groceries: £10.00');
    expect(chat.mock.calls[1][1]).not.toContain('undefined');
  });
});
