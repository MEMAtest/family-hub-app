/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';

const enhancePropertyIssues = jest.fn();

jest.mock('@/lib/auth-utils', () => ({
  requireAuth: (handler: any) => (req: any, ctx: any) => handler(req, ctx, { id: 'user-1', familyId: 'family-1' }),
}));

jest.mock('@/services/aiService', () => ({
  aiService: { enhancePropertyIssues: (...args: unknown[]) => enhancePropertyIssues(...args) },
}));

const post = async (body: unknown) => {
  const { POST } = await import('../route');
  const req = new NextRequest('http://localhost/api/ai/property-issues', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
  const res = await POST(req, { params: Promise.resolve({}) } as any);
  return { status: res.status, body: await res.json() };
};

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  process.env = { ...ORIGINAL_ENV, ANTHROPIC_API_KEY: 'test-key' };
});

afterAll(() => {
  process.env = ORIGINAL_ENV;
});

describe('POST /api/ai/property-issues', () => {
  test('returns validated AI issues', async () => {
    enhancePropertyIssues.mockResolvedValue('```json\n' + JSON.stringify({
      issues: [
        { title: 'Clear gutters', area: 'roof_gutters', urgency: 'routine', trade: 'Gutter cleaner', diy: false, costRange: { min: 70, max: 120 }, suggestedDate: '2099-03-03', recurrence: { interval: 1, unit: 'year' }, steps: ['Book it'], sourceText: 'gutters' },
        { title: 'Window clean', area: 'not-a-real-area', urgency: 'whenever', trade: 'Window cleaner', diy: false, steps: [], sourceText: 'clean windows' },
      ],
    }) + '\n```');

    const { status, body } = await post({ text: 'gutters and clean windows' });

    expect(status).toBe(200);
    expect(body.source).toBe('ai');
    expect(body.issues).toHaveLength(2);
    expect(body.issues[0]).toMatchObject({ title: 'Clear gutters', costRange: { min: 70, max: 120, currency: 'GBP' } });
    // Invalid enum values are replaced by the rules' view of the note
    expect(body.issues[1].area).toBe('cleaning');
    expect(['urgent', 'soon', 'routine', 'someday']).toContain(body.issues[1].urgency);
    expect(body.issues[1].steps.length).toBeGreaterThan(0);
  });

  test('falls back to rules when the AI call fails', async () => {
    enhancePropertyIssues.mockRejectedValue(new Error('overloaded'));
    const { status, body } = await post({ text: 'boiler making a banging noise' });
    expect(status).toBe(200);
    expect(body).toMatchObject({ source: 'rules', degraded: true });
    expect(body.issues[0].area).toBe('heating');
  });

  test('falls back to rules when the AI returns junk', async () => {
    enhancePropertyIssues.mockResolvedValue('Sorry, I cannot help with that.');
    const { body } = await post({ text: 'fence panel loose' });
    expect(body.source).toBe('rules');
    expect(body.issues).toHaveLength(1);
  });

  test('does not call the AI when no key is configured', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    const { body } = await post({ text: 'clean windows' });
    expect(enhancePropertyIssues).not.toHaveBeenCalled();
    expect(body.source).toBe('rules');
  });

  test('rejects empty and oversized notes', async () => {
    expect((await post({ text: '   ' })).status).toBe(400);
    expect((await post({ text: 'x'.repeat(2001) })).status).toBe(400);
    expect(enhancePropertyIssues).not.toHaveBeenCalled();
  });
});
