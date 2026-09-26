import type { PropertyIssueDraft } from '@/types/property.types';
import { classifyIssues } from '@/utils/propertyIssueRules';

export interface IssueEnhancementResult {
  drafts: PropertyIssueDraft[];
  source: 'ai' | 'rules';
}

// Ask the AI to structure a quick note. Logging an issue must never fail, so any
// problem (offline, signed out, AI down) falls back to the built-in rules.
export const enhanceIssueText = async (text: string): Promise<IssueEnhancementResult> => {
  try {
    const response = await fetch('/api/ai/property-issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!response.ok) throw new Error(`Enhance failed with ${response.status}`);
    const data = await response.json();
    if (Array.isArray(data?.issues) && data.issues.length > 0) {
      return { drafts: data.issues as PropertyIssueDraft[], source: data.source === 'ai' ? 'ai' : 'rules' };
    }
  } catch (error) {
    console.warn('Issue enhancement unavailable, using built-in rules:', error);
  }
  return { drafts: classifyIssues(text), source: 'rules' };
};
