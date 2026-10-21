import { schoolMetadata } from '@/utils/schoolSources';

export type GrandirCorrelationIntake = {
  id: string; familyId: string; receivedAt: Date | string | null;
  text?: string | null; normalizedText?: string | null; metadata?: unknown;
};

const normalize = (text: string) => text.normalize('NFKC').toLowerCase()
  .replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/\s+/g, ' ').trim();

function londonDate(value: unknown) {
  if (!(typeof value === 'string' || value instanceof Date)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
    : null;
}

/** Pure, read-only correlation. Call with the full candidate set, not a paginated subset. */
export function matchGrandirPreviewToPost(
  preview: GrandirCorrelationIntake, posts: readonly GrandirCorrelationIntake[],
): { intakeId: string; postId: string } | null {
  if (!preview.familyId || schoolMetadata(schoolMetadata(preview.metadata).grandirPortal).postId) return null;
  const quotes = [...(preview.text || preview.normalizedText || '').matchAll(
    /posted\s+on\s+your\s+Grandir\s+UK\s+wall:\s*["\u201c]([^"\u201d]+)["\u201d]/gi,
  )];
  if (quotes.length !== 1) return null;
  const prefix = normalize(quotes[0][1]).replace(/(?:\.{3}|\u2026)\s*$/, '').trim();
  const previewMetadata = schoolMetadata(preview.metadata);
  const internalDate = previewMetadata.gmailInternalDate;
  const date = londonDate(typeof internalDate === 'string' && /^\d+$/.test(internalDate)
    ? new Date(Number(internalDate)) : previewMetadata.sourceDate || preview.receivedAt);
  if (prefix.length < 80 || !date) return null;
  const matches = new Map<string, { intakeId: string; postId: string }>();
  for (const post of posts) {
    const metadata = schoolMetadata(post.metadata);
    const portal = schoolMetadata(metadata.grandirPortal);
    if (post.familyId !== preview.familyId || post.id === preview.id ||
        typeof portal.postId !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(portal.postId) ||
        typeof portal.bodyHash !== 'string' || !portal.bodyHash ||
        typeof portal.childMemberId !== 'string' || !portal.childMemberId ||
        londonDate(metadata.sourceDate) !== date) continue;
    const body = normalize((post.text || post.normalizedText || '').replace(/^Grandir nursery:[^\n]*\n/, ''));
    if (body.startsWith(prefix)) matches.set(post.id, { intakeId: post.id, postId: portal.postId });
  }
  return matches.size === 1 ? [...matches.values()][0] : null;
}
