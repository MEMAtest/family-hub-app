import { NextRequest, NextResponse } from 'next/server';
import { aiService } from '@/services/aiService';
import { requireAuth } from '@/lib/auth-utils';
import { classifyIssues, normalizeIssueDraft, toYMD } from '@/utils/propertyIssueRules';
import type { PropertyIssueDraft } from '@/types/property.types';

export const runtime = 'nodejs';

const MAX_TEXT_LENGTH = 2000;
const MAX_ISSUES = 10;

const parseAiIssues = (raw: string, today: Date): PropertyIssueDraft[] => {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end <= start) return [];

  const parsed = JSON.parse(cleaned.slice(start, end + 1));
  const issues: unknown[] = Array.isArray(parsed?.issues) ? parsed.issues : [];

  return issues
    .slice(0, MAX_ISSUES)
    .map((issue) => {
      const sourceText = typeof (issue as any)?.sourceText === 'string' ? (issue as any).sourceText : '';
      return normalizeIssueDraft(issue, sourceText, today);
    });
};

export const POST = requireAuth(async (req: NextRequest) => {
  let text = '';
  try {
    const body = await req.json();
    text = typeof body?.text === 'string' ? body.text.trim() : '';
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!text) {
    return NextResponse.json({ error: 'Describe the issue first' }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: `Keep it under ${MAX_TEXT_LENGTH} characters` }, { status: 400 });
  }

  const today = new Date();
  const rulesResult = (reason: string) => NextResponse.json({
    issues: classifyIssues(text, today),
    source: 'rules',
    degraded: true,
    reason,
  });

  if (!process.env.ANTHROPIC_API_KEY && !process.env.OPENROUTER_API_KEY) {
    return rulesResult('No AI provider configured');
  }

  try {
    const raw = await aiService.enhancePropertyIssues(text, toYMD(today));
    const issues = parseAiIssues(raw, today);
    if (issues.length === 0) {
      return rulesResult('AI returned no usable issues');
    }
    // If the AI dropped the source text, keep the whole note so the original wording isn't lost.
    const withSource = issues.map((issue) => ({ ...issue, sourceText: issue.sourceText || text }));
    return NextResponse.json({ issues: withSource, source: 'ai' });
  } catch (error) {
    console.warn('Property issue AI enhancement failed; using rules:', error instanceof Error ? error.message : error);
    return rulesResult('AI unavailable');
  }
});
